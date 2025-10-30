# Jaaz 图层存储格式说明

## 📋 概述

在 Jaaz 项目中，PSD 文件的图层信息采用**混合存储方式**：
- **元数据**: JSON 格式存储
- **图层图像**: PNG 文件存储
- **数据库**: SQLite 存储模板信息

---

## 🗂️ 存储结构

### 目录结构
```
user_data/
├── files/
│   └── psd/                          # PSD文件存储目录
│       ├── {file_id}.psd            # 原始PSD文件
│       ├── {file_id}_metadata.json  # 图层元数据
│       ├── {file_id}_layer_0.png    # 图层0图像
│       ├── {file_id}_layer_1.png    # 图层1图像
│       ├── {file_id}_layer_2.png    # 图层2图像
│       └── {file_id}_thumbnail.jpg  # 缩略图
└── templates.db                     # 模板数据库
```

---

## 📝 数据格式详解

### 1. 图层元数据 JSON 格式

**文件**: `{file_id}_metadata.json`

**完整数据结构**:
```json
{
  "width": 1920,
  "height": 1080,
  "original_filename": "design.psd",
  "layers": [
    {
      "index": 0,
      "name": "Background",
      "visible": true,
      "opacity": 255,
      "blend_mode": "normal",
      "left": 0,
      "top": 0,
      "width": 1920,
      "height": 1080,
      "parent_index": null,
      "type": "layer",
      "image_url": "http://localhost:58000/api/psd/layer/{file_id}/0"
    },
    {
      "index": 1,
      "name": "Text Layer",
      "visible": true,
      "opacity": 255,
      "blend_mode": "normal",
      "left": 100,
      "top": 200,
      "width": 500,
      "height": 100,
      "parent_index": null,
      "type": "text",
      "image_url": "http://localhost:58000/api/psd/layer/{file_id}/1",
      "font_family": "Arial",
      "font_size": 48,
      "font_weight": "bold",
      "font_style": "normal",
      "text_align": "left",
      "text_color": "#000000",
      "text_content": "Hello World",
      "line_height": 1.2,
      "letter_spacing": 0,
      "text_decoration": "none"
    },
    {
      "index": 2,
      "name": "Group 1",
      "visible": true,
      "opacity": 255,
      "blend_mode": "normal",
      "left": 0,
      "top": 0,
      "width": 800,
      "height": 600,
      "parent_index": null,
      "type": "group",
      "image_url": "http://localhost:58000/api/psd/layer/{file_id}/2"
    },
    {
      "index": 3,
      "name": "Child Layer",
      "visible": true,
      "opacity": 200,
      "blend_mode": "multiply",
      "left": 50,
      "top": 50,
      "width": 300,
      "height": 300,
      "parent_index": 2,
      "type": "layer",
      "image_url": "http://localhost:58000/api/psd/layer/{file_id}/3"
    }
  ]
}
```

---

### 2. 图层字段详解

#### 基础字段（所有图层共有）

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `index` | `number` | 图层索引（唯一标识） | `0` |
| `name` | `string` | 图层名称 | `"Background"` |
| `visible` | `boolean` | 是否可见 | `true` |
| `opacity` | `number` | 不透明度 (0-255) | `255` |
| `blend_mode` | `string` | 混合模式 | `"normal"` |
| `left` | `number` | 左边距（X坐标） | `100` |
| `top` | `number` | 上边距（Y坐标） | `200` |
| `width` | `number` | 图层宽度 | `500` |
| `height` | `number` | 图层高度 | `300` |
| `parent_index` | `number \| null` | 父图层索引 | `null` 或 `2` |
| `type` | `string` | 图层类型 | `"layer"`, `"group"`, `"text"` |
| `image_url` | `string \| null` | 图层图像URL | API地址 |

