# 前端框选PSD图层数据获取指南

## 📋 目录

- [概述](#概述)
- [核心API](#核心api)
- [获取选中PSD图层的完整方法](#获取选中psd图层的完整方法)
- [实际应用案例](#实际应用案例)
- [代码实现位置](#代码实现位置)
- [完整工具函数库](#完整工具函数库)

---

## 概述

当用户在画布上框选（或点击选中）PSD图层后，前端可以通过Excalidraw API获取这些选中图层的完整数据。

### 核心数据包括

- ✅ **选中状态** - 哪些元素被选中
- ✅ **图层信息** - PSD图层的customData
- ✅ **位置尺寸** - 画布上的坐标和大小
- ✅ **图片数据** - Base64图片内容
- ✅ **视觉属性** - 透明度、混合模式等

---

## 核心API

### 1. 获取应用状态和选中ID

```typescript
const appState = excalidrawAPI.getAppState()
const selectedIds = appState.selectedElementIds

// selectedIds 结构：
// {
//   "element_id_1": true,
//   "element_id_2": true,
// }
```

### 2. 获取所有画布元素

```typescript
const elements = excalidrawAPI.getSceneElements()
```

### 3. 获取文件数据

```typescript
const files = excalidrawAPI.getFiles()
```

---

## 获取选中PSD图层的完整方法

### 方法1：基础获取（推荐）

```typescript
function getSelectedPSDLayers(excalidrawAPI: any) {
  const appState = excalidrawAPI.getAppState()
  const selectedIds = appState.selectedElementIds
  
  if (Object.keys(selectedIds).length === 0) {
    return []
  }
  
  const elements = excalidrawAPI.getSceneElements()
  
  const selectedPSDLayers = elements.filter(element => 
    selectedIds[element.id] &&
    element.type === 'image' &&
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  )
  
  return selectedPSDLayers
}
```

### 方法2：获取完整信息（包含图片数据）

```typescript
function getSelectedPSDLayersFullInfo(excalidrawAPI: any) {
  const appState = excalidrawAPI.getAppState()
  const selectedIds = appState.selectedElementIds
  const elements = excalidrawAPI.getSceneElements()
  const files = excalidrawAPI.getFiles()
  
  const selectedPSDElements = elements.filter(element =>
    selectedIds[element.id] &&
    element.type === 'image' &&
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  )
  
  if (selectedPSDElements.length === 0) {
    return null
  }
  
  const psdFileId = selectedPSDElements[0].customData.psdFileId
  
  return {
    psdFileId: psdFileId,
    count: selectedPSDElements.length,
    selectedLayerIndices: selectedPSDElements.map(
      el => el.customData.psdLayerIndex
    ),
    layers: selectedPSDElements.map(element => {
      const fileData = files[element.fileId]
      
      return {
        elementId: element.id,
        fileId: element.fileId,
        psdFileId: element.customData.psdFileId,
        layerIndex: element.customData.psdLayerIndex,
        layerName: element.customData.layerName,
        position: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height
        },
        opacity: element.opacity,
        originalOpacity: element.customData.originalOpacity,
        blendMode: element.customData.blendMode,
        imageData: fileData ? {
          mimeType: fileData.mimeType,
          dataURL: fileData.dataURL,
          size: fileData.dataURL?.length || 0
        } : null
      }
    })
  }
}
```

---

## 实际应用案例

### 案例1：pop-bar - 选中图层弹窗

**位置**: `react/src/components/canvas/pop-bar/index.tsx`

```typescript
excalidrawAPI?.onChange((elements, appState, files) => {
  const selectedIds = appState.selectedElementIds
  
  if (Object.keys(selectedIds).length === 0) {
    return
  }
  
  // 筛选选中的图片元素（包括PSD图层）
  const selectedImages = elements.filter(
    (element) => element.type === 'image' && selectedIds[element.id]
  )
  
  // 处理图片数据
  selectedImagesRef.current = selectedImages
    .filter((image) => image.fileId)
    .map((image) => {
      const file = files[image.fileId!]
      return {
        fileId: file.id,
        base64: file.dataURL,
        width: image.width,
        height: image.height,
      }
    })
})
```

### 案例2：PSDResizeDialog - 智能缩放

**位置**: `react/src/components/canvas/PSDResizeDialog.tsx`

```typescript
export function PSDResizeDialog({ 
  selectedLayerIndices  // 选中的图层索引
}: PSDResizeDialogProps) {
  
  React.useEffect(() => {
    if (selectedLayerIndices && selectedLayerIndices.length > 0) {
      console.log('选中图层:', selectedLayerIndices)
      setResizeMode('selected')
    }
  }, [selectedLayerIndices])
  
  const handleResize = async () => {
    const formData = new FormData()
    formData.append('layer_indices', JSON.stringify(selectedLayerIndices))
    // 调用API...
  }
}
```

### 案例3：PSDLayerSidebar - 图层侧边栏

**位置**: `react/src/components/canvas/PSDLayerSidebar.tsx`

```typescript
useEffect(() => {
  const updateCanvasElements = () => {
    const elements = excalidrawAPI.getSceneElements()
    const psdElements = elements.filter(
      element => element.customData?.psdFileId
    )
    setCanvasElements(psdElements)
  }
  
  updateCanvasElements()
  const unsubscribe = excalidrawAPI.on?.('change', updateCanvasElements)
  
  return () => unsubscribe?.()
}, [excalidrawAPI])
```

---

## 代码实现位置

| 文件 | 功能 | 行号 |
|-----|------|------|
| `pop-bar/index.tsx` | 监听选中变化 | 21-110 |
| `PSDResizeDialog.tsx` | 智能缩放 | 43-61 |
| `PSDLayerSidebar.tsx` | 图层管理 | 75-102 |
| `CanvasExport.tsx` | 导出功能 | 40-42 |
| `CanvasMagicGenerator.tsx` | AI生成 | 26-31 |

---

## 完整工具函数库

```typescript
// utils/psdLayerSelection.ts

/**
 * 判断元素是否为PSD图层
 */
export function isPSDLayer(element: any): boolean {
  return !!(
    element.type === 'image' &&
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  )
}

/**
 * 获取选中的所有PSD图层
 */
export function getSelectedPSDLayers(excalidrawAPI: any) {
  const appState = excalidrawAPI.getAppState()
  const selectedIds = appState.selectedElementIds
  
  if (Object.keys(selectedIds).length === 0) {
    return []
  }
  
  const elements = excalidrawAPI.getSceneElements()
  return elements.filter(element => 
    selectedIds[element.id] && isPSDLayer(element)
  )
}

/**
 * 获取选中PSD图层的完整信息
 */
export function getSelectedPSDLayersFullInfo(excalidrawAPI: any) {
  const appState = excalidrawAPI.getAppState()
  const selectedIds = appState.selectedElementIds
  const elements = excalidrawAPI.getSceneElements()
  const files = excalidrawAPI.getFiles()
  
  const selectedPSDElements = elements.filter(element =>
    selectedIds[element.id] && isPSDLayer(element)
  )
  
  if (selectedPSDElements.length === 0) {
    return null
  }
  
  const psdFileId = selectedPSDElements[0].customData.psdFileId
  
  return {
    psdFileId,
    count: selectedPSDElements.length,
    selectedLayerIndices: selectedPSDElements.map(
      el => el.customData.psdLayerIndex
    ),
    layers: selectedPSDElements.map(element => {
      const fileData = files[element.fileId]
      return {
        elementId: element.id,
        fileId: element.fileId,
        psdFileId: element.customData.psdFileId,
        layerIndex: element.customData.psdLayerIndex,
        layerName: element.customData.layerName,
        position: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height
        },
        opacity: element.opacity,
        originalOpacity: element.customData.originalOpacity,
        blendMode: element.customData.blendMode,
        imageData: fileData ? {
          dataURL: fileData.dataURL,
          mimeType: fileData.mimeType,
          size: fileData.dataURL?.length || 0
        } : null
      }
    })
  }
}

/**
 * 按PSD文件分组选中的图层
 */
export function groupSelectedLayersByPSD(excalidrawAPI: any) {
  const selectedLayers = getSelectedPSDLayers(excalidrawAPI)
  const grouped = new Map<string, any[]>()
  
  selectedLayers.forEach(layer => {
    const psdFileId = layer.customData.psdFileId
    if (!grouped.has(psdFileId)) {
      grouped.set(psdFileId, [])
    }
    grouped.get(psdFileId)!.push(layer)
  })
  
  return grouped
}

/**
 * 获取选中图层的边界框
 */
export function getSelectedLayersBoundingBox(excalidrawAPI: any) {
  const selectedLayers = getSelectedPSDLayers(excalidrawAPI)
  
  if (selectedLayers.length === 0) return null
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  selectedLayers.forEach(layer => {
    minX = Math.min(minX, layer.x)
    minY = Math.min(minY, layer.y)
    maxX = Math.max(maxX, layer.x + layer.width)
    maxY = Math.max(maxY, layer.y + layer.height)
  })
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  }
}

/**
 * 按图层索引排序
 */
export function sortSelectedLayersByIndex(excalidrawAPI: any) {
  const selectedLayers = getSelectedPSDLayers(excalidrawAPI)
  return selectedLayers.sort((a, b) => {
    return (a.customData?.psdLayerIndex ?? 0) - (b.customData?.psdLayerIndex ?? 0)
  })
}
```

### 使用示例

```typescript
import { getSelectedPSDLayersFullInfo } from '@/utils/psdLayerSelection'

const handleButtonClick = () => {
  const fullInfo = getSelectedPSDLayersFullInfo(excalidrawAPI)
  
  if (fullInfo) {
    console.log('PSD文件ID:', fullInfo.psdFileId)
    console.log('选中图层数:', fullInfo.count)
    console.log('图层索引:', fullInfo.selectedLayerIndices)
    
    fullInfo.layers.forEach(layer => {
      console.log(`图层 "${layer.layerName}":`, {
        索引: layer.layerIndex,
        位置: `(${layer.position.x}, ${layer.position.y})`,
        尺寸: `${layer.position.width}x${layer.position.height}`,
        透明度: layer.opacity
      })
    })
  }
}
```

---

## 关键要点总结

### 数据流转

```
用户框选图层 
  ↓
appState.selectedElementIds 更新
  ↓
onChange 事件触发
  ↓
筛选选中的PSD图层
  ↓
提取完整数据
  ↓
执行后续操作
```

### 核心判断条件

```typescript
// 判断是否为选中的PSD图层
selectedIds[element.id] &&           // 1. 被选中
element.type === 'image' &&          // 2. 是图片类型
element.customData?.psdFileId &&     // 3. 有PSD文件ID
element.customData?.psdLayerIndex !== undefined  // 4. 有图层索引
```

---


