#!/usr/bin/env python3
"""
Gemini 魔法生成服务
使用 Gemini 2.5 Pro API 进行图像分析和魔法生成
"""

import base64
import json
import os
import re
from typing import Dict, List, Any, Optional
from PIL import Image
from io import BytesIO
import logging

try:
    from google import genai
    from google.genai import types
except ImportError:
    import google.generativeai as genai
    types = None

logger = logging.getLogger(__name__)


class GeminiMagicService:
    """Gemini 魔法生成服务类"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        初始化服务
        
        Args:
            api_key: Gemini API密钥，如果不提供则从环境变量或配置文件读取
            model_name: 模型名称，默认使用 gemini-2.5-pro
        """
        self.api_key = api_key or self._load_api_key_from_config()
        if not self.api_key:
            raise ValueError("需要提供 Gemini API 密钥，通过参数、GEMINI_API_KEY 环境变量或 config.env 文件")
        
        # 设置 API 密钥和初始化客户端
        os.environ["GOOGLE_API_KEY"] = self.api_key
        self.model_name = model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-pro")
        logger.info(f"✅ 使用模型: {self.model_name}")
        
        # 初始化客户端
        try:
            # 尝试使用新版 google-genai SDK
            self.client = genai.Client(api_key=self.api_key)
            self.use_new_sdk = True
            self.genai_old = None
            logger.info("使用 google-genai SDK (新版)")
        except (AttributeError, TypeError) as e:
            # 回退到旧版 google-generativeai
            logger.info(f"新版 SDK 初始化失败 ({e})，回退到旧版 SDK")
            import google.generativeai as genai_old
            self.genai_old = genai_old
            genai_old.configure(api_key=self.api_key)
            self.client = None
            self.use_new_sdk = False
            logger.info("使用 google-generativeai SDK (旧版)")
    
    def _load_api_key_from_config(self) -> Optional[str]:
        """从配置文件加载 API 密钥"""
        try:
            # 首先尝试从环境变量读取
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key and api_key not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
                logger.info(f"从环境变量加载 API key: {api_key[:10]}...")
                return api_key
            
            # 尝试从 config.env 文件读取
            config_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                "config.env"
            )
            if os.path.exists(config_path):
                logger.info(f"找到配置文件: {config_path}")
                with open(config_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
                            api_key = line.split('=', 1)[1].strip()
                            if api_key and api_key not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
                                logger.info(f"从配置文件加载 API key: {api_key[:10]}...")
                                return api_key
            else:
                logger.warning(f"配置文件不存在: {config_path}")
            
            return None
        except Exception as e:
            logger.warning(f"从配置文件读取 API 密钥失败: {e}")
            return None
    
    def _build_magic_prompt(
        self, 
        canvas_width: int = 0, 
        canvas_height: int = 0,
        layer_info_text: str = "",
        user_request: str = ""
    ) -> str:
        """
        构建魔法生成的提示词
        参考 prompt.rules 的专业格式
        """
        prompt = f"""# 画布魔法生成任务

## 任务目标
分析用户提供的画布设计图像，理解设计意图和视觉元素，并提供专业的设计分析和改进建议。

## 画布信息
- **画布尺寸**: {canvas_width}x{canvas_height} (宽x高)
{f"- **现有图层信息**:\n```\n{layer_info_text}\n```\n" if layer_info_text else ""}

## 用户需求
{user_request if user_request else "请分析这个设计并提供改进建议"}

## 分析要求

### 1. 设计理解
请深入分析图像，包括：
- **设计类型**: 识别设计的用途（海报、UI界面、产品展示、社交媒体图等）
- **主要元素**: 列出所有关键视觉元素（文字、图形、图片、装饰等）
- **色彩方案**: 分析主色调和配色方案
- **设计风格**: 识别设计风格（现代简约、复古、科技感、手绘风等）
- **构图方式**: 分析构图布局（居中、黄金分割、对称、留白等）

### 2. 设计评估
评估当前设计的优势和不足：
- **优点**: 设计中做得好的地方
- **可改进点**: 需要优化的方面
- **缺失元素**: 可以添加的元素来提升设计

### 3. 魔法建议
提供具体的改进方案：
- **颜色优化**: 如何改进配色
- **布局调整**: 如何优化元素布局
- **新增元素**: 建议添加什么元素
- **视觉层次**: 如何增强视觉层次感
- **用户体验**: 如何提升整体体验

### 4. 图像生成提示词
基于分析结果，生成一个专业的英文提示词，用于 AI 图像生成工具创建配套的视觉元素或改进版本。
提示词要求：
- 详细描述视觉风格
- 包含关键元素和构图
- 指定色彩方案
- 适合 DALL-E、Midjourney、Stable Diffusion 等工具

## 输出格式要求

请严格按照以下 JSON 格式输出分析结果：

```json
{{
  "design_analysis": {{
    "design_type": "设计类型（如：电商海报、App界面、产品展示等）",
    "main_elements": ["主要元素1", "主要元素2", "主要元素3"],
    "color_scheme": {{
      "primary_colors": ["#颜色1", "#颜色2"],
      "secondary_colors": ["#颜色3", "#颜色4"],
      "description": "配色描述"
    }},
    "design_style": "设计风格描述",
    "composition": "构图方式描述",
    "visual_hierarchy": "视觉层次分析"
  }},
  "evaluation": {{
    "strengths": ["优点1", "优点2", "优点3"],
    "weaknesses": ["不足1", "不足2"],
    "missing_elements": ["缺失元素1", "缺失元素2"]
  }},
  "magic_suggestions": [
    {{
      "category": "颜色优化|布局调整|新增元素|视觉层次|其他",
      "title": "建议标题",
      "description": "详细描述",
      "priority": "高|中|低",
      "implementation": "具体实施方法"
    }}
  ],
  "image_generation_prompt": "Professional [design type] with [key elements], featuring [color scheme], [composition style], [additional details], high quality, detailed, 4k",
  "layer_operations": [
    {{
      "operation": "add|modify|delete|move|resize",
      "target": "目标图层或新增元素",
      "parameters": {{
        "description": "操作描述",
        "reason": "操作原因"
      }}
    }}
  ],
  "summary": "整体设计总结和核心建议（100字以内）"
}}
```

**重要**: 
1. 请直接输出 JSON 对象，不要添加 markdown 代码块标记（如 ```json）
2. 确保输出是有效的 JSON 格式
3. 所有字段都必须填写，不能省略
4. 分析要专业、具体、可操作
5. 图像生成提示词必须是英文，且足够详细
"""
        return prompt
    
    async def generate_magic_analysis(
        self,
        image_base64: str,
        canvas_width: int = 0,
        canvas_height: int = 0,
        layer_info: Optional[List[Dict[str, Any]]] = None,
        user_request: str = ""
    ) -> Dict[str, Any]:
        """
        使用 Gemini 进行魔法分析
        
        Args:
            image_base64: 画布截图的 base64 编码（不含前缀）
            canvas_width: 画布宽度
            canvas_height: 画布高度
            layer_info: 图层信息列表
            user_request: 用户的自定义需求
        
        Returns:
            包含分析结果的字典
        """
        try:
            logger.info("🎨 开始 Gemini 魔法分析...")
            
            # 构建图层信息文本
            layer_info_text = ""
            if layer_info:
                layer_info_text = self._format_layer_info(layer_info)
            
            # 构建提示词
            prompt = self._build_magic_prompt(
                canvas_width=canvas_width,
                canvas_height=canvas_height,
                layer_info_text=layer_info_text,
                user_request=user_request
            )
            
            # 调用 Gemini API
            response_text = await self.call_gemini_api(
                prompt=prompt,
                image_base64=image_base64,
                temperature=0.3,  # 稍高的温度以获得更有创意的建议
                max_tokens=8192
            )
            
            logger.info(f"✅ Gemini API 调用成功，响应长度: {len(response_text)}")
            
            # 解析 JSON 响应
            result = self._parse_json_response(response_text)
            
            if result:
                logger.info("✅ 魔法分析完成")
                return {
                    "success": True,
                    "data": result
                }
            else:
                logger.warning("⚠️ JSON 解析失败，返回原始响应")
                return {
                    "success": False,
                    "error": "JSON 解析失败",
                    "raw_response": response_text
                }
                
        except Exception as e:
            logger.error(f"❌ 魔法分析失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _format_layer_info(self, layer_info: List[Dict[str, Any]]) -> str:
        """格式化图层信息为文本"""
        lines = ["ID | 名称 | 类型 | 可见 | 坐标(L,T,R,B) | 尺寸(WxH)"]
        lines.append("-" * 70)
        
        for layer in layer_info:
            layer_id = layer.get('id', '?')
            name = layer.get('name', 'Unknown')
            layer_type = layer.get('type', 'unknown')
            visible = '✓' if layer.get('visible', True) else '✗'
            
            # 获取坐标
            bounds = layer.get('bounds', {})
            left = bounds.get('left', 0)
            top = bounds.get('top', 0)
            right = bounds.get('right', 0)
            bottom = bounds.get('bottom', 0)
            width = right - left
            height = bottom - top
            
            lines.append(
                f"{layer_id} | {name[:20]} | {layer_type} | {visible} | "
                f"({left},{top},{right},{bottom}) | {width}x{height}"
            )
        
        return "\n".join(lines)
    
    def _parse_json_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """解析 Gemini 返回的 JSON 响应"""
        try:
            # 尝试直接解析
            return json.loads(response_text)
        except json.JSONDecodeError:
            # 尝试提取 JSON 块
            logger.warning("直接解析失败，尝试提取 JSON 块")
            
            # 移除可能的 markdown 代码块标记
            cleaned = re.sub(r'```json\s*', '', response_text)
            cleaned = re.sub(r'```\s*', '', cleaned)
            cleaned = cleaned.strip()
            
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                # 尝试查找第一个 { 和最后一个 }
                start = cleaned.find('{')
                end = cleaned.rfind('}')
                
                if start != -1 and end != -1:
                    json_str = cleaned[start:end+1]
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        logger.error("所有 JSON 解析尝试均失败")
                        return None
                
                logger.error("未找到有效的 JSON 对象")
                return None
    
    async def call_gemini_api(
        self,
        prompt: str,
        image_base64: str,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        max_retries: int = 3,
        timeout: int = 120
    ) -> str:
        """
        调用 Gemini API
        
        Args:
            prompt: 提示词
            image_base64: 图像的 base64 编码（不含前缀）
            temperature: 温度参数
            max_tokens: 最大输出 token 数
            max_retries: 最大重试次数
            timeout: 超时时间（秒）
        
        Returns:
            API 响应文本
        """
        import time
        import asyncio
        
        for attempt in range(max_retries):
            try:
                # 准备图像数据
                image_data = base64.b64decode(image_base64)
                image = Image.open(BytesIO(image_data))
                
                logger.info(f"📸 图像尺寸: {image.size}, 格式: {image.format}")
                
                async def _make_api_call():
                    if self.use_new_sdk and self.client:
                        # 使用新版 google-genai SDK
                        logger.info(f"使用新版 SDK 调用 Gemini API (超时: {timeout}秒)")
                        
                        response = self.client.models.generate_content(
                            model=self.model_name,
                            contents=[prompt, image],
                            config=types.GenerateContentConfig(
                                temperature=temperature,
                                max_output_tokens=max_tokens,
                                response_modalities=["Text"]
                            )
                        )
                        
                        # 提取响应文本
                        return response.text
                    else:
                        # 使用旧版 google-generativeai SDK
                        logger.info(f"使用旧版 SDK 调用 Gemini API (超时: {timeout}秒)")
                        
                        model = self.genai_old.GenerativeModel(self.model_name)
                        
                        # 生成内容
                        response = model.generate_content(
                            [prompt, image],
                            generation_config={
                                "temperature": temperature,
                                "max_output_tokens": max_tokens,
                            }
                        )
                        
                        return response.text
                
                # 使用 asyncio.wait_for 添加超时控制
                try:
                    result = await asyncio.wait_for(_make_api_call(), timeout=timeout)
                    logger.info(f"✅ API 调用成功（尝试 {attempt + 1}/{max_retries}）")
                    return result
                except asyncio.TimeoutError:
                    logger.warning(f"⏱️ API 调用超时（尝试 {attempt + 1}/{max_retries}）")
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # 指数退避
                        logger.info(f"等待 {wait_time} 秒后重试...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        raise TimeoutError(f"API 调用超时（{timeout}秒）")
                        
            except Exception as e:
                logger.error(f"❌ API 调用失败（尝试 {attempt + 1}/{max_retries}）: {e}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"等待 {wait_time} 秒后重试...")
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
        raise Exception("达到最大重试次数")


# 全局单例
_gemini_magic_service: Optional[GeminiMagicService] = None


def get_gemini_magic_service() -> GeminiMagicService:
    """获取 Gemini 魔法服务单例"""
    global _gemini_magic_service
    if _gemini_magic_service is None:
        _gemini_magic_service = GeminiMagicService()
    return _gemini_magic_service