#### 文字图层特有字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `font_family` | `string` | 字体族 | `"Arial"` |
| `font_size` | `number` | 字体大小 | `48` |
| `font_weight` | `string` | 字体粗细 | `"bold"` |
| `font_style` | `string` | 字体样式 | `"italic"` |
| `text_align` | `string` | 文字对齐 | `"left"`, `"center"`, `"right"` |
| `text_color` | `string` | 文字颜色 | `"#000000"` |
| `text_content` | `string` | 文字内容 | `"Hello World"` |
| `line_height` | `number` | 行高 | `1.2` |
| `letter_spacing` | `number` | 字间距 | `0` |
| `text_decoration` | `string` | 文字装饰 | `"none"`, `"underline"` |

---

### 3. 图层类型说明

#### type: "layer" - 普通图层
- 包含像素内容的标准图层
- 有对应的PNG图像文件
- 支持所有基础属性

#### type: "group" - 组图层
- 用于组织子图层
- 子图层通过`parent_index`关联
- 也会生成合成图像（所有子图层的合成）

#### type: "text" - 文字图层
- 包含文本内容和样式
- 会被转换为位图保存
- 额外包含字体相关属性

---

## 🖼️ 图层图像存储

### PNG 文件命名规则
```
{file_id}_layer_{index}.png
```

**示例**:
```
abc123_layer_0.png    # 图层0的图像
abc123_layer_1.png    # 图层1的图像
abc123_layer_2.png    # 图层2的图像
```

### 图像特性
- **格式**: PNG（支持透明度）
- **颜色模式**: RGBA
- **透明度**: 完整保留
- **尺寸**: 原始图层尺寸

### 图像生成规则
1. **强制可见**: 即使图层隐藏也生成图像（临时设置为可见）
2. **透明度处理**: 使用专门的透明合成函数
3. **空图层检测**: 如果图层完全透明（alpha < 10），不生成图像
4. **组图层合成**: 组图层会合成所有子图层

---

## 🗄️ 模板数据库存储

### 数据库: `templates.db` (SQLite)

#### 表结构

**1. template_categories（模板分类）**
```sql
CREATE TABLE template_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**2. template_items（模板项）**
```sql
CREATE TABLE template_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'psd_file', 'psd_layer', 'image', 'text_style', etc.
    thumbnail_url TEXT,
    preview_url TEXT,
    template_metadata JSON,  -- 存储完整的图层信息
    tags JSON,
    usage_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (category_id) REFERENCES template_categories(id)
);
```

### template_metadata JSON 结构
```json
{
  "psd_file_id": "abc123",
  "original_filename": "design.psd",
  "width": 1920,
  "height": 1080,
  "layers_count": 15,
  "layers_info": [...],  // 完整的图层信息数组
  "file_type": "psd_file",
  "created_from": "auto_upload"
}
```

---

## 🔄 前端数据类型

### TypeScript 接口定义

**文件**: `react/src/api/upload.ts`

```typescript
export interface PSDLayer {
  index: number
  name: string
  visible: boolean
  opacity: number
  blend_mode: string
  left: number
  top: number
  width: number
  height: number
  parent_index: number | null
  type: 'layer' | 'group' | 'text'
  image_url?: string
  
  // 字体相关属性（仅文字图层）
  font_family?: string
  font_size?: number
  font_weight?: string
  font_style?: string
  text_align?: string
  text_color?: string
  text_content?: string
  line_height?: number
  letter_spacing?: number
  text_decoration?: string
}

export interface PSDUploadResponse {
  file_id: string
  url: string
  width: number
  height: number
  layers: PSDLayer[]
  thumbnail_url: string
  template_id?: string
  template_created?: boolean
}
```

---

## 🎨 画布图层格式（Canvas模式）

当使用画布智能缩放功能时，画布图层也有自己的数据格式：

**文件**: `react/src/utils/canvasToPSD.ts`

```typescript
export interface CanvasLayer {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  fileId: string
  dataURL: string  // Base64编码的图片数据
  zIndex: number | string
}

