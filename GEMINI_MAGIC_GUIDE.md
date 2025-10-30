# Gemini 魔法生成功能使用指南

## 📖 功能概述

本系统现已集成 **Gemini 2.5 Pro API** 实现智能魔法生成功能，可以：

✨ **设计分析**: 深度理解画布设计，识别设计类型、风格、元素  
🎨 **配色分析**: 自动提取和分析配色方案  
📊 **专业评估**: 给出设计优点、不足和改进建议  
💡 **AI 提示词**: 生成专业的图像生成提示词  
🚀 **改进方案**: 提供可操作的设计改进建议

---

## 🔧 配置步骤

### 1. 获取 Gemini API 密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 使用 Google 账号登录
3. 点击 "Get API Key" 按钮
4. 创建新的 API 密钥
5. 复制密钥备用

### 2. 配置密钥

已在 `config.env` 文件中配置：

```bash
GEMINI_API_KEY=your_api_key_here
```

**注意**: config.env 文件已添加到 .gitignore，不会被提交到版本控制。

### 3. 验证配置

运行测试脚本：

```bash
python test_gemini_magic.py
```

如果看到 "✅ 测试通过"，说明配置成功！

---

## 🚀 使用方法

### 前端使用

1. **打开画布**: 在应用中打开或创建一个设计
2. **选择元素**: 选中您想要分析的画布元素
3. **触发魔法**: 按快捷键 `Ctrl + B` (Windows/Linux) 或 `⌘ + B` (Mac)
4. **等待分析**: 系统会自动截图并调用 Gemini API（约 10-30 秒）
5. **查看结果**: 在聊天界面查看详细的设计分析和建议

### API 使用

您也可以直接调用 API：

```python
from services.gemini_magic_service import GeminiMagicService

# 初始化服务
service = GeminiMagicService()

# 调用魔法分析
result = await service.generate_magic_analysis(
    image_base64="...",  # 图像的 base64 编码
    canvas_width=800,
    canvas_height=600,
    user_request="请分析这个设计"
)

# 获取结果
if result['success']:
    data = result['data']
    print(data['design_analysis'])
    print(data['evaluation'])
    print(data['magic_suggestions'])
```

---

## 📊 响应格式

Gemini 魔法分析返回的 JSON 结构：

```json
{
  "design_analysis": {
    "design_type": "设计类型",
    "main_elements": ["元素1", "元素2"],
    "color_scheme": {
      "primary_colors": ["#颜色1", "#颜色2"],
      "description": "配色描述"
    },
    "design_style": "设计风格",
    "composition": "构图方式",
    "visual_hierarchy": "视觉层次"
  },
  "evaluation": {
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"],
    "missing_elements": ["缺失元素1", "缺失元素2"]
  },
  "magic_suggestions": [
    {
      "category": "建议类别",
      "title": "建议标题",
      "description": "详细描述",
      "priority": "高|中|低",
      "implementation": "实施方法"
    }
  ],
  "image_generation_prompt": "英文 AI 图像生成提示词",
  "summary": "设计总结"
}
```

---

## 🎯 提示词工程

系统使用专业的提示词模板（参考 `prompt.rules`），确保：

- ✅ **结构化输出**: 严格的 JSON 格式
- ✅ **专业分析**: 深入的设计理解
- ✅ **可操作建议**: 具体的改进方案
- ✅ **优先级排序**: 高/中/低优先级
- ✅ **多语言支持**: 中文分析 + 英文提示词

---

## 🔄 工作流程

```
用户触发 (Ctrl+B)
    ↓
前端截图画布
    ↓
转换为 base64
    ↓
发送到后端 /api/magic
    ↓
jaaz_magic_agent.py 接收
    ↓
调用 GeminiMagicService
    ↓
构建专业提示词
    ↓
调用 Gemini 2.5 Pro API
    ↓
解析 JSON 响应
    ↓
格式化为友好文本
    ↓
通过 WebSocket 返回前端
    ↓
聊天界面显示结果
```

---

## 🎨 应用场景

### 1. UI 设计评审
- 分析界面布局
- 评估用户体验
- 提供改进建议

### 2. 海报设计优化
- 分析视觉层次
- 评估配色方案
- 建议元素调整

