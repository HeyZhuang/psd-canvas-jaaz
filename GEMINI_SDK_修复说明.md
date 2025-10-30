# Gemini SDK 导入错误修复说明

## 🐛 问题描述

**错误信息:**
```
PSD自动缩放失败: module 'google.genai' has no attribute 'GenerativeModel'
```

## 🔍 根本原因

您的系统同时安装了两个版本的 Google Gemini SDK：
- **新版SDK**: `google-genai` (1.34.0)
- **旧版SDK**: `google-generativeai` (0.8.3)

这两个SDK的API**完全不同**：

### 新版 SDK (google-genai 1.x)
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)
response = client.models.generate_content(...)
```
- ✅ 有 `Client` 类
- ❌ **没有** `GenerativeModel` 类

### 旧版 SDK (google-generativeai 0.x)
```python
import google.generativeai as genai

genai.configure(api_key=api_key)
model = genai.GenerativeModel(model_name)
response = model.generate_content(...)
```
- ❌ 没有 `Client` 类
- ✅ **有** `GenerativeModel` 类

## 🔧 修复的文件

### 1. `/home/ubuntu/jaaz/server/services/gemini_psd_resize_service.py`

**问题：**
- 导入了新版SDK但在回退逻辑中没有正确重新导入旧版SDK
- 当新版SDK的 `Client` 创建失败时，仍然使用新版的 `genai` 模块引用
- 导致在第306行调用 `genai.GenerativeModel()` 时报错

**修复：**
```python
# 修复前
except (AttributeError, TypeError):
    genai.configure(api_key=self.api_key)  # ❌ genai 仍是新版模块
    
# 修复后
except (AttributeError, TypeError) as e:
    import google.generativeai as genai_old  # ✅ 重新导入旧版SDK
    self.genai_old = genai_old  # ✅ 保存旧版SDK引用
    genai_old.configure(api_key=self.api_key)
```

并且在使用时：
```python
# 修复前
model = genai.GenerativeModel(self.model_name)  # ❌

# 修复后  
model = self.genai_old.GenerativeModel(self.model_name)  # ✅
```

### 2. `/home/ubuntu/jaaz/resize/psd_auto_resize_pipeline.py`

**问题：**
- 导入了旧版SDK但使用了新版SDK的API
- 导致 `genai.Client()` 调用失败

**修复：**
```python
# 修复前
import google.generativeai as genai  # ❌ 旧版SDK
from google.generativeai import types
client = genai.Client(api_key=self.api_key)  # ❌ 新版API

# 修复后
from google import genai  # ✅ 新版SDK
from google.genai import types
client = genai.Client(api_key=self.api_key)  # ✅ 匹配
```

## ✅ 验证结果

运行测试脚本确认：
- ✅ 新版SDK (google-genai) 成功导入
- ✅ 新版SDK有 `Client` 属性
- ✅ 新版SDK**没有** `GenerativeModel` 属性（这是正常的）
- ✅ 旧版SDK (google-generativeai) 成功导入  
- ✅ 旧版SDK有 `GenerativeModel` 属性
- ✅ `GeminiPSDResizeService` 初始化成功

## 📋 修复总结

| 文件 | 问题 | 修复 |
|------|------|------|
| `server/services/gemini_psd_resize_service.py` | 回退到旧版SDK时没有重新导入 | 在except块中重新导入并保存引用 |
| `resize/psd_auto_resize_pipeline.py` | 导入旧版SDK但使用新版API | 统一使用新版SDK导入 |

## 🎯 关键要点

1. **不要混用两个SDK的API** - 要么全用新版，要么全用旧版
2. **新版SDK的导入方式**: `from google import genai`
3. **旧版SDK的导入方式**: `import google.generativeai as genai`
4. **新版SDK使用 `Client`**，旧版SDK使用 `GenerativeModel`
5. **在异常处理中切换SDK时，必须重新导入正确的模块**

## 🚀 现在可以正常使用了

修复后，PSD智能缩放功能应该可以正常工作了，无论使用新版还是旧版SDK都能正确处理。





