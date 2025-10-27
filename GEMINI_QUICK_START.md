# 🚀 Gemini API 快速开始指南

## ⚡ 5分钟快速配置

### 第1步: 获取API密钥 (2分钟)

1. 访问 **https://aistudio.google.com/**
2. 使用Google账户登录
3. 点击 **"Get API Key"** 按钮
4. 点击 **"Create API Key"**
5. 复制生成的密钥 (以 `AIza` 开头)

### 第2步: 运行配置脚本 (1分钟)

```bash
# Windows PowerShell
cd d:\project-three\jaaz-psd-main\jaaz-psd-main
python setup_gemini_key.py
```

**按照提示操作**:
1. 粘贴您刚才复制的API密钥
2. 脚本会自动保存到 `config.env`
3. 选择 `y` 立即测试配置

### 第3步: 验证配置 (1分钟)

如果测试通过，您会看到：

```
🎉 所有测试通过！Gemini API配置正确。
```

如果测试失败，运行诊断：

```bash
python test_gemini_api.py
```

### 第4步: 启动服务 (1分钟)

**终端1 - 启动后端**:
```bash
cd server
python main.py
```

**终端2 - 启动前端**:
```bash
cd react
npm run dev
```

### 第5步: 使用PSD智能缩放

1. 浏览器打开 http://localhost:3000
2. 点击左侧 **"智能缩放"** 菜单
3. 上传PSD文件
4. 设置目标尺寸
5. 点击 **"开始智能缩放"**
6. 等待AI处理完成
7. 下载结果

---

## ✅ 配置验证清单

在使用功能前，请确认：

- [ ] ✅ 已安装Python 3.12+
- [ ] ✅ 已安装所有依赖 (`pip install -r server/requirements.txt`)
- [ ] ✅ 已获取Gemini API密钥
- [ ] ✅ 已配置密钥到 `config.env` 或环境变量
- [ ] ✅ 运行 `python test_gemini_api.py` 测试通过
- [ ] ✅ 后端服务启动成功
- [ ] ✅ 前端服务启动成功

---

## 🔧 三种配置方式

### 方式1: 使用配置脚本（最简单）

```bash
python setup_gemini_key.py
```

### 方式2: 手动编辑config.env

1. 打开 `config.env` 文件
2. 修改这一行：
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. 保存文件

### 方式3: 设置环境变量

**Windows PowerShell**:
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

**Windows CMD**:
```cmd
set GEMINI_API_KEY=your_api_key_here
```

---

## 📊 API调用工作流程

```
用户上传PSD文件
    ↓
提取图层信息 (psd-tools)
    ↓
生成检测框图像
    ↓
调用Gemini 2.5 Pro API ←─ 您的API密钥
    ↓
AI分析并返回新位置
    ↓
重建PSD并渲染
    ↓
返回缩放后的图像
```

---

## ⚠️ 常见问题速查

### ❌ "API密钥未配置"

**解决**:
```bash
# 运行配置脚本
python setup_gemini_key.py
```

### ❌ "No module named 'google.genai'"

**解决**:
```bash
pip install google-genai --upgrade
```

### ❌ "403 Forbidden" 或 "401 Unauthorized"

**原因**: API密钥无效

**解决**:
1. 访问 https://aistudio.google.com/
2. 重新生成API密钥
3. 重新配置

### ❌ "429 Too Many Requests"

**原因**: API配额用完

**解决**:
1. 等待一段时间
2. 检查API配额
3. 考虑升级套餐

### ❌ PSD处理失败

**检查**:
- PSD文件是否 < 50MB
- 图层数量是否 < 100
- 文件是否损坏

---

## 📁 关键文件说明

| 文件 | 用途 |
|------|------|
| `config.env` | **存储API密钥**（需要配置） |
| `setup_gemini_key.py` | **配置工具**（运行此脚本配置密钥） |
| `test_gemini_api.py` | **测试工具**（验证配置是否正确） |
| `server/services/gemini_psd_resize_service.py` | Gemini服务核心代码 |
| `server/routers/psd_resize_router.py` | API路由 |
| `server/utils/psd_layer_info.py` | PSD解析工具 |
| `server/utils/resize_psd.py` | PSD重建工具 |

---

## 🎯 使用技巧

### 💡 首次使用建议

1. **先预览后执行**: 使用"预览"功能查看AI的调整方案
2. **小文件测试**: 先用小的PSD文件测试功能
3. **合理设置尺寸**: 目标尺寸建议在1000x1000像素以内

### 💡 最佳实践

- ✅ PSD文件 < 50MB
- ✅ 图层数量 < 100
- ✅ 目标尺寸合理（不要过大或过小）
- ✅ 使用预览功能避免浪费配额
- ✅ 定期检查API配额使用情况

### 💡 AI缩放策略

Gemini会按以下优先级处理图层：

1. **文字图层** - 最高优先级，确保可读性
2. **产品图像** - 保持完整性
3. **背景图层** - 自适应调整
4. **装饰元素** - 保持视觉平衡

---

## 📚 更多文档

- 📖 [完整使用指南](PSD_AUTO_RESIZE_GUIDE.md)
- 🔧 [故障排查指南](GEMINI_API_TROUBLESHOOTING.md)
- 📝 [修复总结](GEMINI_FIX_SUMMARY.md)
- 💻 [技术架构](resize.md)

---

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**: 检查终端输出的错误信息
2. **运行测试**: `python test_gemini_api.py`
3. **查看文档**: [GEMINI_API_TROUBLESHOOTING.md](GEMINI_API_TROUBLESHOOTING.md)
4. **检查配置**: 确认API密钥正确配置

---

## 🎉 开始使用

现在您已经了解了所有必要信息，开始使用PSD智能缩放功能吧！

```bash
# 1. 配置API密钥
python setup_gemini_key.py

# 2. 启动后端
cd server && python main.py

# 3. 启动前端（新终端）
cd react && npm run dev

# 4. 在浏览器中使用功能
# http://localhost:3000
```

**祝您使用愉快！** 🚀
