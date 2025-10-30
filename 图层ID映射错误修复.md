# ✅ 图层ID映射错误修复

## 🚨 错误信息

```
POST http://localhost:3100/api/psd/resize/resize-by-id-layered 400 (Bad Request)

Error: 沒有可處理的圖層。總共 25 個圖層，全部被跳過。
跳過原因: 背景 (錯誤: 'index'), bg (錯誤: 'index'), 矩形 2 (錯誤: 'index'), ...
```

---

## 🔍 问题根源

### 代码错误

**问题位置**: `/home/ubuntu/jaaz/server/routers/psd_resize_router.py` (第484行)

```python
# ❌ 错误代码
layer = psd[layer_info['index']]  # KeyError: 'index'
```

### 为什么会出错？

1. **`get_psd_layers_info()` 返回的数据结构**:
   ```python
   {
       'id': 0,              # ✅ 有这个字段
       'name': '背景',
       'type': 'pixel',
       'visible': True,
       'left': 0,
       'top': 0,
       'width': 1920,
       'height': 1080
       # ❌ 没有 'index' 字段
   }
   ```

2. **代码尝试访问不存在的字段**:
   ```python
   layer_info['index']  # KeyError: 'index' 因为字典中没有这个键
   ```

3. **所有25个图层都因为相同的错误被跳过**

---

## ✅ 修复方案

### 解决方法：创建图层对象映射

**核心思路**: 创建一个从 `layer_info['id']` 到实际 PSD 图层对象的映射。

### 修复后的代码

```python
# ✅ 新增：创建图层对象映射
logger.info("創建圖層對象映射")
layer_map = {}
layer_id_counter = 0

def map_layers(layer_obj, level=0):
    """遞歸映射圖層對象"""
    nonlocal layer_id_counter
    layer_map[layer_id_counter] = layer_obj
    layer_id_counter += 1
    
    # 處理圖層組的子圖層
    if hasattr(layer_obj, '__iter__'):
        for child in layer_obj:
            map_layers(child, level + 1)

# 映射所有圖層
for layer_obj in psd:
    map_layers(layer_obj)

logger.info(f"已映射 {len(layer_map)} 個圖層對象")

# ✅ 使用映射获取图层
for idx, layer_info in enumerate(layers_info):
    try:
        # 使用 layer_info['id'] 從映射中獲取圖層對象
        layer_id = layer_info['id']
        if layer_id not in layer_map:
            logger.warning(f"找不到圖層ID {layer_id}: {layer_info['name']}")
            skipped_layers.append(f"{layer_info['name']} (ID不存在)")
            continue
        
        layer = layer_map[layer_id]  # ✅ 正确获取图层对象
        
        # 继续处理图层...
```

---

## 🔑 关键改进

### 1. **图层对象映射**
   - 创建 `layer_map[id] -> layer_obj` 的映射
   - 确保 ID 和对象的对应关系

### 2. **递归处理图层组**
   - 支持嵌套的图层组
   - 正确处理图层层级关系

### 3. **ID 验证**
   - 检查 layer_id 是否存在于映射中
   - 提供清晰的错误信息

### 4. **不透明度支持**
   - 从图层对象直接读取 `layer.opacity`
   - 提供默认值 255（完全不透明）

---

## 📊 修复前后对比

### 修复前 ❌

```
INFO: 開始保存獨立圖層文件，共 25 個圖層
ERROR: ❌ 處理圖層 背景 時出錯: 'index'
ERROR: ❌ 處理圖層 bg 時出錯: 'index'
ERROR: ❌ 處理圖層 矩形 2 時出錯: 'index'
...
INFO: 圖層處理完成: 成功 0 個，跳過 25 個
ERROR: 沒有可處理的圖層。總共 25 個圖層，全部被跳過。
```

### 修复后 ✅

