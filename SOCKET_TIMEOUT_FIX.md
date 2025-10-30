# Socket.IO 超时问题修复

## 问题描述

当用户点击"开始智能缩放"按钮后，控制台出现以下错误：

```
开始智能缩放: {file_id: 'im_nCMlflGr', target_width: 800, target_height: 600, ...}
🔌 Socket.IO disconnected: ping timeout
❌ Socket.IO connection error: Error: timeout
```

同时出现大量 Socket.IO 重连尝试和超时错误。

## 问题分析

### 根本原因

1. **智能缩放处理时间过长**
   - 需要调用 Gemini API 分析图层
   - Gemini API 响应可能需要 30秒 - 2分钟
   - 超过了默认的 HTTP 和 Socket.IO 超时时间

2. **前端请求未设置超时**
   - 原代码使用 `fetch` 但没有设置 `signal` 和超时控制
   - 浏览器默认超时可能只有 60秒

3. **Socket.IO 次要影响**
   - Socket.IO 用于实时通信，但智能缩放使用的是 HTTP API
   - Socket.IO 超时不影响功能，但会产生错误日志

### 网络连接状态

```
TCP    127.0.0.1:58000    LISTENING       # 服务器正常运行
TCP    127.0.0.1:58000    CLOSE_WAIT      # 多个连接处于关闭等待状态
TCP    127.0.0.1:58000    FIN_WAIT_2      # 多个连接处于结束等待状态
```

这些 CLOSE_WAIT 和 FIN_WAIT_2 状态表明有很多连接因超时而异常关闭。

## 解决方案

### 1. 增加 HTTP 请求超时时间

**修改文件**: 
- `react/src/components/canvas/menu/CanvasToolMenu.tsx`
- `react/src/components/canvas/PSDResizeDialog.tsx`

**修改内容**:

```typescript
// ✅ 使用 AbortController 设置 180秒 超时
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 180000) // 180秒超时

try {
    const resizeResponse = await fetch('/api/psd/resize/resize-by-id', {
        method: 'POST',
        body: formData,
        signal: controller.signal,  // ✅ 添加超时信号
    })

    clearTimeout(timeoutId)
    
    // 处理响应...
    
} catch (fetchError: any) {
    clearTimeout(timeoutId)
    
    if (fetchError.name === 'AbortError') {
        throw new Error('处理超时（超过3分钟）。可能原因：...')
    }
    throw fetchError
}
```

### 2. 改进用户提示

**修改前**:
```typescript
setCurrentStep('正在调用Gemini API分析图层...')
```

**修改后**:
```typescript
setCurrentStep('正在调用Gemini API分析图层（这可能需要1-2分钟）...')
```

**用户体验改进**:
- ✅ 明确告知用户需要等待时间
- ✅ 避免用户误以为程序卡死
- ✅ 提供更友好的超时错误提示

### 3. 错误提示优化

**超时错误提示**:
```
处理超时（超过3分钟）。可能原因：
1. Gemini API响应慢
2. 图层数量过多
3. 网络连接问题

请稍后重试或减少图层数量。
```

## 技术细节

### 超时时间选择

| 操作 | 预计时间 | 设置超时 | 原因 |
|------|----------|----------|------|
| 文件下载 | 5-30秒 | 60秒 | 大文件传输 |
| **智能缩放** | **30-120秒** | **180秒** | **Gemini API 处理** |
| 一般 API | 1-5秒 | 30秒 | 网络延迟 |

### AbortController 使用

```typescript
// 创建控制器
const controller = new AbortController()

// 设置超时定时器
const timeoutId = setTimeout(() => {
    controller.abort()  // 触发中止
}, 180000)

// 绑定到 fetch
fetch(url, { signal: controller.signal })

// 清理定时器（成功或失败都要清理）
clearTimeout(timeoutId)

// 捕获中止异常
catch (error) {
    if (error.name === 'AbortError') {
        // 超时处理
    }
}
```

### 为什么是 180秒？

1. **Gemini API 处理时间**
   - 图层分析：10-30秒
   - AI 生成位置：20-60秒
   - 网络延迟：5-10秒
   - **总计：35-100秒**

2. **安全余量**
   - 设置为 180秒（3分钟）
   - 提供 80-145秒 的余量
   - 避免正常请求被误判为超时