### 3. 产品展示优化
- 分析产品展示方式
- 评估视觉吸引力
- 提供营销建议

### 4. 品牌一致性检查
- 分析设计风格
- 评估品牌元素
- 确保一致性

---

## ⚙️ 高级配置

### 模型选择

在 `config.env` 中设置：

```bash
# 使用 Gemini 2.5 Pro（推荐，更强分析能力）
GEMINI_MODEL=gemini-2.5-pro

# 或使用 Gemini 1.5 Flash（更快速度）
GEMINI_MODEL=gemini-1.5-flash
```

### 调整温度参数

在 `gemini_magic_service.py` 中修改：

```python
result = await service.generate_magic_analysis(
    # ...
    temperature=0.3  # 0.0-1.0，越低越保守，越高越创意
)
```

### 超时设置

```python
await service.call_gemini_api(
    # ...
    timeout=120  # 超时时间（秒）
)
```

---

## 🐛 故障排除

### 问题 1: "Gemini API 密钥未配置"

**解决方案**:
1. 检查 `config.env` 文件是否存在
2. 确认 `GEMINI_API_KEY` 行没有被注释
3. 确认密钥不是占位符（如 "YOUR_GEMINI_API_KEY"）

### 问题 2: "API 调用超时"

**解决方案**:
1. 检查网络连接
2. 尝试选择更小的画布区域
3. 增加超时时间设置
4. 检查 Gemini API 配额

### 问题 3: "JSON 解析失败"

**解决方案**:
1. 系统会自动尝试多种解析方法
2. 如果持续失败，检查 `raw_response` 字段
3. 可能需要调整提示词温度参数

### 问题 4: 响应质量不佳

**解决方案**:
1. 在用户请求中提供更详细的描述
2. 确保画布截图清晰完整
3. 尝试使用 gemini-2.5-pro 而非 flash 版本
4. 调整温度参数（建议 0.2-0.4）

---

## 📈 性能优化

### 响应时间
- **Gemini 2.5 Pro**: 通常 10-30 秒
- **Gemini 1.5 Flash**: 通常 5-15 秒

### 成本优化
- 使用 Gemini 1.5 Flash 可节省约 50% 成本
- 避免过大的图像（建议 ≤ 2048px）
- 合理使用缓存机制

### 质量优化
- 使用 Gemini 2.5 Pro 获得更专业分析
- 提供清晰的用户需求描述
- 确保画布设计元素清晰可见

---

## 🔒 安全注意事项

1. ✅ API 密钥已通过 .gitignore 保护
2. ✅ 不要在代码中硬编码密钥
3. ✅ 定期轮换 API 密钥
4. ✅ 监控 API 使用配额
5. ✅ 使用 HTTPS 传输数据

---

## 📞 支持与反馈

### 查看日志

```bash
# 启动服务器时查看日志
cd server
python main.py

# 查看详细日志
tail -f backend.log
```

### 常用命令

```bash
# 测试 Gemini 连接
python test_gemini_connection.py

# 测试魔法功能
python test_gemini_magic.py

# 检查 API 配额
python 检查配额状态.py
```

---

## 🎓 最佳实践

### ✅ DO（推荐）
- 在使用前测试 API 连接
- 提供清晰的用户需求描述
- 选择适当的画布区域
- 定期检查 API 配额
- 保存有价值的分析结果

### ❌ DON'T（不推荐）
- 不要分析空白或内容过少的画布
- 不要频繁调用造成配额浪费
- 不要忽略错误日志
- 不要在公共代码中暴露 API 密钥
- 不要过度依赖自动化建议

---

## 🚧 未来计划

- [ ] 支持图层级别的详细分析
- [ ] 集成实时预览功能
- [ ] 添加设计历史对比
- [ ] 支持批量分析
- [ ] 集成更多 AI 模型
- [ ] 添加设计模板推荐

---

## 📚 相关文档

- [Gemini API 官方文档](https://ai.google.dev/docs)
- [提示词工程指南](https://ai.google.dev/docs/prompt_best_practices)
- [API 配额管理](https://ai.google.dev/pricing)
- [项目 README](./README-zh.md)

---

**更新时间**: 2025-10-30  
**版本**: 1.0.0  
**作者**: Jaaz Team




