# services/OpenAIAgents_service/jaaz_agent.py

from typing import Dict, Any, List
import asyncio
import logging

try:
    from ..gemini_magic_service import GeminiMagicService
except ImportError:
    # 如果在测试环境中，尝试直接导入
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from gemini_magic_service import GeminiMagicService

logger = logging.getLogger(__name__)


async def create_jaaz_response(messages: List[Dict[str, Any]], session_id: str = "", canvas_id: str = "") -> Dict[str, Any]:
    """
    使用 Gemini API 进行魔法分析和设计建议
    替代原有的云端图像生成服务
    """
    try:
        logger.info("🎨 开始魔法生成处理...")
        
        # 检查 messages 是否为空
        if not messages or len(messages) == 0:
            logger.warning("❌ 消息列表为空")
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': '❌ 未收到有效消息，请确保在画布上选择元素后再触发魔法生成。'
                    }
                ]
            }
        
        # 获取图片内容和用户提示词
        user_message: Dict[str, Any] = messages[-1]
        image_content: str = ""
        user_prompt: str = ""

        if isinstance(user_message.get('content'), list):
            for content_item in user_message['content']:
                if content_item.get('type') == 'image_url':
                    image_url = content_item.get('image_url', {}).get('url', "")
                    # 提取 base64 数据（移除 data:image/png;base64, 前缀）
                    if image_url.startswith('data:image/'):
                        image_content = image_url.split(',', 1)[1] if ',' in image_url else image_url
                    else:
                        image_content = image_url
                elif content_item.get('type') == 'text':
                    text = content_item.get('text', '')
                    # 过滤掉默认的提示文本
                    if text and text != '✨ Magic Magic! Wait about 1~2 minutes please...':
                        user_prompt = text

        if not image_content:
            logger.warning("❌ 未找到输入图像")
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': '❌ 未找到输入图像，请先在画布上选择要分析的元素。'
                    }
                ]
            }

        # 创建 Gemini 魔法服务实例
        try:
            gemini_service = GeminiMagicService()
            logger.info("✅ Gemini 服务初始化成功")
        except ValueError as e:
            logger.error(f"❌ Gemini service configuration error: {e}")
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': '❌ Gemini API 密钥未配置\n\n请在 config.env 文件中设置 GEMINI_API_KEY'
                    }
                ]
            }

        # 调用 Gemini 进行魔法分析
        logger.info("🔮 调用 Gemini API 进行魔法分析...")
        result = await gemini_service.generate_magic_analysis(
            image_base64=image_content,
            canvas_width=0,  # TODO: 从 canvas_id 获取实际尺寸
            canvas_height=0,
            layer_info=None,  # TODO: 从 canvas_id 获取图层信息
            user_request=user_prompt or "请分析这个设计并提供专业的改进建议"
        )
        
        if not result.get('success'):
            error_msg = result.get('error', '未知错误')
            logger.error(f"❌ Magic analysis error: {error_msg}")
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': f'❌ 魔法分析失败: {error_msg}'
                    }
                ]
            }

        # 格式化分析结果
        data = result.get('data', {})
        response_text = _format_magic_response(data, user_prompt)
        
        logger.info("✅ 魔法分析完成")
        
        return {
            'role': 'assistant',
            'content': [
                {
                    'type': 'text',
                    'text': response_text
                }
            ]
        }

    except (asyncio.TimeoutError, Exception) as e:
        # 检查是否是超时相关的错误
        error_msg = str(e).lower()
        if 'timeout' in error_msg or 'timed out' in error_msg:
            logger.error("⏱️ API 调用超时")
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': '⏱️ 分析超时，请稍后重试。\n\n提示：可以尝试选择更小的区域进行分析。'
                    }
                ]
            }
        else:
            logger.error(f"❌ 创建魔法回复时出错: {e}", exc_info=True)
            return {
                'role': 'assistant',
                'content': [
                    {
                        'type': 'text',
                        'text': f'❌ 魔法生成错误: {str(e)}'
                    }
                ]
            }


