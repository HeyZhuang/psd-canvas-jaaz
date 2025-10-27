# Gemini API 调用问题修复总结

## 📋 问题概述

用户在调用 Gemini 2.5 Pro API 进行 PSD 文件智能缩放时遇到失败问题。

## 🔧 已修复的问题

### 1. **SDK 兼容性问题**

**问题**: 代码使用了不正确的 API 调用方式，与最新的 `google-genai` SDK 不兼容。

**修复**:
- ✅ 添加了对新版 `google-genai` 和旧版 `google-generativeai` 的双重支持
- ✅ 自动检测可用的 SDK 版本并使用正确的 API 调用方式
- ✅ 改进了错误处理和日志记录

**修改文件**: `server/services/gemini_psd_resize_service.py`

**关键修改**:
```python
# 兼容性导入
try:
    from google import genai
    from google.genai import types
except ImportError:
    import google.generativeai as genai
    types = None

# 智能初始化
try:
    self.client = genai.Client(api_key=self.api_key)
    self.use_new_sdk = True
except (AttributeError, TypeError):
    genai.configure(api_key=self.api_key)
    self.client = None
    self.use_new_sdk = False

# 兼容的API调用
if self.use_new_sdk and self.client:
    # 新版SDK调用方式
    response = self.client.models.generate_content(...)
else:
    # 旧版SDK调用方式
    model = genai.GenerativeModel(self.model_name)
    response = model.generate_content(...)
```

### 2. **API 密钥配置问题**

**问题**: 缺少便捷的 API 密钥配置方式。

**修复**:
- ✅ 创建了 `config.env` 配置文件模板
- ✅ 提供了三种配置方式（环境变量、config.env、.env）
- ✅ 创建了快速配置脚本 `setup_gemini_key.py`

### 3. **缺少测试和诊断工具**

**问题**: 没有简单的方法来验证配置是否正确。

**修复**:
- ✅ 创建了完整的测试脚本 `test_gemini_api.py`
- ✅ 提供了详细的故障排查指南 `GEMINI_API_TROUBLESHOOTING.md`
- ✅ 添加了诊断信息和错误提示

## 📂 新增文件

| 文件名 | 用途 | 说明 |
|--------|------|------|
| `config.env` | API密钥配置 | 存储Gemini API密钥的配置文件 |
| `test_gemini_api.py` | 测试脚本 | 验证API配置和连接的测试工具 |
| `setup_gemini_key.py` | 配置工具 | 快速配置API密钥的交互式脚本 |
| `GEMINI_API_TROUBLESHOOTING.md` | 故障排查 | 详细的问题诊断和解决方案 |
| `GEMINI_FIX_SUMMARY.md` | 修复总结 | 本文档，总结所有修复内容 |

## 🚀 快速开始指南

### 方法1: 使用配置脚本（推荐）

```bash
# 运行配置脚本
python setup_gemini_key.py

# 按照提示输入您的API密钥
# 脚本会自动测试配置
```

### 方法2: 手动配置

1. **获取API密钥**
   - 访问 https://aistudio.google.com/
   - 登录Google账户
   - 创建新的API密钥

2. **配置密钥**
   
   编辑 `config.env` 文件:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **测试配置**
   ```bash
   python test_gemini_api.py
   ```

### 方法3: 使用环境变量

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"

# 然后运行测试
python test_gemini_api.py
```

## ✅ 验证配置

运行测试脚本应该看到：

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
🎉 所有测试通过！Gemini API配置正确。
============================================================
```

## 📊 完整使用流程

### 1. 配置环境

```bash
# 安装依赖
cd server
pip install -r requirements.txt

# 配置API密钥
cd ..
python setup_gemini_key.py
```

### 2. 启动服务

```bash
# 终端1 - 启动后端
cd server
python main.py

# 终端2 - 启动前端
cd react
npm run dev
```

### 3. 使用PSD智能缩放

1. 在浏览器中打开应用（通常是 http://localhost:3000）
2. 点击左侧导航栏的"智能缩放"按钮
3. 上传PSD文件
4. 设置目标宽度和高度
5. 点击"预览"或"开始智能缩放"
6. 等待AI处理
7. 下载结果

## 🔍 API调用流程详解

根据 `resize.md` 文档，完整流程如下：

### 前端流程
1. 用户上传PSD文件
2. 设置目标尺寸
3. 发送请求到后端API

