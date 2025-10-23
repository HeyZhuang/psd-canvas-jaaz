# API密钥配置说明

## 📁 配置文件

我已经为您创建了 `config.env` 文件，您可以在其中存储API密钥。

## 🔑 设置API密钥

### 方法1：编辑config.env文件（推荐）

1. 打开项目根目录的 `config.env` 文件
2. 找到这一行：
   ```
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
3. 将 `YOUR_GEMINI_API_KEY` 替换为您的实际API密钥：
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
4. 保存文件

### 方法2：设置环境变量

```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"

# Windows CMD
set GEMINI_API_KEY=your_api_key_here

# Linux/Mac
export GEMINI_API_KEY="your_api_key_here"
```

## 🔍 获取API密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录您的Google账户
3. 点击"Get API Key"按钮
4. 创建新的API密钥
5. 复制密钥并粘贴到配置文件中

## ✅ 测试配置

运行测试脚本验证配置是否正确：

```bash
python test_config.py
```

如果看到"✅ 配置文件加载成功!"，说明配置正确。

## 🚀 使用PSD缩放功能

配置完成后：

1. 启动服务器：
   ```bash
   cd server
   python main.py
   ```

2. 启动前端：
   ```bash
   cd react
   npm run dev
   ```

3. 在浏览器中打开应用，上传PSD文件，使用左侧导航栏的"智能缩放"功能。

## 🤖 AI模型信息

- **使用模型**: Gemini 2.5 Pro
- **模型特点**: 更强的推理能力和更准确的图像分析
- **适用场景**: PSD图层智能缩放、设计元素重新布局

## 🔒 安全提示

- `config.env` 文件已添加到 `.gitignore`，不会被提交到版本控制
- 请妥善保管您的API密钥，不要分享给他人
- 如果密钥泄露，请立即在Google AI Studio中重新生成

## 📞 技术支持

如果遇到问题，请检查：
1. API密钥是否正确设置
2. 网络连接是否正常
3. 服务器是否正常启动
4. 查看服务器日志获取详细错误信息
