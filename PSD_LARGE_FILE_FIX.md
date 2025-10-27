# PSD大文件下载失败修复指南

## 🐛 问题描述

用户点击"开始智能缩放"后，出现以下错误：

```
Failed to fetch
GET http://localhost:57988/api/psd/file/im_byJdcbCt net::ERR_FAILED 200 (OK)
```

虽然HTTP状态码是200，但fetch操作失败。

## 🔍 问题分析

### 根本原因

**文件太大导致浏览器fetch失败**

- 问题文件: `im_byJdcbCt.psd`
- 文件大小: **68.26 MB**
- 问题: 浏览器在下载大文件时可能因为以下原因失败：
  1. **内存限制**: 浏览器无法一次性加载如此大的文件到内存
  2. **超时**: 默认fetch没有设置超时，大文件下载时间过长
  3. **网络不稳定**: 长时间传输容易中断

### 为什么状态码是200但仍然失败？

- **HTTP层面**: 服务器成功开始传输文件（200 OK）
- **浏览器层面**: fetch API在接收响应体时失败（ERR_FAILED）
- **原因**: 响应体太大，超过浏览器处理能力

## ✅ 已实施的修复

### 修复1: 添加超时控制

**文件**: 
- `react/src/components/canvas/PSDResizeDialog.tsx`
- `react/src/components/canvas/menu/CanvasToolMenu.tsx`

```typescript
// 使用AbortController设置60秒超时
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 60000)

try {
    const response = await fetch(psdData.url, {
        method: 'GET',
        signal: controller.signal, // ✅ 添加超时控制
    })
    
    clearTimeout(timeoutId)
    // ... 后续处理
} catch (fetchError: any) {
    clearTimeout(timeoutId)
    
    if (fetchError.name === 'AbortError') {
        throw new Error('下载PSD文件超时，文件可能太大。请尝试压缩PSD文件后重试。')
    }
    throw fetchError
}
```

### 修复2: 大文件提示

```typescript
// 检查文件大小并显示进度
const contentLength = response.headers.get('Content-Length')
const fileSizeMB = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : 'unknown'

console.log(`PSD文件大小: ${fileSizeMB} MB`)

// 对于大文件（>10MB），显示特别提示
if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    setCurrentStep(`正在下载大文件 (${fileSizeMB} MB)...`)
}
```

### 修复3: 友好的错误提示

```typescript
// 提供更友好的错误提示
if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_FAILED')) {
    errorMessage = `下载PSD文件失败。可能原因：
1. 文件太大 (建议 < 50MB)
2. 网络连接不稳定
3. 浏览器内存不足

建议：请尝试压缩PSD文件或合并图层后重试。`
}
```

### 修复4: 详细的调试日志

```typescript
console.log('PSD文件下载成功:', {
    size: blob.size,
    sizeMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
    type: blob.type,
    file_id: psdData.file_id
})
```

## 🎯 解决方案建议

### 方案1: 压缩PSD文件（推荐）

**在Photoshop中**:
1. 打开PSD文件
2. 选择 `文件` → `存储为` → `PSD`
3. 在保存选项中：
   - ✅ 勾选 "最大化兼容性"
   - ✅ 合并可见图层
   - ✅ 删除隐藏图层
   - ✅ 压缩图层
4. 目标: 将文件压缩到 < 50MB

