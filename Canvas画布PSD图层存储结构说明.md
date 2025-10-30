# Canvas画布PSD图层存储结构说明

## 📋 目录

- [概述](#概述)
- [存储层级](#存储层级)
- [Excalidraw元素结构](#excalidraw元素结构)
- [CustomData详解](#customdata详解)
- [BinaryFileData结构](#binaryfiledata结构)
- [完整示例](#完整示例)
- [数据获取方法](#数据获取方法)
- [存储位置](#存储位置)
- [数据流转](#数据流转)

---

## 概述

当PSD文件上传到画布后，每个PSD图层会被转换为一个 **Excalidraw图像元素（Image Element）**，存储在画布的场景数据中。这些元素包含了完整的图层信息、位置信息和视觉属性。

### 核心特点

- ✅ **无损存储** - 保留所有PSD图层信息
- ✅ **独立操作** - 每个图层可独立移动、缩放、编辑
- ✅ **关联追溯** - 通过标识符可追溯到原始PSD文件
- ✅ **实时同步** - 支持与PSD源文件双向同步
- ✅ **元数据丰富** - 存储图层类型、混合模式、透明度等

---

## 存储层级

PSD图层在画布上的存储分为三个层级：

```
Canvas Scene（画布场景）
├── Elements Array（元素数组）
│   └── Image Element（图像元素）
│       ├── 基本属性（位置、尺寸、样式）
│       ├── customData（PSD特定信息）⭐
│       └── fileId（关联到BinaryFileData）
│
└── Files Object（文件对象）
    └── BinaryFileData（二进制文件数据）
        ├── id（文件ID）
        ├── mimeType（MIME类型）
        ├── dataURL（Base64图片数据）⭐
        └── created（创建时间）
```

---

## Excalidraw元素结构

### 完整的Image Element结构

当PSD图层添加到画布时，会创建以下结构的Excalidraw元素：

```typescript
interface PSDLayerElement {
  // ========== 基本标识 ==========
  type: 'image'                           // 元素类型（固定为image）
  id: string                              // 唯一元素ID
                                         // 格式: `psd_layer_${layer.index}_${timestamp}`
  
  // ========== 位置和尺寸 ==========
  x: number                              // X坐标（像素）
  y: number                              // Y坐标（像素）
  width: number                          // 宽度（像素）
  height: number                         // 高度（像素）
  angle: number                          // 旋转角度（弧度，默认0）
  
  // ========== 视觉样式 ==========
  opacity: number                        // 透明度（0-100）
                                         // 从PSD的0-255转换而来
  strokeColor: string                    // 描边颜色（默认'#000000'）
  strokeWidth: number                    // 描边宽度（默认1）
  strokeStyle: 'solid' | 'dashed'       // 描边样式（默认'solid'）
  backgroundColor: string                 // 背景颜色（默认'transparent'）
  fillStyle: 'solid' | 'hachure'        // 填充样式（默认'solid'）
  roundness: null | object               // 圆角设置（默认null）
  roughness: number                      // 粗糙度（默认1）
  
  // ========== 变换属性 ==========
  scale: [number, number]                // 缩放比例 [x, y]（默认[1, 1]）
  crop: null | object                    // 裁剪信息（默认null）
  
  // ========== 状态属性 ==========
  locked: boolean                        // 是否锁定（默认false）
  isDeleted: boolean                     // 是否删除（默认false）
  visible: boolean                       // 是否可见（通过opacity判断）
  
  // ========== 关联属性 ==========
  fileId: string                         // 关联的文件ID ⭐
                                         // 格式: `psd_layer_${index}_${psdFileId}_${timestamp}`
  link: null | string                    // 超链接（默认null）
  
  // ========== 层级关系 ==========
  groupIds: string[]                     // 所属组ID数组（默认[]）
  frameId: null | string                 // 所属框架ID（默认null）
  boundElements: any[]                   // 绑定元素（默认[]）
  index: null | string                   // Z-index顺序
  
  // ========== 版本控制 ==========
  version: number                        // 版本号（默认1）
  versionNonce: number                   // 版本随机数
  seed: number                           // 随机种子
  updated: number                        // 更新时间戳
  
  // ========== PSD特定信息 ⭐⭐⭐ ==========
  customData: {
    psdLayerIndex: number                // PSD图层索引
    psdFileId: string                    // PSD文件ID
    layerName: string                    // 图层名称
    originalOpacity: number              // 原始透明度（0-255）
    blendMode: string                    // 混合模式
    visible?: boolean                    // 可见性状态（可选）
    
    // 以下是可能的扩展字段
    layerType?: string                   // 图层类型（layer/text/group）
    parentIndex?: number                 // 父图层索引
    fontFamily?: string                  // 字体（文字图层）
    fontSize?: number                    // 字体大小（文字图层）
    textContent?: string                 // 文字内容（文字图层）
  }
  
  // ========== 其他属性 ==========
  status: 'saved' | 'pending'           // 保存状态（默认'saved'）
}
```

### 代码实现

在 `PSDCanvasUploader.tsx` 中的实际创建代码：

```typescript
const imageElement: ExcalidrawImageElement = {
    type: 'image',
    id: `psd_layer_${layer.index}_${Date.now()}`,
    x: layer.left + offsetX,
    y: layer.top + offsetY,
    width: layer.width,
    height: layer.height,
    angle: 0,
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roundness: null,
    roughness: 1,
    opacity: Math.round((layer.opacity || 255) / 255 * 100),
    seed: Math.random(),
    version: 1,
    versionNonce: Math.random(),
    locked: false,
    isDeleted: false,
    groupIds: [],
    boundElements: [],
    updated: Date.now(),
    frameId: null,
    index: null,
    customData: {
        psdLayerIndex: layer.index,
        psdFileId: psdFileId,
        layerName: layer.name,
        originalOpacity: layer.opacity || 255,
        blendMode: layer.blend_mode || 'normal',
    },
    fileId: `psd_layer_${layer.index}_${psdFileId}_${Date.now()}`,
    link: null,
    status: 'saved',
    scale: [1, 1],
    crop: null,
}
```

---

## CustomData详解

`customData` 是存储PSD特定信息的关键字段，它让画布元素能够追溯到原始PSD图层。

### 核心字段

```typescript
interface PSDCustomData {
  // ========== 必需字段 ==========
  psdLayerIndex: number        // PSD图层索引（从0开始）
                              // 用于定位原始PSD中的图层
  
  psdFileId: string           // PSD文件ID
                              // 格式: 'psd_' + 唯一标识符
                              // 用于追溯到原始PSD文件
  
  layerName: string           // 图层名称
                              // 直接来自PSD文件中的图层名
  
  originalOpacity: number     // 原始透明度（0-255）
                              // PSD原生的透明度值
                              // 用于恢复原始状态
  
  blendMode: string           // 混合模式
                              // 如: 'normal', 'multiply', 'screen'等
                              // PSD支持的所有混合模式
  
  // ========== 可选字段 ==========
  visible?: boolean           // 显式可见性标记
                              // 用于在opacity=0时仍能追踪可见状态
  
  layerType?: string          // 图层类型
                              // 'pixel' | 'text' | 'shape' | 'group'
  
  parentIndex?: number | null // 父图层索引
                              // null表示根层级
                              // 用于重建图层层级关系
  
  // ========== 文字图层专属 ==========
  fontFamily?: string         // 字体名称
  fontSize?: number           // 字体大小（点）
  fontWeight?: string         // 字体粗细
  fontStyle?: string          // 字体样式
  textAlign?: string          // 文字对齐
  textColor?: string          // 文字颜色（十六进制）
  textContent?: string        // 文字内容
  lineHeight?: number         // 行高
  letterSpacing?: number      // 字间距
  
  // ========== 编辑历史 ==========
  lastModified?: number       // 最后修改时间戳
  modifiedBy?: string         // 修改者
  editCount?: number          // 编辑次数
  
  // ========== 缩放相关 ==========
  isResized?: boolean         // 是否被缩放过
  resizeRatio?: number        // 缩放比例
  originalBounds?: {          // 原始边界
    left: number
    top: number
    right: number
    bottom: number
  }
}
```

### 使用示例

```typescript
// 获取元素的PSD信息
const element = excalidrawAPI.getSceneElements()[0];
const customData = element.customData;

console.log('PSD图层信息:', {
  文件ID: customData.psdFileId,
  图层索引: customData.psdLayerIndex,
  图层名称: customData.layerName,
  原始透明度: customData.originalOpacity,
  混合模式: customData.blendMode
});

// 判断是否为PSD图层
function isPSDLayer(element: any): boolean {
  return element.customData?.psdFileId && 
         element.customData?.psdLayerIndex !== undefined;
}

// 获取同一PSD文件的所有图层
function getLayersByPSDFile(elements: any[], psdFileId: string) {
  return elements.filter(el => 
    el.customData?.psdFileId === psdFileId
  );
}
```

---

## BinaryFileData结构

每个PSD图层元素都关联一个`BinaryFileData`对象，存储实际的图片数据。

### 完整结构

```typescript
interface BinaryFileData {
  // ========== 标识 ==========
  id: string                   // 文件ID，与element.fileId对应
                              // 格式: `psd_layer_${index}_${psdFileId}_${timestamp}`
  
  // ========== 文件信息 ==========
  mimeType: 'image/png'       // MIME类型（PSD图层统一为PNG）
  
  // ========== 图片数据 ⭐ ==========
  dataURL: string             // Base64编码的图片数据
                              // 格式: 'data:image/png;base64,iVBORw0KG...'
                              // 这是实际显示的图片内容
  
  // ========== 元数据 ==========
  created: number             // 创建时间戳
  
  // ========== 可选字段 ==========
  lastRetrieved?: number      // 最后访问时间
  size?: number               // 文件大小（字节）
}
```

### 代码实现

```typescript
const binaryFileData: BinaryFileData = {
    id: `psd_layer_${layer.index}_${psdFileId}_${Date.now()}`,
    mimeType: 'image/png',
    dataURL: dataURL,  // Base64编码的PNG图片
    created: Date.now(),
}

// 添加到Excalidraw文件系统
excalidrawAPI.addFiles([binaryFileData]);
```

### 访问图片数据

```typescript
// 通过fileId获取图片数据
const files = excalidrawAPI.getFiles();
const imageData = files[element.fileId];

console.log('图片信息:', {
  ID: imageData.id,
  类型: imageData.mimeType,
  数据URL: imageData.dataURL.substring(0, 50) + '...',
  创建时间: new Date(imageData.created)
});

// 将dataURL转换为Blob
function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const base64 = parts[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mimeType });
}
```

---

## 完整示例

### 示例1：单个PSD图层的完整存储结构

```json
{
  "element": {
    "type": "image",
    "id": "psd_layer_2_1704067200000",
    "x": 150,
    "y": 200,
    "width": 500,
    "height": 300,
    "angle": 0,
    "opacity": 80,
    "strokeColor": "#000000",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "roundness": null,
    "roughness": 1,
    "locked": false,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": [],
    "frameId": null,
    "index": "a2",
    "version": 1,
    "versionNonce": 123456789,
    "seed": 987654321,
    "updated": 1704067200000,
    "fileId": "psd_layer_2_psd_abc123_1704067200000",
    "link": null,
    "status": "saved",
    "scale": [1, 1],
    "crop": null,
    "customData": {
      "psdLayerIndex": 2,
      "psdFileId": "psd_abc123",
      "layerName": "Product Image",
      "originalOpacity": 204,
      "blendMode": "normal",
      "visible": true,
      "layerType": "pixel"
    }
  },
  "fileData": {
    "id": "psd_layer_2_psd_abc123_1704067200000",
    "mimeType": "image/png",
    "dataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "created": 1704067200000
  }
}
```

### 示例2：文字图层的完整存储结构

```json
{
  "element": {
    "type": "image",
    "id": "psd_layer_5_1704067300000",
    "x": 100,
    "y": 50,
    "width": 400,
    "height": 80,
    "opacity": 100,
    "customData": {
      "psdLayerIndex": 5,
      "psdFileId": "psd_abc123",
      "layerName": "Title Text",
      "originalOpacity": 255,
      "blendMode": "normal",
      "layerType": "text",
      "fontFamily": "Arial",
      "fontSize": 48,
      "fontWeight": "bold",
      "fontStyle": "normal",
      "textAlign": "left",
      "textColor": "#FFFFFF",
      "textContent": "Welcome",
      "lineHeight": 1.2,
      "letterSpacing": 0
    },
    "fileId": "psd_layer_5_psd_abc123_1704067300000"
  },
  "fileData": {
    "id": "psd_layer_5_psd_abc123_1704067300000",
    "mimeType": "image/png",
    "dataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "created": 1704067300000
  }
}
```

### 示例3：多个PSD图层在画布上的组织

```json
{
  "canvasData": {
    "elements": [
      {
        "id": "psd_layer_0_1704067100000",
        "customData": {
          "psdLayerIndex": 0,
          "psdFileId": "psd_abc123",
          "layerName": "Background"
        }
      },
      {
        "id": "psd_layer_1_1704067150000",
        "customData": {
          "psdLayerIndex": 1,
          "psdFileId": "psd_abc123",
          "layerName": "Shadow"
        }
      },
      {
        "id": "psd_layer_2_1704067200000",
        "customData": {
          "psdLayerIndex": 2,
          "psdFileId": "psd_abc123",
          "layerName": "Product"
        }
      },
      {
        "id": "psd_layer_3_1704067250000",
        "customData": {
          "psdLayerIndex": 3,
          "psdFileId": "psd_abc123",
          "layerName": "Title"
        }
      }
    ],
    "files": {
      "psd_layer_0_psd_abc123_1704067100000": { "dataURL": "..." },
      "psd_layer_1_psd_abc123_1704067150000": { "dataURL": "..." },
      "psd_layer_2_psd_abc123_1704067200000": { "dataURL": "..." },
      "psd_layer_3_psd_abc123_1704067250000": { "dataURL": "..." }
    }
  }
}
```

---

## 数据获取方法

### 1. 获取所有PSD图层元素

```typescript
function getAllPSDLayers(excalidrawAPI: any) {
  const elements = excalidrawAPI.getSceneElements();
  return elements.filter(element => 
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  );
}
```

### 2. 获取特定PSD文件的图层

```typescript
function getLayersByPSDFile(excalidrawAPI: any, psdFileId: string) {
  const allLayers = getAllPSDLayers(excalidrawAPI);
  return allLayers.filter(layer => 
    layer.customData.psdFileId === psdFileId
  );
}
```

### 3. 获取图层的完整信息

```typescript
function getLayerFullInfo(excalidrawAPI: any, elementId: string) {
  const elements = excalidrawAPI.getSceneElements();
  const files = excalidrawAPI.getFiles();
  
  const element = elements.find(el => el.id === elementId);
  if (!element) return null;
  
  const fileData = files[element.fileId];
  
  return {
    // 元素信息
    element: {
      id: element.id,
      type: element.type,
      position: { x: element.x, y: element.y },
      size: { width: element.width, height: element.height },
      opacity: element.opacity,
      ...element.customData
    },
    // 文件信息
    file: fileData ? {
      id: fileData.id,
      mimeType: fileData.mimeType,
      size: fileData.dataURL.length,
      created: new Date(fileData.created)
    } : null,
    // 图片预览
    preview: fileData?.dataURL.substring(0, 100) + '...'
  };
}
```

### 4. 按图层索引排序

```typescript
function sortLayersByIndex(layers: any[]) {
  return layers.sort((a, b) => {
    const indexA = a.customData?.psdLayerIndex ?? Infinity;
    const indexB = b.customData?.psdLayerIndex ?? Infinity;
    return indexA - indexB;
  });
}
```

### 5. 查找图层

```typescript
// 通过图层名称查找
function findLayerByName(excalidrawAPI: any, layerName: string) {
  const elements = excalidrawAPI.getSceneElements();
  return elements.find(el => 
    el.customData?.layerName === layerName
  );
}

// 通过图层索引查找
function findLayerByIndex(
  excalidrawAPI: any, 
  psdFileId: string, 
  layerIndex: number
) {
  const elements = excalidrawAPI.getSceneElements();
  return elements.find(el =>
    el.customData?.psdFileId === psdFileId &&
    el.customData?.psdLayerIndex === layerIndex
  );
}
```

### 6. 统计信息

```typescript
function getPSDLayersStatistics(excalidrawAPI: any) {
  const psdLayers = getAllPSDLayers(excalidrawAPI);
  
  // 按文件分组
  const byFile = new Map<string, any[]>();
  psdLayers.forEach(layer => {
    const fileId = layer.customData.psdFileId;
    if (!byFile.has(fileId)) {
      byFile.set(fileId, []);
    }
    byFile.get(fileId)!.push(layer);
  });
  
  // 按类型分组
  const byType = {
    pixel: 0,
    text: 0,
    shape: 0,
    group: 0,
    unknown: 0
  };
  
  psdLayers.forEach(layer => {
    const type = layer.customData?.layerType || 'unknown';
    if (type in byType) {
      byType[type as keyof typeof byType]++;
    } else {
      byType.unknown++;
    }
  });
  
  return {
    总图层数: psdLayers.length,
    PSD文件数: byFile.size,
    按文件分组: Object.fromEntries(byFile),
    按类型统计: byType,
    可见图层数: psdLayers.filter(l => l.opacity > 0).length,
    隐藏图层数: psdLayers.filter(l => l.opacity === 0).length
  };
}
```

---

## 存储位置

### 1. 内存存储

PSD图层数据主要存储在Excalidraw的内存状态中：

```typescript
// Excalidraw内部状态结构
{
  elements: [                      // 所有画布元素数组
    { /* PSD图层元素1 */ },
    { /* PSD图层元素2 */ },
    { /* 其他元素 */ }
  ],
  files: {                         // 所有文件对象
    "fileId1": { /* 文件数据1 */ },
    "fileId2": { /* 文件数据2 */ }
  },
  appState: { /* 应用状态 */ }
}
```

### 2. 本地存储（自动保存）

画布数据会自动保存到后端：

```typescript
// 保存到服务器
async function saveCanvas(canvasId: string, data: CanvasData) {
  await fetch(`/api/canvas/${canvasId}/save`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        elements: data.elements,    // 包含PSD图层元素
        files: data.files,           // 包含图片数据
        appState: data.appState
      },
      thumbnail: generateThumbnail()
    })
  });
}
```

### 3. 持久化存储位置

```
服务器文件系统
├── user_data/
│   ├── files/
│   │   └── psd/
│   │       ├── psd_abc123.psd              # 原始PSD文件
│   │       ├── psd_abc123_metadata.json    # PSD元数据
│   │       ├── psd_abc123_layer_0.png      # 图层0图片
│   │       ├── psd_abc123_layer_1.png      # 图层1图片
│   │       └── psd_abc123_thumbnail.jpg    # 缩略图
│   │
│   └── canvas/
│       └── canvas_xyz789.json              # 画布数据（包含PSD图层元素）
```

---

## 数据流转

### 1. PSD上传到画布的完整流程

```
1. 用户上传PSD文件
   ↓
2. 后端解析PSD文件
   - 提取图层信息
   - 生成图层PNG图片
   - 保存元数据
   ↓
3. 前端接收图层数据
   ↓
4. 为每个图层创建Excalidraw元素
   - 创建ImageElement
   - 设置customData
   - 创建BinaryFileData
   ↓
5. 添加到画布
   - excalidrawAPI.addFiles([...])
   - excalidrawAPI.updateScene({ elements: [...] })
   ↓
6. 自动保存到服务器
   - 1秒防抖后触发保存
   - 保存完整的画布数据
```

### 2. 图层数据的读取流程

```
1. 加载画布
   ↓
2. 从服务器获取画布数据
   - GET /api/canvas/{id}
   ↓
3. 解析画布数据
   - 读取elements数组
   - 读取files对象
   ↓
4. 识别PSD图层
   - 检查customData.psdFileId
   - 检查customData.psdLayerIndex
   ↓
5. 恢复到画布
   - 重建Excalidraw场景
   - 显示所有图层
```

### 3. 图层编辑的同步流程

```
1. 用户在画布上编辑图层
   - 移动位置
   - 调整大小
   - 修改透明度
   ↓
2. Excalidraw触发onChange
   ↓
3. 更新元素数据
   - 保持customData不变
   - 更新位置/尺寸/样式
   ↓
4. 自动保存（防抖1秒）
   ↓
5. 可选：同步回PSD源文件
   - 调用智能缩放API
   - 更新原始PSD
```

---

## 关键要点总结

### ✅ 核心存储字段

| 类别 | 字段 | 作用 |
|-----|------|------|
| **身份标识** | `element.id` | 唯一元素ID |
| | `element.fileId` | 关联文件ID |
| | `customData.psdFileId` | 原始PSD文件ID |
| | `customData.psdLayerIndex` | 图层索引 |
| **位置尺寸** | `x, y, width, height` | 画布坐标和尺寸 |
| **视觉样式** | `opacity` | 显示透明度 |
| | `customData.originalOpacity` | 原始透明度 |
| | `customData.blendMode` | 混合模式 |
| **图层信息** | `customData.layerName` | 图层名称 |
| | `customData.layerType` | 图层类型 |
| **图片数据** | `files[fileId].dataURL` | Base64图片 |

### ✅ 判断是否为PSD图层

```typescript
function isPSDLayer(element: any): boolean {
  return !!(
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  );
}
```

### ✅ 获取图层关键信息

```typescript
function getLayerKeyInfo(element: any) {
  if (!isPSDLayer(element)) return null;
  
  return {
    PSD文件ID: element.customData.psdFileId,
    图层索引: element.customData.psdLayerIndex,
    图层名称: element.customData.layerName,
    位置: { x: element.x, y: element.y },
    尺寸: { width: element.width, height: element.height },
    透明度: element.opacity,
    原始透明度: element.customData.originalOpacity,
    混合模式: element.customData.blendMode
  };
}
```

---

## 相关文档

- [Gemini_PSD_缩放API文档.md](./Gemini_PSD_缩放API文档.md)
- [Jaaz图层存储格式说明.md](./Jaaz图层存储格式说明.md)
- [选中图层智能缩放功能说明.md](./选中图层智能缩放功能说明.md)

---

## 更新日志

### v1.0.0 (2024-01)
- 初始版本
- 完整的存储结构说明
- 详细的代码示例
- 数据获取方法汇总

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01  
**维护者**: Jaaz Development Team