### 后端流程
1. **解析PSD** (`psd_layer_info.py`)
   - 使用 `psd-tools` 解析PSD文件
   - 提取图层信息（位置、大小、类型等）
   - 生成带检测框的预览图

2. **调用Gemini API** (`gemini_psd_resize_service.py`)
   - 准备提示词（包含缩放规则和策略）
   - 发送图层信息和检测图给Gemini
   - 接收AI生成的新坐标方案

3. **重建PSD** (`resize_psd.py`)
   - 根据新坐标调整图层位置
   - 渲染为PNG图像
   - 返回结果给前端

### API端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/psd/resize/auto-resize` | POST | 自动缩放PSD |
| `/api/psd/resize/preview-resize` | POST | 预览缩放方案 |
| `/api/psd/resize/output/{file_id}` | GET | 获取输出文件 |
| `/api/psd/resize/metadata/{file_id}` | GET | 获取元数据 |

## 🎯 Gemini提示词策略

AI会根据以下核心原则进行智能缩放：

1. **等比例缩放**: 保持原始比例，避免变形
2. **边界限制**: 确保图层在目标画布范围内
3. **视觉层次**: 保持图层间的重要性关系
4. **内容完整性**: 确保文字、产品、标志完整可见
5. **避免重叠**: 智能检测并避免元素重叠
6. **美学平衡**: 保持整体设计的专业性

### 图层类型处理优先级

1. **文字图层**: 最高优先级，确保完全可见和可读性
2. **产品图像**: 保持完整性，避免裁切
3. **背景图层**: 居中裁切或等比缩放
4. **装饰元素**: 在保证主要内容下调整
5. **形状图层**: 保持几何特性

## ⚠️ 常见问题

### Q1: 测试显示"API密钥未配置"

**A**: 检查 `config.env` 文件，确保：
- 文件存在于项目根目录
- `GEMINI_API_KEY=` 后面有实际的密钥
- 密钥不是 `YOUR_GEMINI_API_KEY` 占位符

### Q2: API调用返回403或401错误

**A**: API密钥无效或权限不足：
- 重新生成API密钥
- 确保密钥有访问Gemini 2.5 Pro的权限
- 检查API配额是否用完

### Q3: 导入错误 "No module named 'google.genai'"

**A**: 安装依赖：
```bash
pip install google-genai --upgrade
```

### Q4: PSD文件处理失败

**A**: 检查：
- PSD文件是否小于50MB
- 图层数量是否少于100
- PSD文件是否损坏
- 使用预览功能先查看调整方案

## 📝 技术细节

### 使用的模型
- **Gemini 2.5 Pro**: 用于图层分析和位置计算
- 特点: 强大的推理能力和图像分析能力
- 适用场景: PSD图层智能缩放、设计元素重新布局

### 配置参数
```python
temperature = 0.1      # 低温度确保一致性
max_tokens = 32000     # 支持大量图层的详细响应
model = "gemini-2.5-pro"  # 使用Pro版本获得最佳效果
```

### 性能建议
- PSD文件建议 < 50MB
- 图层数量建议 < 100个
- 目标尺寸建议在 1000x1000 像素以内
- 首次使用建议先预览再执行

## 📚 相关文档

- [`PSD_AUTO_RESIZE_GUIDE.md`](PSD_AUTO_RESIZE_GUIDE.md) - PSD智能缩放功能详细指南
- [`API_KEY_SETUP.md`](API_KEY_SETUP.md) - API密钥配置说明
- [`GEMINI_API_SETUP.md`](GEMINI_API_SETUP.md) - Gemini API设置说明
- [`GEMINI_API_TROUBLESHOOTING.md`](GEMINI_API_TROUBLESHOOTING.md) - 故障排查指南
- [`resize.md`](resize.md) - 技术架构和实现细节

## 🎉 总结

所有Gemini API调用问题已修复：

✅ SDK兼容性问题已解决  
✅ API调用方式已修正  
✅ 配置流程已简化  
✅ 测试工具已提供  
✅ 故障排查指南已完善  

现在您可以：
1. 使用 `setup_gemini_key.py` 快速配置
2. 使用 `test_gemini_api.py` 验证配置
3. 正常使用PSD智能缩放功能

如有任何问题，请参考 `GEMINI_API_TROUBLESHOOTING.md` 进行诊断。