export interface CanvasData {
  width: number
  height: number
  layers: CanvasLayer[]
}
```

### Canvas图层与PSD图层的转换

**画布→PSD**:
```typescript
// 画布图层数据
{
  id: 0,
  name: "Layer_0",
  x: 100,
  y: 200,
  width: 500,
  height: 300,
  opacity: 100,
  dataURL: "data:image/png;base64,iVBORw0KG..."
}

// 转换为PSD图层格式
{
  index: 0,
  name: "Layer_0",
  left: 100,
  top: 200,
  width: 500,
  height: 300,
  opacity: 255,  // 100% → 255
  type: "layer",
  visible: true
}
```

---

## 📡 API 访问方式

### 获取图层元数据
```
GET /api/psd/layers/{file_id}
```

**响应**:
```json
{
  "layers": [...],
  "width": 1920,
  "height": 1080
}
```

### 获取图层图像
```
GET /api/psd/layer/{file_id}/{layer_index}
```

**响应**: PNG图像文件（二进制）

### 获取原始PSD文件
```
GET /api/psd/file/{file_id}
```

**响应**: PSD文件（二进制）

### 更新图层属性
```
PUT /api/psd/layer/{file_id}/{layer_index}
```

**请求体**:
```json
{
  "visible": true,
  "opacity": 200,
  "name": "New Name"
}
```

---

## 🔍 图层处理流程

### 1. PSD上传流程
```
用户上传PSD文件
    ↓
保存原始PSD文件 ({file_id}.psd)
    ↓
使用psd-tools解析PSD
    ↓
递归遍历所有图层
    ↓
为每个图层：
  ├─ 提取基础信息（位置、大小、可见性等）
  ├─ 检测图层类型（layer/group/text）
  ├─ 提取文字属性（如果是文字图层）
  ├─ 生成图层合成图像
  └─ 保存为PNG文件
    ↓
保存元数据JSON
    ↓
生成缩略图
    ↓
自动创建模板（保存到数据库）
    ↓
返回完整信息给前端
```

### 2. 图层图像生成
```python
def _composite_layer_with_transparency(layer):
    """专门的透明合成函数"""
    # 1. 临时设置图层可见
    layer.visible = True
    
    # 2. 使用psd-tools合成图层
    composed = layer.composite()
    
    # 3. 转换为RGBA模式
    if composed.mode != 'RGBA':
        composed = composed.convert('RGBA')
    
    # 4. 检查是否为空图层（alpha < 10）
    if is_empty(composed):
        return None
    
    # 5. 保存为PNG
    composed.save(f'{file_id}_layer_{index}.png')
    
    # 6. 恢复原始可见性
    layer.visible = original_visible
```

### 3. 空图层检测
```python
# 检查alpha通道
img_array = np.array(composed)
has_content = np.any(img_array[:, :, 3] > 10)

if not has_content:
    # 跳过空图层，不生成图像
    layer_info['image_url'] = None
```

---

## 💾 存储优化

### 优势
1. **元数据轻量**: JSON文件小，读取快速
2. **图像独立**: 每个图层独立PNG，支持按需加载
3. **透明度保留**: RGBA格式完整保留透明信息
4. **灵活访问**: 通过API单独访问任何图层
5. **数据库索引**: 模板信息快速检索

### 存储空间估算
```
典型PSD文件 (1920×1080, 10图层):
├─ 原始PSD: ~50 MB
├─ 元数据JSON: ~10 KB
├─ 图层PNG × 10: ~5-20 MB
├─ 缩略图: ~100 KB
└─ 数据库记录: ~1 KB

总计: ~55-70 MB
```

---

## 🔄 图层更新机制

### 图层属性更新
```python
# 更新图层属性
def update_layer_properties(file_id, layer_index, properties):
    # 1. 读取元数据
    metadata = read_metadata(file_id)
    
    # 2. 更新指定图层
    metadata['layers'][layer_index].update(properties)
    
    # 3. 保存元数据
    save_metadata(file_id, metadata)
    
    # 4. 如果需要重新生成图像
    if needs_regenerate(properties):
        regenerate_layer_image(file_id, layer_index)
