# Gemini API 设置说明

## 问题解决

已修复 `module 'google.generativeai' has no attribute 'Client'` 错误。

## 修复内容

1. **更新了Google Generative AI库**：
   - 卸载了旧的 `google-generativeai` 库
   - 安装了新的 `google-genai` 库
   - 更新了 `requirements.txt`

2. **修复了API调用方式**：
   - 更新了 `server/services/gemini_psd_resize_service.py`
   - 使用新的 `genai.GenerativeModel()` API
   - 使用 `gemini-2.5-pro` 模型

## 设置API密钥

要使用PSD智能缩放功能，您需要设置Gemini API密钥：

### 方法1：环境变量
```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"

# Windows CMD
set GEMINI_API_KEY=your_api_key_here

# Linux/Mac
export GEMINI_API_KEY="your_api_key_here"
```

### 方法2：创建.env文件
在项目根目录创建 `.env` 文件：
```
GEMINI_API_KEY=your_api_key_here
```

### 获取API密钥
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录您的Google账户
3. 创建新的API密钥
4. 复制密钥并设置到环境变量中

## 测试API连接

运行测试脚本验证API是否正常工作：
```bash
python test_gemini_api.py
```

## 使用PSD缩放功能

1. 确保服务器正在运行
2. 在前端上传PSD文件
3. 点击左侧导航栏的"智能缩放"按钮
4. 设置目标尺寸
5. 点击"开始智能缩放"

现在PSD缩放功能应该可以正常工作了！
