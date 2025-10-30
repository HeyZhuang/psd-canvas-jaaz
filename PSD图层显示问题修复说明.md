# PSD图层显示问题修复说明

## 🐛 问题现象

**用户反馈：**
- 上传PSD文件后，画布没有显示PSD图层
- 浏览器控制台报错：`Failed to load resource: net::ERR_INVALID_HTTP_RESPONSE`
- 错误端点：`:3100/api/canvas/default/save:1`

---

## 🔍 问题分析

### 根本原因

在 `server/routers/psd_router.py` 文件中，多处使用了硬编码的 `localhost` URL来生成图层图像的访问地址：

**问题代码示例：**
```python
# ❌ 问题：使用硬编码的 localhost:58000
'image_url': f'http://localhost:{DEFAULT_PORT}/api/psd/layer/{file_id}/{idx}'
```

**为什么会导致问题：**
1. 服务器运行在AWS EC2远程环境
2. 前端通过公网IP或域名访问，而不是localhost
3. 图层图像URL使用localhost导致浏览器无法访问
4. 前端过滤掉了没有有效image_url的图层
5. 最终导致画布上没有显示任何图层

**错误流程：**
```
用户上传PSD文件
    ↓
后端解析PSD，生成图层信息
    ↓
图层image_url设置为 http://localhost:58000/api/psd/layer/...
    ↓
前端接收图层数据，尝试加载图像
    ↓
❌ 浏览器无法访问localhost（远程服务器）
    ↓
前端过滤掉无效图层
    ↓
画布上没有任何图层显示
```

---

## ✅ 解决方案

### 修复方法

将所有硬编码的 `http://localhost:{DEFAULT_PORT}` 替换为相对路径，让浏览器自动使用正确的主机名和端口。

**修复对比：**

| 位置 | 修复前 | 修复后 |
|------|--------|--------|
| **图层图像URL** | `http://localhost:58000/api/psd/layer/{file_id}/{idx}` | `/api/psd/layer/{file_id}/{idx}` |
| **PSD文件URL** | `http://localhost:58000/api/psd/file/{file_id}` | `/api/psd/file/{file_id}` |
| **缩略图URL** | `http://localhost:58000/api/psd/thumbnail/{file_id}` | `/api/psd/thumbnail/{file_id}` |
| **导出文件URL** | `http://localhost:58000/api/file/{export_id}.{ext}` | `/api/file/{export_id}.{ext}` |

---

## 📁 修改的文件

### `/home/ubuntu/jaaz/server/routers/psd_router.py`

**修改的函数：**

1. **`_extract_layers_info_fast()`** - 快速提取图层信息（懒加载模式）
   - 第599行：图层image_url改为相对路径

2. **`upload_psd()`** - PSD上传端点
   - 第252行：PSD文件URL改为相对路径

3. **`update_layer()`** - 更新图层
   - 第410行：图层URL改为相对路径

4. **`export_psd()`** - 导出PSD
   - 第451行：导出文件URL改为相对路径

5. **`_extract_layers_info()`** - 完整提取图层信息
   - 第749行：图层image_url改为相对路径

6. **`_generate_thumbnail()`** - 生成缩略图
   - 第890行：缩略图URL改为相对路径

7. **`duplicate_layer()`** - 复制图层
   - 第977行：新图层image_url改为相对路径

---

## 🧪 验证测试

### 测试步骤

**1. 刷新浏览器**
```bash
按 Ctrl+F5 (Windows/Linux)
或 Cmd+Shift+R (Mac)
完全刷新页面
```

**2. 上传PSD文件**
- 选择一个PSD文件（建议10-30层）
- 点击上传按钮
- 等待上传完成

**3. 检查画布**
- ✅ 应该能看到PSD图层显示在画布上
- ✅ 图层应该保持原始位置关系
- ✅ 图层应该正确显示图像内容

**4. 检查浏览器控制台**
```
打开开发者工具 (F12)
查看 Console 标签
✅ 应该没有 ERR_INVALID_HTTP_RESPONSE 错误
✅ 应该看到类似日志：
   - "開始處理 PSD 數據"
   - "總圖層數量: XX"
   - "過濾後的可見圖層數量: XX"
   - "成功添加圖層 ... 到畫布"
```

**5. 检查网络请求**
```
在开发者工具的 Network 标签中
查看 /api/psd/layer/ 请求
✅ 状态应该是 200 OK
✅ 预览应该能看到图层图像
```