```

### 图层排序更新
```python
# 重新排序图层
def reorder_layers(file_id, new_order):
    # 1. 读取元数据
    metadata = read_metadata(file_id)
    
    # 2. 按新顺序重组图层
    layers = metadata['layers']
    reordered = [layers[i] for i in new_order]
    
    # 3. 更新索引
    for i, layer in enumerate(reordered):
        layer['index'] = i
    
    # 4. 保存
    metadata['layers'] = reordered
    save_metadata(file_id, metadata)
```

---

## 🎯 使用示例

### 前端：加载和显示图层
```typescript
// 1. 上传PSD
const response = await uploadPSD(file)
const psdData: PSDUploadResponse = response

// 2. 访问图层信息
psdData.layers.forEach(layer => {
  console.log(`图层 ${layer.index}: ${layer.name}`)
  console.log(`  类型: ${layer.type}`)
  console.log(`  位置: (${layer.left}, ${layer.top})`)
  console.log(`  尺寸: ${layer.width} × ${layer.height}`)
  console.log(`  图像: ${layer.image_url}`)
})

// 3. 显示图层图像
const imgElement = document.createElement('img')
imgElement.src = layer.image_url
document.body.appendChild(imgElement)

// 4. 更新图层属性
await updateLayerProperties(psdData.file_id, layer.index, {
  visible: false,
  opacity: 200
})
```

### 后端：读取图层数据
```python
# 1. 读取元数据
metadata_path = f'{PSD_DIR}/{file_id}_metadata.json'
with open(metadata_path, 'r') as f:
    metadata = json.load(f)

# 2. 访问图层
for layer in metadata['layers']:
    print(f"图层 {layer['index']}: {layer['name']}")
    print(f"  类型: {layer['type']}")
    
    # 3. 读取图层图像
    if layer.get('image_url'):
        image_path = f"{PSD_DIR}/{file_id}_layer_{layer['index']}.png"
        img = Image.open(image_path)
        print(f"  图像尺寸: {img.size}")
```

---

## 📊 数据流向图

```
┌─────────────┐
│  PSD 文件   │
└──────┬──────┘
       │ 上传
       ▼
┌─────────────────────────┐
│  psd-tools 解析         │
│  ├─ 提取图层信息        │
│  ├─ 生成图层图像        │
│  └─ 生成缩略图          │
└──────┬──────────────────┘
       │
       ├──────────┬─────────────┐
       ▼          ▼             ▼
┌──────────┐ ┌─────────┐ ┌────────────┐
│ 原始PSD  │ │ 元数据  │ │ 图层PNG    │
│ .psd     │ │ .json   │ │ _layer_*.png│
└──────────┘ └─────────┘ └────────────┘
       │          │             │
       └──────────┴─────────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │  自动创建模板        │
       │  ├─ template_items  │
       │  └─ template_metadata│
       └──────────┬──────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │  返回给前端          │
       │  PSDUploadResponse  │
       └─────────────────────┘
```

---

## 🔐 安全考虑

1. **文件ID**: 使用UUID或nanoid生成，避免路径遍历攻击
2. **文件验证**: 上传前验证文件类型和大小
3. **API权限**: 限制文件访问权限（目前localhost）
4. **数据清理**: 定期清理未使用的文件
5. **输入验证**: 验证所有图层属性更新

---

## 🎓 总结

Jaaz 的图层存储采用了**高效且灵活**的混合方案：

✅ **JSON元数据** - 快速读取和修改  
✅ **独立PNG图像** - 按需加载，支持透明度  
✅ **SQLite数据库** - 模板快速检索  
✅ **完整保留** - 原始PSD文件完整保存  
✅ **类型完整** - 支持普通图层、组图层、文字图层  
✅ **父子关系** - 完整保留图层层级结构  

这种设计既保证了**性能**，又提供了**灵活性**，非常适合图层编辑和管理的场景。

---

**文档版本**: v1.0  
**更新时间**: 2025-10-29  
**适用版本**: Jaaz v1.0.30+





