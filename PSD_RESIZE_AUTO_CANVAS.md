# PSD 智能缩放自动添加到画布功能

## 🎯 功能概述

当用户使用 PSD 智能缩放功能完成后，缩放后的图片会**自动添加到自由画布中央**，无需手动下载和上传。

## ✨ 新增功能

### 1. **自动添加到画布**
- ✅ 缩放完成后自动将结果图片添加到画布
- ✅ 图片自动居中显示
- ✅ 保持原始缩放后的尺寸
- ✅ 提供成功提示

### 2. **手动添加按钮**
- ✅ 在缩放完成后显示 "添加到画布" 按钮
- ✅ 用户可以重复添加图片到画布
- ✅ 与下载按钮并列显示

## 🔧 技术实现

### 修改的文件

1. **`react/src/components/canvas/PSDResizeDialog.tsx`**
   - 添加 `useCanvas` hook 获取 `excalidrawAPI`
   - 添加 `addResizedImageToCanvas` 函数
   - 在缩放完成后自动调用添加函数
   - 添加手动 "添加到画布" 按钮

2. **`react/src/components/canvas/menu/CanvasToolMenu.tsx`**
   - 添加 `addResizedImageToCanvas` 函数
   - 在缩放完成后自动添加图片到画布

### 核心代码逻辑

```typescript
// 添加缩放后的图片到画布
const addResizedImageToCanvas = async (imageUrl: string, width: number, height: number) => {
  // 1. 获取图片
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const file = new File([blob], `resized_${Date.now()}.png`, { type: 'image/png' })

  // 2. 转换为 Base64
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // 3. 创建 Excalidraw 文件数据
  const fileId = `resized-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const fileData = {
    mimeType: 'image/png' as const,
    id: fileId as any,
    dataURL: dataURL as any,
    created: Date.now()
  }

  // 4. 添加到 Excalidraw 文件系统
  excalidrawAPI.addFiles([fileData])

  // 5. 计算画布中心位置
  const appState = excalidrawAPI.getAppState()
  const canvasWidth = appState.width || 800
  const canvasHeight = appState.height || 600
  const centerX = (canvasWidth - width) / 2
  const centerY = (canvasHeight - height) / 2

  // 6. 创建图片元素
  const imageElement = {
    type: 'image' as const,
    id: `resized-${Date.now()}`,
    x: centerX > 0 ? centerX : 100,
    y: centerY > 0 ? centerY : 100,
    width: width,
    height: height,
    fileId: fileId as any,
    // ... 其他必需属性
    customData: {
      isResizedPSD: true,
      originalPSDFileId: psdData.file_id,
      resizedAt: Date.now()
    }
  } as any

  // 7. 更新场景，添加新图片元素
  const currentElements = excalidrawAPI.getSceneElements()
  excalidrawAPI.updateScene({
    elements: [...currentElements, imageElement],
  })
}
```

## 🚀 使用流程

### 自动添加流程

```
1. 用户上传 PSD 文件
        ↓
2. 点击智能缩放按钮
        ↓
3. 设置目标尺寸 → 开始智能缩放
        ↓
4. Gemini API 分析图层
        ↓
5. 后端生成缩放后的图片
        ↓
6. 📌 自动添加图片到画布中央
        ↓
7. 显示成功提示
```

### 手动添加流程

```
1. 缩放完成后
        ↓
2. 点击 "添加到画布" 按钮
        ↓
3. 图片再次添加到画布
        ↓
4. 可重复操作
```

## 🎨 UI 改进

### 进度提示更新

- **旧进度**：
  ```
  90% 正在处理结果...
  100% 缩放完成
  ```

- **新进度**：
  ```
  90% 正在处理结果...
  95% 正在添加图片到画布...
  100% 缩放完成
  ```

### 成功提示更新

- **旧提示**：`智能缩放完成！`
- **新提示**：`智能缩放完成！图片已添加到画布`

### 新增按钮

```tsx
<Button 
  variant="outline"
  onClick={() => addResizedImageToCanvas(
    result.output_url,
    result.target_size.width,
    result.target_size.height
  )}
>
  <Eye className="h-4 w-4 mr-2" />
  添加到画布
</Button>
```

## 📊 图片定位策略

### 居中算法

```typescript
// 计算画布中心位置
const appState = excalidrawAPI.getAppState()
const canvasWidth = appState.width || 800
const canvasHeight = appState.height || 600

// 计算图片应该放置的位置（居中）
const centerX = (canvasWidth - width) / 2
const centerY = (canvasHeight - height) / 2

// 如果计算出的位置为负数，则使用默认位置
const x = centerX > 0 ? centerX : 100
const y = centerY > 0 ? centerY : 100
```

## 🔍 自定义数据标记

每个添加到画布的缩放图片都会包含以下元数据：

```typescript
customData: {
  isResizedPSD: true,           // 标记为缩放后的PSD图片
  originalPSDFileId: string,    // 原始PSD文件ID
  resizedAt: number             // 缩放时间戳
}
```

这些元数据可用于：
- 识别图片来源
- 过滤和管理缩放图片
- 追踪缩放历史

## ⚠️ 错误处理

### 可能的错误情况

1. **excalidrawAPI 不可用**
   - 提示：`画布API不可用`
   - 不会中断缩放流程

2. **图片获取失败**
   - 提示：`获取图片失败: [HTTP状态码]`
   - 记录详细错误日志

3. **图片转换失败**
   - 提示：`添加图片到画布失败: [错误信息]`
   - 不影响图片下载功能

## 🎯 优势

| 特性 | 旧方式 | 新方式 |
|------|--------|--------|
| **用户操作** | 下载 → 手动上传到画布 | 自动添加 |
| **操作步骤** | 3+ 步 | 0 步（自动） |
| **位置调整** | 需要手动拖动 | 自动居中 |
| **成功率** | 依赖用户操作 | 100% 自动化 |
| **用户体验** | 繁琐 | 流畅 |

## 🔄 兼容性

- ✅ 保留原有下载功能
- ✅ 支持重复添加到画布
- ✅ 不影响现有工作流
- ✅ 向后兼容

## 📝 使用建议

1. **首次使用**：观察自动添加功能，确认图片位置正确
2. **多次添加**：如需在不同位置展示，可使用 "添加到画布" 按钮多次添加
3. **手动调整**：添加后可在画布中自由调整位置和大小
4. **保存画布**：记得保存画布以保留缩放结果

## 🐛 已知问题

- 无

## 🎉 未来改进

- [ ] 支持选择图片添加位置（左上、右上、左下、右下、中心）
- [ ] 支持批量缩放多个 PSD 文件
- [ ] 支持缩放历史记录
- [ ] 支持撤销/重做缩放操作

---

**最后更新**：2025-10-28
**版本**：v1.0.0