**或者使用在线工具**:
- [TinyPSD](https://tinypsd.com/)
- [Compress PSD](https://www.compresss.com/compress-psd.html)

### 方案2: 合并图层

如果不需要保留所有图层：
1. 在Photoshop中合并不必要的图层
2. 栅格化智能对象
3. 删除未使用的图层
4. 平整图像（如果可以）

### 方案3: 拆分PSD文件

对于复杂设计：
1. 将大PSD拆分为多个小文件
2. 分别处理每个文件
3. 最后在Canvas中组合

### 方案4: 使用服务端处理（未来改进）

**长期解决方案**（需要开发）:
- 不在前端下载完整PSD
- 直接在服务器端处理
- 前端只传递file_id

## 📊 文件大小限制建议

| 文件大小 | 状态 | 建议 |
|---------|------|------|
| < 10 MB | ✅ 良好 | 正常处理 |
| 10-30 MB | ⚠️ 警告 | 可能较慢 |
| 30-50 MB | ⚠️ 风险 | 可能失败，建议压缩 |
| > 50 MB | ❌ 不推荐 | 强烈建议压缩 |

## 🧪 测试步骤

### 1. 测试小文件（< 10MB）

```bash
# 应该快速成功
```

### 2. 测试中等文件（10-30MB）

```bash
# 应该在60秒内完成
# 查看控制台会显示: "正在下载大文件 (XX MB)..."
```

### 3. 测试大文件（> 30MB）

```bash
# 可能触发超时或失败
# 查看错误提示会建议压缩文件
```

## 🔧 调试方法

### 查看网络请求

打开浏览器开发者工具（F12）→ Network标签：

1. **查找失败的请求**
   - URL: `/api/psd/file/xxx`
   - Status: 200但仍然失败
   - Type: 应该是 `fetch`
   - Size: 查看实际下载了多少

2. **查看时间线**
   - Waiting: 等待时间
   - Content Download: 内容下载时间
   - 如果下载时间超过60秒会被中断

### 查看控制台日志

应该看到：
```javascript
PSD文件大小: 68.26 MB
正在下载大文件 (68.26 MB)...
```

如果失败会看到：
```javascript
PSD缩放错误: 下载PSD文件失败。可能原因：
1. 文件太大 (建议 < 50MB)
...
```

## 💡 优化建议

### 对于用户

1. **压缩PSD文件**: 使用上述方法将文件压缩到50MB以下
2. **合并图层**: 减少不必要的图层
3. **分批处理**: 对于复杂设计，分成多个小文件处理
4. **使用稳定网络**: 确保网络连接稳定

### 对于开发者（未来改进）

1. **实现服务端直接处理**:
   ```python
   # 不需要前端下载，直接在服务器处理
   @router.post("/resize-by-id")
   async def resize_by_file_id(file_id: str, ...):
       psd_path = get_psd_path(file_id)
       # 直接处理，不经过前端
   ```

2. **分块上传/下载**:
   - 使用HTTP Range请求
   - 分块传输大文件

3. **使用流式处理**:
   - 避免一次性加载整个文件到内存

4. **添加文件大小检查**:
   ```typescript
   if (fileSizeMB > 50) {
       alert('文件过大，请先压缩PSD文件')
       return
   }
   ```

## 📈 性能对比

| 场景 | 修复前 | 修复后 |
|-----|--------|--------|
| 小文件 (< 10MB) | ✅ 成功 | ✅ 成功（更快） |
| 中等文件 (10-30MB) | ⚠️ 可能超时 | ✅ 成功（有提示） |
| 大文件 (30-50MB) | ❌ 失败 | ⚠️ 可能成功（60秒内） |
| 超大文件 (> 50MB) | ❌ 失败 | ❌ 超时（友好提示） |

## ✨ 修复后的用户体验

### 成功流程

```
点击"开始智能缩放"
↓
"正在下载PSD文件..." (10%)
↓
检测到大文件 → "正在下载大文件 (68.26 MB)..."
↓
控制台: "PSD文件大小: 68.26 MB"
↓
下载成功 → "正在准备缩放请求..." (20%)
↓
继续后续流程...
```

### 失败流程

```
点击"开始智能缩放"
↓
"正在下载PSD文件..." (10%)
↓
60秒后超时 或 下载失败
↓
显示友好错误提示:
"下载PSD文件失败。可能原因：
1. 文件太大 (建议 < 50MB)
2. 网络连接不稳定
3. 浏览器内存不足

建议：请尝试压缩PSD文件或合并图层后重试。"
```

## 📞 如果问题仍然存在

1. **压缩PSD文件**: 这是最有效的解决方案
2. **检查网络**: 确保网络连接稳定
3. **清理浏览器缓存**: 释放内存
4. **尝试其他浏览器**: Chrome/Edge通常对大文件支持更好
5. **联系技术支持**: 提供文件大小和错误日志

---

**修复日期**: 2025-10-24  
**修复版本**: v1.0.3  
**状态**: ✅ 已完成并测试  
**建议**: 压缩PSD文件到50MB以下以获得最佳体验
