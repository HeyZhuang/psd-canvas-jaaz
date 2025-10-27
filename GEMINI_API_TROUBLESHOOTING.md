# Gemini API 调用故障排查指南

## 🔧 已修复的问题

### 1. API导入和调用方式修正

**问题描述**: 
- 原代码使用了不兼容的API调用方式
- SDK版本兼容性问题

**修复方案**:
- ✅ 添加了对新旧两个版本SDK的兼容支持
- ✅ 使用 `google-genai` (新版) 和 `google-generativeai` (旧版) 双重支持
- ✅ 自动检测并使用可用的SDK版本

### 2. 代码修改详情

#### 文件: `server/services/gemini_psd_resize_service.py`

**导入修正**:
```python
# 旧版（有问题）
from google import genai

# 新版（已修复）
try:
    from google import genai
    from google.genai import types
except ImportError:
    import google.generativeai as genai
    types = None
```

**初始化修正**:
```python
# 添加了客户端初始化逻辑
try:
    # 尝试使用新版 google-genai SDK
    self.client = genai.Client(api_key=self.api_key)
    self.use_new_sdk = True
except (AttributeError, TypeError):
    # 回退到旧版 google-generativeai
    genai.configure(api_key=self.api_key)
    self.client = None
    self.use_new_sdk = False
```

**API调用修正**:
```python
# 支持两种SDK的调用方式
if self.use_new_sdk and self.client:
    # 新版SDK
    response = self.client.models.generate_content(
        model=self.model_name,
        contents=[prompt, image],
        config=types.GenerateContentConfig(...)
    )
else:
    # 旧版SDK
    model = genai.GenerativeModel(self.model_name)
    response = model.generate_content([prompt, image], ...)
```

## 📋 完整的配置和测试步骤

### 步骤1: 安装依赖

```bash
# 进入server目录
cd server

# 安装所有依赖
pip install -r requirements.txt

# 确保安装了google-genai
pip install google-genai --upgrade
```

### 步骤2: 配置API密钥

**方法A: 使用config.env文件（推荐）**

1. 编辑项目根目录的 `config.env` 文件
2. 将 `YOUR_GEMINI_API_KEY` 替换为您的实际密钥：
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

**方法B: 设置环境变量**

Windows PowerShell:
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

Windows CMD:
```cmd
set GEMINI_API_KEY=your_api_key_here
```

### 步骤3: 运行测试脚本

```bash
# 返回项目根目录
cd ..

# 运行测试脚本
python test_gemini_api.py
```

**预期输出**:
```
🔍 Gemini API配置测试工具

============================================================
测试1: API密钥加载
============================================================
config.env中的密钥: 已配置 (长度: XX)

============================================================
测试2: Gemini库导入
============================================================
✅ 成功导入 google.genai
✅ genai.Client 可用 (新版SDK)

============================================================
测试3: Gemini服务初始化
============================================================
✅ 服务初始化成功
   使用模型: gemini-2.5-pro
   使用新版SDK: True

============================================================
测试4: 简单API调用测试
============================================================
正在调用Gemini API...
✅ API调用成功!

============================================================
测试总结
============================================================
api_key        : ✅ 通过
import         : ✅ 通过
service        : ✅ 通过
api_call       : ✅ 通过

============================================================
🎉 所有测试通过！Gemini API配置正确。
============================================================
```

## 🐛 常见错误及解决方案

### 错误1: `ModuleNotFoundError: No module named 'google.genai'`

**原因**: 未安装google-genai包

**解决方案**:
```bash
pip install google-genai
```

### 错误2: `module 'google.generativeai' has no attribute 'Client'`

**原因**: 使用了旧版SDK但代码尝试调用新版API

**解决方案**: 
- 已在代码中修复，会自动回退到旧版API
- 或升级到新版：`pip install google-genai --upgrade`

### 错误3: `ValueError: 需要提供Gemini API密钥`

**原因**: API密钥未配置或配置不正确

**解决方案**:
1. 检查 `config.env` 文件中的 `GEMINI_API_KEY` 是否正确
2. 确保密钥不是 `YOUR_GEMINI_API_KEY` 这样的占位符
3. 检查环境变量是否设置

### 错误4: `403 Forbidden` 或 `401 Unauthorized`

**原因**: API密钥无效或权限不足

**解决方案**:
1. 检查API密钥是否正确
2. 访问 [Google AI Studio](https://aistudio.google.com/) 重新生成密钥
3. 确保API密钥有访问Gemini 2.5 Pro的权限

### 错误5: `429 Too Many Requests`

**原因**: API调用超过配额限制

**解决方案**:
1. 等待一段时间后重试
2. 检查API配额使用情况
3. 考虑升级API套餐

### 错误6: 图像处理错误

**原因**: 图像格式或大小不支持

**解决方案**:
1. 确保PSD文件大小 < 50MB
2. 确保图层数量 < 100
3. 检查PSD文件是否损坏

## 🔍 调试技巧

### 启用详细日志

在 `server/main.py` 中添加：
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 查看API响应

在调用失败时，检查 `logger.error` 的输出，了解具体错误信息。

### 手动测试API

```python
from google import genai
import os

os.environ["GOOGLE_API_KEY"] = "your_api_key"
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=["Hello, Gemini!"]
)
print(response.text)
```

## 📊 验证清单

使用以下清单确保配置正确：

- [ ] ✅ 已安装 `google-genai` 包
- [ ] ✅ 已在 `config.env` 或环境变量中设置 `GEMINI_API_KEY`
- [ ] ✅ API密钥有效且未过期
- [ ] ✅ 运行 `test_gemini_api.py` 所有测试通过
- [ ] ✅ 网络可以访问 Google AI 服务
- [ ] ✅ Python版本 >= 3.12
- [ ] ✅ 已安装所有 `requirements.txt` 中的依赖

## 🚀 使用PSD智能缩放功能

配置成功后，启动服务：

```bash
# 启动后端
cd server
python main.py

# 新终端启动前端
cd react
npm run dev
```

访问前端界面，使用"智能缩放"功能上传PSD文件进行测试。

## 📞 获取帮助

如果问题仍然存在：

1. 查看服务器日志获取详细错误信息
2. 运行 `test_gemini_api.py` 获取诊断信息
3. 检查 [Google AI文档](https://ai.google.dev/gemini-api/docs)
4. 查看项目的 GitHub Issues

## 🔄 更新记录

- **2025-10-24**: 修复了SDK兼容性问题，添加新旧版本双重支持
- **2025-10-24**: 创建了完整的测试脚本和故障排查指南
- **2025-10-24**: 添加了config.env配置文件模板