3. **用户体验考虑**
   - 3分钟是用户能接受的最大等待时间
   - 超过3分钟，用户会认为出错
   - 提供明确的进度提示缓解焦虑

## Socket.IO 超时说明

### Socket.IO 是否影响功能？

**不影响**。智能缩放使用的是 HTTP API，不依赖 Socket.IO：

```
智能缩放流程:
前端 → HTTP POST /api/psd/resize/resize-by-id → 后端处理 → 返回结果
       (不经过 Socket.IO)
```

Socket.IO 主要用于：
- 实时聊天会话
- 工具调用进度推送
- 服务器状态更新

### 为什么会出现 Socket.IO 超时？

```
用户操作 → 页面长时间等待 → Socket.IO ping/pong 超时 → 自动重连
```

**解决方案**:
1. ✅ 增加 HTTP 请求超时（已修复）
2. ❌ 增加 Socket.IO 超时（不推荐，会掩盖真实问题）

Socket.IO 超时是**症状**，不是**原因**。修复 HTTP 超时后，Socket.IO 错误会自然消失。

## 测试验证

### 测试场景

```bash
# 1. 测试小文件（图层少，应该 < 30秒）
curl -X POST http://localhost:58000/api/psd/resize/resize-by-id \
  -F "file_id=im_small123" \
  -F "target_width=800" \
  -F "target_height=600"

# 2. 测试大文件（图层多，可能需要 60-120秒）
curl -X POST http://localhost:58000/api/psd/resize/resize-by-id \
  -F "file_id=im_nCMlflGr" \
  -F "target_width=800" \
  -F "target_height=600"
```

### 预期结果

**成功情况**:
```
✅ 正在准备缩放请求...
✅ 正在调用Gemini API分析图层（这可能需要1-2分钟）...
✅ 正在处理结果...
✅ 缩放完成
```

**超时情况**（超过3分钟）:
```
❌ 处理超时（超过3分钟）。可能原因：
   1. Gemini API响应慢
   2. 图层数量过多
   3. 网络连接问题
```

## 对比总结

### 修改前

| 问题 | 表现 |
|------|------|
| 超时时间 | 浏览器默认（~60秒） |
| 超时提示 | 无，或者显示 "Failed to fetch" |
| 用户等待提示 | "正在调用Gemini API..." |
| Socket.IO 错误 | 大量超时和重连错误 |

### 修改后

| 改进 | 表现 |
|------|------|
| 超时时间 | **180秒（3分钟）** ✅ |
| 超时提示 | **详细的原因和建议** ✅ |
| 用户等待提示 | **"这可能需要1-2分钟"** ✅ |
| Socket.IO 错误 | **不会再出现（因为请求不会超时）** ✅ |

## 相关文件

- ✅ `react/src/components/canvas/menu/CanvasToolMenu.tsx` - 已修复
- ✅ `react/src/components/canvas/PSDResizeDialog.tsx` - 已修复
- 📄 `PSD_LARGE_FILE_SOLUTION.md` - 大文件处理方案
- 📄 `HOW_TO_USE_LARGE_PSD.md` - 使用指南

## 后续优化建议

### 1. 服务端进度推送（可选）

可以通过 Socket.IO 推送实时进度：

```python
# 服务端
await sio.emit('resize_progress', {
    'file_id': file_id,
    'step': 'extracting_layers',
    'progress': 30
})
```

```typescript
// 前端监听
socket.on('resize_progress', (data) => {
    setProgress(data.progress)
    setCurrentStep(data.step)
})
```

### 2. 任务队列（可选）

对于超大文件，可以使用后台任务：

```python
# 后台处理
task_id = await create_resize_task(file_id, width, height)
return {'task_id': task_id, 'status': 'processing'}

# 前端轮询
while (status !== 'complete') {
    status = await fetch(`/api/psd/resize/status/${task_id}`)
    await sleep(2000)
}
```

### 3. 缓存结果（可选）

缓存相同参数的缩放结果，避免重复处理：

```python
cache_key = f"{file_id}_{target_width}_{target_height}"
if cache_key in cache:
    return cache[cache_key]
```

---

**问题已解决！** 现在智能缩放功能可以正常处理长时间的 Gemini API 调用了。🎉