def _format_magic_response(data: Dict[str, Any], user_prompt: str = "") -> str:
    """格式化 Gemini 分析结果为友好的文本"""
    
    # 提取各部分数据
    design_analysis = data.get('design_analysis', {})
    evaluation = data.get('evaluation', {})
    magic_suggestions = data.get('magic_suggestions', [])
    image_prompt = data.get('image_generation_prompt', '')
    summary = data.get('summary', '')
    
    # 构建响应文本
    response = "✨ **魔法分析完成！**\n\n"
    
    # 1. 设计分析
    response += "## 📊 设计分析\n\n"
    
    if design_analysis.get('design_type'):
        response += f"**设计类型**: {design_analysis['design_type']}\n\n"
    
    if design_analysis.get('design_style'):
        response += f"**设计风格**: {design_analysis['design_style']}\n\n"
    
    if design_analysis.get('main_elements'):
        elements = design_analysis['main_elements']
        response += f"**主要元素**: {', '.join(elements)}\n\n"
    
    if design_analysis.get('color_scheme'):
        color_scheme = design_analysis['color_scheme']
        if isinstance(color_scheme, dict):
            primary = color_scheme.get('primary_colors', [])
            description = color_scheme.get('description', '')
            if primary:
                response += f"**配色方案**: {', '.join(primary)}"
                if description:
                    response += f" - {description}"
                response += "\n\n"
    
    if design_analysis.get('composition'):
        response += f"**构图方式**: {design_analysis['composition']}\n\n"
    
    # 2. 评估
    if evaluation:
        response += "## 📈 设计评估\n\n"
        
        strengths = evaluation.get('strengths', [])
        if strengths:
            response += "**✅ 优点**:\n"
            for i, strength in enumerate(strengths, 1):
                response += f"{i}. {strength}\n"
            response += "\n"
        
        weaknesses = evaluation.get('weaknesses', [])
        if weaknesses:
            response += "**⚠️ 可改进**:\n"
            for i, weakness in enumerate(weaknesses, 1):
                response += f"{i}. {weakness}\n"
            response += "\n"
        
        missing_elements = evaluation.get('missing_elements', [])
        if missing_elements:
            response += "**💡 可添加元素**:\n"
            for i, element in enumerate(missing_elements, 1):
                response += f"{i}. {element}\n"
            response += "\n"
    
    # 3. 魔法建议
    if magic_suggestions:
        response += "## 🚀 改进建议\n\n"
        
        # 按优先级排序
        high_priority = [s for s in magic_suggestions if s.get('priority') == '高']
        medium_priority = [s for s in magic_suggestions if s.get('priority') == '中']
        low_priority = [s for s in magic_suggestions if s.get('priority') == '低']
        
        for priority, suggestions, emoji in [
            ('高优先级', high_priority, '🔴'),
            ('中优先级', medium_priority, '🟡'),
            ('低优先级', low_priority, '🟢')
        ]:
            if suggestions:
                response += f"### {emoji} {priority}\n\n"
                for suggestion in suggestions:
                    title = suggestion.get('title', '')
                    description = suggestion.get('description', '')
                    implementation = suggestion.get('implementation', '')
                    
                    response += f"**{title}**\n"
                    if description:
                        response += f"{description}\n"
                    if implementation:
                        response += f"💡 实施方法: {implementation}\n"
                    response += "\n"
    
    # 4. 图像生成提示词
    if image_prompt:
        response += "## 🎨 AI 图像生成提示词\n\n"
        response += "您可以使用以下提示词在 DALL-E、Midjourney 或 Stable Diffusion 等工具中生成配套图像：\n\n"
        response += f"```\n{image_prompt}\n```\n\n"
    
    # 5. 总结
    if summary:
        response += "## 📝 总结\n\n"
        response += f"{summary}\n\n"
    
    # 6. 下一步提示
    response += "---\n\n"
    response += "💡 **下一步**: 您可以根据以上建议调整设计，或者使用生成的提示词创建新的视觉元素。\n"
    
    return response

if __name__ == "__main__":
    asyncio.run(create_jaaz_response([]))