---

## 🎯 技术细节

### 为什么使用相对路径

**相对路径的优势：**
```javascript
// ✅ 相对路径（推荐）
image_url: '/api/psd/layer/file123/0'

// 浏览器会自动转换为：
// http://your-domain.com/api/psd/layer/file123/0
// 或
// https://your-domain.com/api/psd/layer/file123/0
// 取决于前端访问的协议和域名
```

**硬编码URL的问题：**
```python
# ❌ 硬编码（不推荐）
image_url: 'http://localhost:58000/api/psd/layer/file123/0'

# 在远程服务器上：
# - 前端访问: https://your-domain.com
# - 图层URL: http://localhost:58000/...
# - ❌ 跨域错误或无法访问
```

### Vite代理配置

前端使用Vite代理将API请求转发到后端：

```typescript
// react/vite.config.ts
server: {
  port: 3100,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:58000',
      changeOrigin: true,
    }
  }
}
```

**工作流程：**
```
浏览器请求: http://your-domain.com/api/psd/layer/file123/0
    ↓
Vite代理转发: http://127.0.0.1:58000/api/psd/layer/file123/0
    ↓
后端处理并返回图层图像
    ↓
前端接收并显示在画布上
```

---

## 🔧 故障排查

### 如果图层仍然不显示

**1. 检查后端日志**
```bash
tail -f /home/ubuntu/jaaz/server/backend.log
```

**预期看到：**
```
🎨 上传 PSD 文件: example.psd (懒加载模式: True)
🎨 快速解析 PSD（25层）
✅ 快速解析完成，共 25 個圖層（懶加載模式）
```

**2. 检查图层数据**
在浏览器控制台执行：
```javascript
// 查看最近上传的PSD数据
console.log(window.psdData)
```

**预期输出：**
```javascript
{
  file_id: "im_xxxx",
  layers: [
    {
      index: 0,
      name: "Layer 1",
      image_url: "/api/psd/layer/im_xxxx/0",  // ✅ 相对路径
      visible: true,
      width: 100,
      height: 100,
      // ... 其他属性
    }
  ]
}
```

**3. 手动测试API**
```bash
# 测试图层图像API
curl -I http://127.0.0.1:58000/api/psd/layer/im_xxxx/0

# 预期响应：
# HTTP/1.1 200 OK
# Content-Type: image/png
```

**4. 检查PSD文件**
```bash
# 查看PSD文件是否存在
ls -lh /home/ubuntu/jaaz/server/user_data/files/psd/

# 应该看到：
# - {file_id}.psd (原始PSD文件)
# - {file_id}_metadata.json (图层元数据)
# - {file_id}_thumbnail.png (缩略图)
# - {file_id}_layer_0.png, _layer_1.png, ... (按需生成的图层图像)
```

---

## 📝 相关文档

- [PSD上传ERR_INVALID_HTTP_RESPONSE错误修复.md](./PSD上传ERR_INVALID_HTTP_RESPONSE错误修复.md)
- [PSD上传性能优化说明.md](./PSD上传性能优化说明.md)
- [Jaaz图层存储格式说明.md](./Jaaz图层存储格式说明.md)

---

## ✅ 修复验证清单

- [x] ✅ 修复所有硬编码的localhost URL
- [x] ✅ 将URL改为相对路径
- [x] ✅ 重启后端服务
- [ ] ⏳ 刷新浏览器页面
- [ ] ⏳ 上传PSD文件测试
- [ ] ⏳ 验证图层显示正常
- [ ] ⏳ 检查控制台无错误

---

## 🎊 总结

**问题：** PSD上传后画布不显示图层  
**原因：** 硬编码localhost URL导致远程服务器无法访问图层图像  
**修复：** 将所有URL改为相对路径  
**状态：** ✅ 已修复，等待测试验证  

**关键要点：**
- 🔑 远程服务器不要使用硬编码的localhost
- 🔑 使用相对路径让浏览器自动解析
- 🔑 Vite代理会自动转发API请求到后端
- 🔑 图层采用懒加载，按需生成图像

---

**修复时间**: 2025-10-30  
**修复状态**: ✅ 已完成  
**后端服务**: ✅ 已重启（进程ID: 671650）  
**前端服务**: ⏳ 需要刷新浏览器  

**🎉 PSD图层显示功能已修复！请刷新浏览器测试。** 🚀