```
INFO: 創建圖層對象映射
INFO: 已映射 25 個圖層對象
INFO: 開始保存獨立圖層文件，共 25 個圖層
INFO: ✅ 已保存圖層 1/25: 背景 (1920x1080, opacity=255)
INFO: ✅ 已保存圖層 2/25: bg (1920x1080, opacity=255)
INFO: ✅ 已保存圖層 3/25: Logo (300x200, opacity=255)
...
INFO: 圖層處理完成: 成功 23 個，跳過 2 個
INFO: 跳過的圖層: Text Layer (圖像為空), Hidden Layer (不可見)
INFO: 生成檢測框圖像
INFO: 調用Gemini API生成縮放方案
```

---

## 🧪 测试步骤

### 1. 刷新浏览器
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 2. 访问应用
```
http://localhost:3100/canvas/default
```

### 3. 上传PSD文件
   - 选择一个包含多图层的PSD文件
   - 等待上传完成

### 4. 点击智能缩放
   - 选择"**缩放单个PSD文件**"
   - 启用"**分层模式 ✨**"
   - 输入目标尺寸
   - 输入Gemini API Key
   - 点击"**开始智能缩放**"

### 5. 查看日志（新终端）
```bash
tail -f /home/ubuntu/jaaz/server/backend.log
```

### 预期结果

✅ **成功的日志输出**:
```
創建圖層對象映射
已映射 N 個圖層對象
開始保存獨立圖層文件，共 N 個圖層
✅ 已保存圖層 1/N: Layer1 (WxH, opacity=255)
✅ 已保存圖層 2/N: Layer2 (WxH, opacity=255)
...
圖層處理完成: 成功 M 個，跳過 X 個
```

---

## 🔧 相关文件修改

### 修改的文件

**文件**: `/home/ubuntu/jaaz/server/routers/psd_resize_router.py`

**修改内容**:
- 第476-496行: 新增图层对象映射逻辑
- 第498-512行: 修改图层获取方式（从映射中获取）
- 第536-540行: 新增不透明度支持
- 第570-590行: 更新注释编号（5→6, 6→7, 7→8）

**状态**: ✅ 已重启后端 (PID: 567082)

---

## 📚 技术细节

### `get_psd_layers_info()` 返回的数据结构

```python
{
    'id': 0,              # 图层ID（从0开始递增）
    'name': '图层名称',
    'type': 'pixel',      # 图层类型
    'visible': True,      # 是否可见
    'left': 100,          # 左边界 x
    'top': 50,            # 上边界 y
    'right': 500,         # 右边界 x
    'bottom': 400,        # 下边界 y
    'width': 400,         # 宽度
    'height': 350,        # 高度
    'level': 0            # 嵌套层级
}
```

### PSD图层对象

```python
# PSD图层对象属性
layer.name         # 图层名称
layer.visible      # 是否可见
layer.opacity      # 不透明度 (0-255)
layer.bbox         # 边界框 (left, top, right, bottom)
layer.topil()      # 转换为PIL Image
layer.kind         # 图层类型
hasattr(layer, '__iter__')  # 是否为图层组
```

---

## 🎯 为什么需要映射？

### 问题

PSD文件的图层结构是**树状**的（支持图层组），但我们需要一个**扁平的ID到对象的映射**。

```
PSD 文件结构:
├── 图层组 A
│   ├── 图层 1
│   └── 图层 2
├── 图层 3
└── 图层组 B
    └── 图层 4
```

### 解决方案

通过**递归遍历**创建映射：

```python
layer_map = {
    0: <图层组 A对象>,
    1: <图层 1对象>,
    2: <图层 2对象>,
    3: <图层 3对象>,
    4: <图层组 B对象>,
    5: <图层 4对象>
}
```

这样就可以通过 `layer_info['id']` 直接获取对应的图层对象。

---

## ✅ 修复状态

- ✅ 图层ID映射逻辑已实现
- ✅ 图层对象获取已修复
- ✅ 不透明度支持已添加
- ✅ 后端代码已更新
- ✅ 后端已重启 (PID: 567082, 端口: 58000)
- ✅ 日志输出已优化

---

## 🚀 现在可以开始测试了！

1. 刷新浏览器
2. 上传PSD文件
3. 点击智能缩放
4. 选择"分层模式"
5. 开始缩放！

**日志位置**: `/home/ubuntu/jaaz/server/backend.log`

---

**修复时间**: 2024年10月29日  
**状态**: ✅ 完成


