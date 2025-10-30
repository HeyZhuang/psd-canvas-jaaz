# Gemini API PSD图层智能缩放 - 完整技术文档

## 📋 目录

- [概述](#概述)
- [API端点](#api端点)
- [请求参数](#请求参数)
- [PSD图层信息结构](#psd图层信息结构)
- [Gemini Prompt结构](#gemini-prompt结构)
- [API调用配置](#api调用配置)
- [响应格式](#响应格式)
- [代码示例](#代码示例)
- [从画布获取图层信息](#从画布获取图层信息)
- [关键数据摘要](#关键数据摘要)
- [最佳实践](#最佳实践)

---

## 概述

本文档详细说明如何使用 Gemini AI API 进行 PSD 文件图层的智能缩放。该功能支持：

- ✅ 整个PSD文件智能缩放
- ✅ 选中特定图层进行缩放
- ✅ 保持图层视觉关系和设计美学
- ✅ 自动避免元素重叠
- ✅ 智能调整文字大小和位置

---

## API端点

### 1. 选中图层智能缩放 (推荐)

适用于只缩放PSD中部分选中的图层。

```http
POST /api/psd/resize/resize-selected-layers
```

**特点**：
- 只处理选中的图层
- 保持未选中图层不变
- 适合局部调整设计

### 2. 整个PSD文件缩放

适用于缩放整个PSD文件的所有图层。

```http
POST /api/psd/resize/resize-by-id
```

**特点**：
- 处理所有可见图层
- 整体重新布局
- 适合完整设计调整

### 3. 分层输出模式

保留图层结构的缩放模式。

```http
POST /api/psd/resize/resize-by-id-layered
```

**特点**：
- 返回独立的图层文件
- 保持图层元数据
- 适合需要后期编辑的场景

---

## 请求参数

### 选中图层缩放参数

```typescript
interface SelectedLayersResizeRequest {
  file_id: string          // PSD文件ID（必填）
  target_width: number     // 目标宽度，像素（必填）
  target_height: number    // 目标高度，像素（必填）
  layer_indices: string    // JSON数组字符串，选中的图层索引（必填）
                          // 例如: "[0, 2, 5, 8]"
  api_key?: string        // Gemini API密钥（可选）
                          // 不提供时使用环境变量中的密钥
}
```

**示例**：
```javascript
const formData = new FormData();
formData.append('file_id', 'psd_abc123');
formData.append('target_width', '1080');
formData.append('target_height', '1080');
formData.append('layer_indices', '[0, 2, 5]');
formData.append('api_key', 'your-gemini-api-key');  // 可选
```

### 整个PSD缩放参数

```typescript
interface FullPSDResizeRequest {
  file_id: string          // PSD文件ID（必填）
  target_width: number     // 目标宽度，像素（必填）
  target_height: number    // 目标高度，像素（必填）
  api_key?: string        // Gemini API密钥（可选）
}
```

---

## PSD图层信息结构

### 完整图层数据结构

发送给Gemini API的图层信息遵循以下结构：

```typescript
interface PSDLayerInfo {
  // 基本信息
  id: number                    // 图层ID（从0开始）
  name: string                  // 图层名称
  type: LayerType              // 图层类型
  level: number                // 图层层级（嵌套深度，0表示根层级）
  visible: boolean             // 可见性
  
  // 位置和尺寸信息
  left: number                 // 左边界坐标（像素）
  top: number                  // 上边界坐标（像素）
  right: number                // 右边界坐标（像素）
  bottom: number               // 下边界坐标（像素）
  width: number                // 宽度（像素）
  height: number               // 高度（像素）
  
  // 样式信息
  opacity: number              // 透明度 (0-255)
  blend_mode: string           // 混合模式 (normal, multiply, screen等)
  
  // 父子关系
  parent_index: number | null  // 父图层索引（null表示根层级）
  
  // 文字图层专属属性（仅当 type === 'text'）
  font_family?: string         // 字体名称
  font_size?: number           // 字体大小（点）
  font_weight?: string         // 字体粗细 (normal, bold等)
  font_style?: string          // 字体样式 (normal, italic等)
  text_align?: string          // 文字对齐 (left, center, right等)
  text_color?: string          // 文字颜色（十六进制）
  text_content?: string        // 文字内容
  line_height?: number         // 行高
  letter_spacing?: number      // 字间距
  text_decoration?: string     // 文字装饰 (none, underline等)
}

type LayerType = 
  | 'pixel'     // 像素图层（普通图片）
  | 'text'      // 文字图层
  | 'shape'     // 形状图层
  | 'group'     // 图层组
```

### 图层信息示例

```json
[
  {
    "id": 0,
    "name": "背景",
    "type": "pixel",
    "level": 0,
    "visible": true,
    "left": 0,
    "top": 0,
    "right": 1920,
    "bottom": 1080,
    "width": 1920,
    "height": 1080,
    "opacity": 255,
    "blend_mode": "normal",
    "parent_index": null
  },
  {
    "id": 1,
    "name": "产品图片",
    "type": "pixel",
    "level": 0,
    "visible": true,
    "left": 500,
    "top": 200,
    "right": 1420,
    "bottom": 900,
    "width": 920,
    "height": 700,
    "opacity": 255,
    "blend_mode": "normal",
    "parent_index": null
  },
  {
    "id": 2,
    "name": "标题文字",
    "type": "text",
    "level": 0,
    "visible": true,
    "left": 100,
    "top": 50,
    "right": 800,
    "bottom": 150,
    "width": 700,
    "height": 100,
    "opacity": 255,
    "blend_mode": "normal",
    "parent_index": null,
    "font_family": "Arial",
    "font_size": 48,
    "font_weight": "bold",
    "text_color": "#FFFFFF",
    "text_content": "产品标题",
    "text_align": "left"
  }
]
```

---

## Gemini Prompt结构

### 提示词模板

发送给Gemini的完整提示词包含以下部分：

```markdown
# PSD 圖層智能縮放任務

## 🎯 任務目標
將 PSD 文件從原始尺寸 {original_width}x{original_height} 智能縮放至目標尺寸 {target_width}x{target_height}，保持設計的視覺平衡、專業性和可讀性。

## 📊 原始圖層信息
```
{圖層信息表格}
```

## 🔧 縮放規則與策略

### 1. 核心原則
- **等比例縮放**: 所有圖層必須保持原始比例，不得變形
- **邊界限制**: 調整後的圖層不得超出目標畫布範圍
- **視覺層次**: 保持圖層間的視覺層次關係和重要性
- **內容完整性**: 確保所有重要內容完整可見
- **避免重疊**: 特別注意文字與產品/圖像之間的重疊問題
- **美學平衡**: 保持整體設計的美觀和專業性

### 2. 圖層類型處理策略

#### 🖼️ 背景圖層 (Background/Pixel)
- 根據目標尺寸進行居中裁切或等比縮放
- 保持視覺焦點在畫布內

#### 📝 文字圖層 (Text)
- 最高優先級，確保完全可見
- 根據畫布縮放比例調整字體大小
- 避免與其他元素重疊，保持可讀性

#### 🛍️ 產品圖像 (Product)
- 確保產品完整展示，不被裁切
- 嚴格保持原始寬高比
- 重新定位避免與文字重疊

#### 🎨 裝飾元素 (Decoration/Shape)
- 次要優先級，保證主要內容前提下調整
- 等比例縮放至合適大小
- 保持與主要元素的相對位置關係

### 3. 智能調整算法

#### 📏 縮放比例計算
```
縮放比例 = min(目標寬度/原始寬度, 目標高度/原始高度)
```

#### 🎯 位置調整策略
1. **中心對齊**: 主要元素優先居中對齊
2. **邊距保持**: 保持適當的邊距比例
3. **重疊檢測**: 自動檢測並避免元素重疊
4. **視覺平衡**: 確保整體視覺平衡

## 📋 輸出格式要求

請為每個圖層提供新的坐標信息，使用以下JSON格式：

```json
[
  {
    "id": 圖層ID,
    "name": "圖層名稱",
    "type": "圖層類型",
    "level": 圖層層級,
    "visible": true/false,
    "original_coords": {
      "left": 原始左邊界,
      "top": 原始上邊界,
      "right": 原始右邊界,
      "bottom": 原始下邊界
    },
    "new_coords": {
      "left": 新左邊界,
      "top": 新上邊界,
      "right": 新右邊界,
      "bottom": 新下邊界
    },
    "adjustment_notes": "說明此調整的原因以及如何確保視覺效果",
    "precautions": "需要人工檢查的潛在問題"
  }
]
```

**重要**: 請直接輸出JSON數組，不要添加markdown代碼塊標記。
```

### 图层信息表格格式

图层信息在Prompt中以表格形式呈现：

```
ID | 名称          | 类型   | 层级 | 可见 | 坐标(L,T,R,B)          | 尺寸(WxH)      | 透明度 | 混合模式
-- | ------------- | ------ | ---- | ---- | ---------------------- | -------------- | ------ | --------
0  | 背景          | pixel  | 0    | ✓    | (0,0,1920,1080)       | 1920x1080     | 255    | normal
1  | 产品图片      | pixel  | 0    | ✓    | (500,200,1420,900)    | 920x700       | 255    | normal
2  | 标题文字      | text   | 0    | ✓    | (100,50,800,150)      | 700x100       | 255    | normal
3  | 价格标签      | text   | 0    | ✓    | (100,950,400,1050)    | 300x100       | 255    | normal
```

---

## API调用配置

### Gemini模型配置

```python
# 模型选择
model_name = "gemini-2.5-pro"     # 高质量，推荐用于重要设计
# 或
model_name = "gemini-1.5-flash"   # 更快速度，适合快速迭代

# API调用参数
config = {
    "temperature": 0.1,           # 低温度确保稳定输出（0.0-1.0）
    "max_output_tokens": 32000,   # 最大输出token数
    "timeout": 480                # 超时时间（秒），默认8分钟
}
```

### API调用流程

```python
from google import genai
from google.genai import types
import base64

# 1. 初始化客户端
client = genai.Client(api_key="your-api-key")

# 2. 准备内容（文本提示词 + 检测框图像）
contents = [
    types.Content(
        role="user",
        parts=[
            types.Part.from_text(text=prompt),
            types.Part.from_bytes(
                data=base64.b64decode(image_base64),
                mime_type="image/png"
            )
        ],
    ),
]

# 3. 配置生成参数
generate_content_config = types.GenerateContentConfig(
    temperature=0.1,
    max_output_tokens=32000,
)

# 4. 调用API（流式响应）
response_text = ""
for chunk in client.models.generate_content_stream(
    model="gemini-2.5-pro",
    contents=contents,
    config=generate_content_config,
):
    if chunk.text:
        response_text += chunk.text

# 5. 解析JSON响应
import json
new_positions = json.loads(response_text)
```

---

## 响应格式

### API响应结构

#### 1. 选中图层缩放响应

```typescript
interface SelectedLayersResizeResponse {
  success: boolean                  // 是否成功
  file_id: string                   // 缩放后的文件ID
  original_size: {
    width: number                   // 原始宽度
    height: number                  // 原始高度
  }
  target_size: {
    width: number                   // 目标宽度
    height: number                  // 目标高度
  }
  layers: Array<{                   // 处理的图层详情
    layer_index: number             // 图层索引
    layer_name: string              // 图层名称
    original_bounds: {              // 原始边界
      left: number
      top: number
      right: number
      bottom: number
    }
    new_bounds: {                   // 新边界
      left: number
      top: number
      right: number
      bottom: number
    }
    width: number                   // 缩放后宽度
    height: number                  // 缩放后高度
    image_url: string               // 图层图片URL
  }>
  count: number                     // 处理的图层数量
}
```

#### 2. 整个PSD缩放响应

```typescript
interface FullPSDResizeResponse {
  success: boolean
  file_id: string                   // 缩放后的文件ID
  original_file_id: string          // 原始PSD文件ID
  original_size: {
    width: number
    height: number
  }
  target_size: {
    width: number
    height: number
  }
  layers_count: number              // 处理的图层总数
  output_url: string                // 输出文件URL
  metadata_url: string              // 元数据JSON URL
  new_positions: Array<{            // Gemini返回的新位置信息
    id: number
    name: string
    type: string
    level: number
    visible: boolean
    original_coords: {
      left: number
      top: number
      right: number
      bottom: number
    }
    new_coords: {
      left: number
      top: number
      right: number
      bottom: number
    }
    adjustment_notes: string        // 调整说明
    precautions: string             // 注意事项
  }>
}
```

### Gemini返回的JSON格式

```json
[
  {
    "id": 0,
    "name": "背景",
    "type": "pixel",
    "level": 0,
    "visible": true,
    "original_coords": {
      "left": 0,
      "top": 0,
      "right": 1920,
      "bottom": 1080
    },
    "new_coords": {
      "left": 0,
      "top": 0,
      "right": 1080,
      "bottom": 1080
    },
    "adjustment_notes": "背景图层居中裁切以适应正方形画布，保持视觉焦点在中心",
    "precautions": "检查主要视觉元素是否在裁切范围内"
  },
  {
    "id": 1,
    "name": "产品图片",
    "type": "pixel",
    "level": 0,
    "visible": true,
    "original_coords": {
      "left": 500,
      "top": 200,
      "right": 1420,
      "bottom": 900
    },
    "new_coords": {
      "left": 200,
      "top": 150,
      "right": 880,
      "bottom": 750
    },
    "adjustment_notes": "产品图片等比缩放至约74%（920->680px宽），并重新定位至画布中心，确保完整显示",
    "precautions": "检查产品细节是否清晰可见，是否需要进一步优化位置"
  },
  {
    "id": 2,
    "name": "标题文字",
    "type": "text",
    "level": 0,
    "visible": true,
    "original_coords": {
      "left": 100,
      "top": 50,
      "right": 800,
      "bottom": 150
    },
    "new_coords": {
      "left": 90,
      "top": 50,
      "right": 540,
      "bottom": 120
    },
    "adjustment_notes": "标题文字等比缩放至约64%（700->450px宽），保持顶部位置，确保可读性",
    "precautions": "确认文字大小在目标尺寸下仍然清晰可读"
  }
]
```

---

## 代码示例

### 前端调用示例

#### 1. 选中图层缩放

```typescript
import { useCanvas } from '@/contexts/canvas';

// 获取选中的PSD图层信息
function getSelectedPSDLayersInfo(excalidrawAPI: any) {
  const appState = excalidrawAPI.getAppState();
  const elements = excalidrawAPI.getSceneElements();
  const selectedIds = appState.selectedElementIds;
  
  // 筛选选中的PSD图层
  const selectedPSDElements = elements.filter(element =>
    selectedIds[element.id] &&
    element.customData?.psdFileId &&
    element.customData?.psdLayerIndex !== undefined
  );
  
  if (selectedPSDElements.length === 0) {
    return null;
  }
  
  return {
    psdFileId: selectedPSDElements[0].customData.psdFileId,
    selectedLayerIndices: selectedPSDElements.map(
      el => el.customData.psdLayerIndex
    ),
    layers: selectedPSDElements.map(element => ({
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
      blendMode: element.customData.blendMode
    }))
  };
}

// 执行缩放
async function resizeSelectedLayers(
  targetWidth: number,
  targetHeight: number,
  apiKey?: string
) {
  const { excalidrawAPI } = useCanvas();
  const psdInfo = getSelectedPSDLayersInfo(excalidrawAPI);
  
  if (!psdInfo) {
    console.error('未选中任何PSD图层');
    return null;
  }
  
  console.log('准备缩放的图层:', {
    PSD文件ID: psdInfo.psdFileId,
    选中图层数: psdInfo.selectedLayerIndices.length,
    图层索引: psdInfo.selectedLayerIndices,
    目标尺寸: `${targetWidth}x${targetHeight}`
  });
  
  const formData = new FormData();
  formData.append('file_id', psdInfo.psdFileId);
  formData.append('target_width', targetWidth.toString());
  formData.append('target_height', targetHeight.toString());
  formData.append('layer_indices', JSON.stringify(psdInfo.selectedLayerIndices));
  
  if (apiKey) {
    formData.append('api_key', apiKey);
  }
  
  try {
    const response = await fetch('/api/psd/resize/resize-selected-layers', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API错误: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('缩放完成:', result);
    
    return result;
  } catch (error) {
    console.error('缩放失败:', error);
    throw error;
  }
}

// 使用示例
async function handleResize() {
  try {
    const result = await resizeSelectedLayers(1080, 1080);
    
    if (result.success) {
      console.log(`成功缩放 ${result.count} 个图层`);
      // 处理缩放后的图层...
      result.layers.forEach(layer => {
        console.log(`图层 ${layer.layer_name}:`, {
          原始尺寸: layer.original_bounds,
          新尺寸: layer.new_bounds,
          图片URL: layer.image_url
        });
      });
    }
  } catch (error) {
    console.error('缩放失败:', error);
  }
}
```

#### 2. 整个PSD缩放

```typescript
async function resizeFullPSD(
  psdFileId: string,
  targetWidth: number,
  targetHeight: number,
  apiKey?: string
) {
  const formData = new FormData();
  formData.append('file_id', psdFileId);
  formData.append('target_width', targetWidth.toString());
  formData.append('target_height', targetHeight.toString());
  
  if (apiKey) {
    formData.append('api_key', apiKey);
  }
  
  try {
    const response = await fetch('/api/psd/resize/resize-by-id', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('PSD缩放完成:', result);
    
    return result;
  } catch (error) {
    console.error('PSD缩放失败:', error);
    throw error;
  }
}

// 使用示例
async function handleFullPSDResize() {
  const result = await resizeFullPSD('psd_abc123', 1080, 1920);
  
  if (result.success) {
    console.log('输出文件URL:', result.output_url);
    console.log('元数据URL:', result.metadata_url);
    console.log('处理的图层数:', result.layers_count);
  }
}
```

### 后端处理示例

```python
from fastapi import APIRouter, Form, HTTPException
from services.gemini_psd_resize_service import GeminiPSDResizeService
from utils.psd_layer_info import get_psd_layers_info, draw_detection_boxes

router = APIRouter()

@router.post("/resize-selected-layers")
async def resize_selected_layers(
    file_id: str = Form(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    layer_indices: str = Form(...),
    api_key: Optional[str] = Form(None)
):
    """处理选中图层的缩放"""
    
    # 1. 解析图层索引
    import json
    selected_indices = json.loads(layer_indices)
    
    # 2. 加载PSD文件
    psd_path = f"uploads/psd/{file_id}.psd"
    psd, all_layers_info = get_psd_layers_info(psd_path)
    
    # 3. 筛选选中的图层
    selected_layers = [
        layer for layer in all_layers_info 
        if layer['index'] in selected_indices
    ]
    
    # 4. 生成检测框图像
    detection_image_path = f"temp/detection_{file_id}.png"
    draw_detection_boxes(psd, selected_layers, detection_image_path)
    
    # 5. 调用Gemini API
    service = GeminiPSDResizeService(api_key=api_key)
    new_positions = await service.resize_selected_layers(
        layers_info=selected_layers,
        detection_image_path=detection_image_path,
        original_width=psd.width,
        original_height=psd.height,
        target_width=target_width,
        target_height=target_height
    )
    
    # 6. 应用新位置并生成输出
    output_layers = []
    for layer_info, new_pos in zip(selected_layers, new_positions):
        # 提取图层并应用新位置
        resized_layer = apply_new_position(layer_info, new_pos)
        output_layers.append(resized_layer)
    
    # 7. 返回结果
    return {
        "success": True,
        "layers": output_layers,
        "count": len(output_layers)
    }
```

---

## 从画布获取图层信息

### 获取所有PSD图层

```typescript
function getAllPSDLayersFromCanvas(excalidrawAPI: any) {
  if (!excalidrawAPI) return [];
  
  const elements = excalidrawAPI.getSceneElements();
  
  // 筛选PSD图层
  const psdElements = elements.filter(element => 
    element.customData?.psdFileId && 
    element.customData?.psdLayerIndex !== undefined
  );
  
  return psdElements.map(element => ({
    // 基本信息
    elementId: element.id,
    type: element.type,
    
    // PSD图层信息
    psdFileId: element.customData.psdFileId,
    psdLayerIndex: element.customData.psdLayerIndex,
    layerName: element.customData.layerName,
    
    // 位置和尺寸
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    
    // 样式属性
    opacity: element.opacity,
    originalOpacity: element.customData.originalOpacity,
    blendMode: element.customData.blendMode,
    
    // 状态
    visible: element.opacity > 0 && !element.isDeleted,
    isDeleted: element.isDeleted,
    
    // 原始元素
    element: element
  }));
}
```

### 获取特定PSD文件的图层

```typescript
function getPSDLayersByFileId(excalidrawAPI: any, psdFileId: string) {
  const allPSDLayers = getAllPSDLayersFromCanvas(excalidrawAPI);
  return allPSDLayers.filter(layer => layer.psdFileId === psdFileId);
}
```

### 获取选中的PSD图层

```typescript
function getSelectedPSDLayers(excalidrawAPI: any) {
  if (!excalidrawAPI) return [];
  
  const appState = excalidrawAPI.getAppState();
  const elements = excalidrawAPI.getSceneElements();
  const selectedIds = appState.selectedElementIds;
  
  return elements
    .filter(element =>
      selectedIds[element.id] &&
      element.customData?.psdFileId &&
      element.customData?.psdLayerIndex !== undefined
    )
    .map(element => ({
      elementId: element.id,
      psdFileId: element.customData.psdFileId,
      psdLayerIndex: element.customData.psdLayerIndex,
      layerName: element.customData.layerName,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      opacity: element.opacity,
      element: element
    }));
}
```

### 按PSD文件分组

```typescript
function groupPSDLayersByFile(excalidrawAPI: any) {
  const allLayers = getAllPSDLayersFromCanvas(excalidrawAPI);
  const grouped = new Map<string, typeof allLayers>();
  
  allLayers.forEach(layer => {
    if (!grouped.has(layer.psdFileId)) {
      grouped.set(layer.psdFileId, []);
    }
    grouped.get(layer.psdFileId)!.push(layer);
  });
  
  return grouped;
}
```

---

## 关键数据摘要

### 必需参数清单

| 参数类别 | 参数名 | 类型 | 说明 | 示例 |
|---------|--------|------|------|------|
| **文件信息** | `file_id` | string | PSD文件唯一标识 | `"psd_abc123"` |
| | `original_width` | number | 原始宽度（像素） | `1920` |
| | `original_height` | number | 原始高度（像素） | `1080` |
| | `target_width` | number | 目标宽度（像素） | `1080` |
| | `target_height` | number | 目标高度（像素） | `1080` |
| **图层选择** | `layer_indices` | string | 选中图层索引JSON数组 | `"[0,2,5]"` |
| **认证** | `api_key` | string | Gemini API密钥（可选） | `"AIza..."` |

### 图层信息关键字段

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `id` | number | ✓ | 图层ID（从0开始） |
| `name` | string | ✓ | 图层名称 |
| `type` | string | ✓ | 图层类型（pixel/text/shape/group） |
| `left` | number | ✓ | 左边界坐标 |
| `top` | number | ✓ | 上边界坐标 |
| `right` | number | ✓ | 右边界坐标 |
| `bottom` | number | ✓ | 下边界坐标 |
| `width` | number | ✓ | 宽度 |
| `height` | number | ✓ | 高度 |
| `visible` | boolean | ✓ | 可见性 |
| `opacity` | number | ✓ | 透明度（0-255） |
| `blend_mode` | string | ✓ | 混合模式 |
| `font_family` | string | - | 字体（仅文字图层） |
| `font_size` | number | - | 字体大小（仅文字图层） |
| `text_content` | string | - | 文字内容（仅文字图层） |

### Canvas元素的customData结构

画布中PSD图层元素的`customData`包含：

```typescript
interface PSDLayerCustomData {
  psdFileId: string           // PSD文件ID
  psdLayerIndex: number       // 图层索引
  layerName: string          // 图层名称
  originalOpacity: number    // 原始透明度（0-255）
  blendMode: string          // 混合模式
  visible?: boolean          // 可见性（可选）
}
```

---

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 推荐：选中特定图层缩放
// 只处理需要调整的图层，速度更快
await resizeSelectedLayers(1080, 1080);

// ❌ 避免：频繁全量缩放
// 处理所有图层，耗时较长
await resizeFullPSD('psd_id', 1080, 1080);
```

### 2. 错误处理

```typescript
async function safeResize(targetWidth: number, targetHeight: number) {
  try {
    // 1. 验证输入
    if (targetWidth < 100 || targetWidth > 4000) {
      throw new Error('目标宽度必须在100-4000之间');
    }
    
    if (targetHeight < 100 || targetHeight > 4000) {
      throw new Error('目标高度必须在100-4000之间');
    }
    
    // 2. 检查选中的图层
    const psdInfo = getSelectedPSDLayersInfo(excalidrawAPI);
    if (!psdInfo || psdInfo.selectedLayerIndices.length === 0) {
      throw new Error('请先选中至少一个PSD图层');
    }
    
    // 3. 执行缩放（带超时控制）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3分钟
    
    const result = await resizeSelectedLayers(
      targetWidth,
      targetHeight
    );
    
    clearTimeout(timeoutId);
    return result;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('缩放超时，请稍后重试');
    } else {
      console.error('缩放失败:', error);
    }
    throw error;
  }
}
```

### 3. 用户体验优化

```typescript
async function resizeWithProgress(
  targetWidth: number,
  targetHeight: number,
  onProgress?: (progress: number, message: string) => void
) {
  try {
    // 步骤1: 验证和准备
    onProgress?.(10, '正在验证图层信息...');
    const psdInfo = getSelectedPSDLayersInfo(excalidrawAPI);
    
    // 步骤2: 调用API
    onProgress?.(30, '正在调用Gemini API分析（可能需要1-2分钟）...');
    const result = await resizeSelectedLayers(targetWidth, targetHeight);
    
    // 步骤3: 处理结果
    onProgress?.(80, '正在处理缩放结果...');
    // ... 处理返回的图层
    
    // 步骤4: 完成
    onProgress?.(100, '缩放完成！');
    return result;
    
  } catch (error) {
    onProgress?.(0, `缩放失败: ${error.message}`);
    throw error;
  }
}
```

### 4. API密钥管理

```typescript
// ✅ 推荐：从环境变量或安全存储读取
const apiKey = process.env.GEMINI_API_KEY;

// ❌ 避免：硬编码API密钥
// const apiKey = "AIzaSyD..."; // 不安全！

// ✅ 推荐：提供用户输入选项（临时使用）
async function resizeWithUserKey(
  targetWidth: number,
  targetHeight: number,
  userProvidedKey?: string
) {
  const apiKey = userProvidedKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('请提供Gemini API密钥或配置环境变量');
  }
  
  // 使用密钥进行缩放...
}
```

### 5. 缓存和优化

```typescript
// 缓存已处理的结果，避免重复调用
const resizeCache = new Map<string, any>();

function getCacheKey(
  psdFileId: string,
  layerIndices: number[],
  targetWidth: number,
  targetHeight: number
) {
  return `${psdFileId}_${layerIndices.join(',')}_${targetWidth}x${targetHeight}`;
}

async function cachedResize(
  psdFileId: string,
  layerIndices: number[],
  targetWidth: number,
  targetHeight: number
) {
  const cacheKey = getCacheKey(psdFileId, layerIndices, targetWidth, targetHeight);
  
  // 检查缓存
  if (resizeCache.has(cacheKey)) {
    console.log('使用缓存的结果');
    return resizeCache.get(cacheKey);
  }
  
  // 执行缩放
  const result = await resizeSelectedLayers(targetWidth, targetHeight);
  
  // 存入缓存（设置合理的缓存大小限制）
  if (resizeCache.size > 50) {
    const firstKey = resizeCache.keys().next().value;
    resizeCache.delete(firstKey);
  }
  
  resizeCache.set(cacheKey, result);
  return result;
}
```

### 6. 批量处理建议

```typescript
// 推荐的图层数量范围
const RECOMMENDED_LAYERS = {
  MIN: 1,
  MAX: 15,        // 单次处理最多15个图层
  OPTIMAL: 5      // 最佳处理数量5个图层
};

function validateLayerCount(count: number) {
  if (count < RECOMMENDED_LAYERS.MIN) {
    throw new Error('请至少选中1个图层');
  }
  
  if (count > RECOMMENDED_LAYERS.MAX) {
    console.warn(
      `选中了 ${count} 个图层，可能需要较长处理时间。` +
      `建议分批处理，每批不超过 ${RECOMMENDED_LAYERS.MAX} 个图层。`
    );
  }
  
  return true;
}
```

---

## 相关文档

- [选中图层智能缩放功能说明.md](./选中图层智能缩放功能说明.md)
- [画布智能缩放快速指南.md](./画布智能缩放快速指南.md)
- [Jaaz图层存储格式说明.md](./Jaaz图层存储格式说明.md)
- [智能缩放核心代码文件清单.md](./智能缩放核心代码文件清单.md)

---

## 更新日志

### v1.0.0 (2024-01)
- 初始版本
- 支持选中图层智能缩放
- 支持整个PSD文件缩放
- Gemini 2.5 Pro集成
- 完整的API文档

---

## 技术支持

如有问题或建议，请参考：
1. 检查API密钥配置是否正确
2. 验证图层信息格式是否符合规范
3. 查看后端日志了解详细错误信息
4. 参考相关文档了解功能详情

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01  
**维护者**: Jaaz Development Team

