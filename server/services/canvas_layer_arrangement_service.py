#!/usr/bin/env python3
"""
画布元素智能排列服务
整合Gemini API进行画布元素智能排列
"""

import base64
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from google import genai
import logging

from services.config_service import config_service

import logging
import os
from logging.handlers import RotatingFileHandler

# 创建logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 创建日志目录
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# 文件处理器
file_handler = RotatingFileHandler(
    filename=os.path.join(LOG_DIR, "canvas_layer_arrangement.log"),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=3,
    encoding='utf-8'
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))

# 控制台处理器
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s'
))

# 添加处理器
logger.addHandler(file_handler)
logger.addHandler(console_handler)

class CanvasLayerArrangementService:
    """画布元素智能排列服务类"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化服务
        
        Args:
            api_key: Gemini API密钥，如果不提供则从环境变量或配置文件读取
        """
        self.api_key = api_key or self._load_api_key_from_config()
        if not self.api_key:
            raise ValueError("需要提供Gemini API密钥，通过参数、GEMINI_API_KEY环境变量或config.env文件")
        
        # 设置API密钥
        os.environ["GOOGLE_API_KEY"] = self.api_key
        self.model = "gemini-2.5-pro"  # 使用Gemini 2.5 Pro模型
    
    def _load_api_key_from_config(self) -> Optional[str]:
        """从配置文件加载API密钥"""
        try:
            # 首先尝试从环境变量读取
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key and api_key.strip() and api_key != "AIzaSyBZKqCqcyCrqmbx6RFJFQe-E8spoKD7xK4":
                logger.info("从环境变量读取到API密钥")
                return api_key.strip()
            
            # 尝试从config.env文件读取
            # 尝试多个可能的路径
            possible_paths = [
                # 从server/services向上三级到psd-canvas-jaaz目录
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.env"),
                # 从server/services向上四级到项目根目录（cckz）
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "config.env"),
                # 直接尝试项目根目录
                os.path.join(os.path.expanduser("~"), "cckz", "config.env"),
                # 尝试当前工作目录的config.env
                os.path.join(os.getcwd(), "config.env"),
            ]
            
            for config_path in possible_paths:
                if os.path.exists(config_path):
                    logger.info(f"尝试从配置文件读取API密钥: {config_path}")
                    try:
                        with open(config_path, 'r', encoding='utf-8') as f:
                            for line in f:
                                line = line.strip()
                                # 跳过注释行
                                if line.startswith('#'):
                                    continue
                                if line.startswith('GEMINI_API_KEY='):
                                    api_key = line.split('=', 1)[1].strip()
                                    # 去除可能的引号
                                    api_key = api_key.strip('"').strip("'")
                                    if api_key and api_key != "AIzaSyBZKqCqcyCrqmbx6RFJFQe-E8spoKD7xK4":
                                        logger.info(f"成功从配置文件读取API密钥: {config_path}")
                                        return api_key
                    except Exception as e:
                        logger.warning(f"读取配置文件失败 {config_path}: {e}")
                        continue
            
            logger.warning("未找到有效的API密钥配置")
            return None
        except Exception as e:
            logger.warning(f"从配置文件读取API密钥失败: {e}")
            return None
    
    def generate_arrangement_prompt(self, 
                                  selected_elements: List[Dict[str, Any]], 
                                  canvas_width: int, 
                                  canvas_height: int,
                                  target_width: int, 
                                  target_height: int) -> str:
        """
        生成Gemini API调用的完整提示词
        
        Args:
            selected_elements: 选中的画布元素列表
            canvas_width: 当前画布宽度
            canvas_height: 当前画布高度
            target_width: 目标宽度
            target_height: 目标高度
            
        Returns:
            完整的提示词字符串
        """
        
        # 格式化元素信息为表格
        element_info_text = self._format_elements_info_table(selected_elements)
        logger.info(element_info_text)
        
        # 提取所有元素的完整ID列表，用于在提示词中明确列出
        element_ids = [str(elem.get('id', 'unknown')) for elem in selected_elements]
        element_ids_text = '\n'.join([f"- {eid}" for eid in element_ids])
        
        prompt = f"""# PSD 图层自适应缩放任务

## 任务目标
将 PSD 文件从原始尺寸自适应转换为目标尺寸，保持设计的视觉平衡和专业性。所有前景图层都要保留，文字产品一定不能重叠!!!

## 输入信息
- **原始尺寸**: {canvas_width}x{canvas_height} (宽x高)
- **目标尺寸**: {target_width}x{target_height} (宽x高)

## 图层ID列表（必须使用这些完整ID）
{element_ids_text}

## 图层数据
```
{element_info_text}
```

## 调整要求

### 1. 基本原则
- 对所有的图层能进行两个操作分别是移动和resize，resize 必须是等比例 resize，不能修改原图层的比例。
- 经过操作之后的图层，最小值不能小于 0，最大值不能超过目标尺寸的范围。！！！
- 保持图层的视觉层次关系
- 确保文字清晰可读，不被裁切
- 产品/主体元素完整展示!!!
- 避免图层间的重叠(特别是文字与产品)!!!,这一点非常重要，可以通过调整文字的大小和产品大小，以及位置来避免重叠，文字的大小一定要进行适度的修改，来匹配修改后的布局。
- 保持设计的视觉平衡和美!!!
- 不要修改原有图层的visible属性!!

### 2. 调整策略
针对不同类型的图层采用不同策略:

**背景图层** (type: "pixel" 或全画布的 shape):
- 根据目标尺寸，对高度或者宽度裁切至目标尺寸
- 或采用居中裁切，确保视觉焦点在画布内

**装饰性图形** (type: "shape"):
- 如果超出新画布范围，考虑等比缩小或重新定位

**文字图层** (type: "text"):
- 优先保证完整性，不被裁切
- 根据目标尺寸和原始尺寸的大小，等比例调整大小，并且调整位置

**其他图层** :
- 根据设计美学整体调整，等比例调整图层的大小和位置

### 3. 输出要求
请为每个图层提供新的坐标信息，格式如下:
```json
[
  {{
    "id": "图层ID(字符串，必须与输入表格中的ID完全一致)",
    "type": "图层类型",
    "original_coords": {{"x": X, "y": Y, "width": W, "height": H}},
    "new_coords": {{"x": X, "y": Y, "width": W, "height": H}}
  }}
]
```

**重要**: 
1. **ID必须完全匹配**: 输出的"id"字段必须与输入表格中的ID完全一致（区分大小写，包括所有字符）
2. 请直接输出JSON数组，不要添加markdown代码块标记(如```json)，确保输出是有效的JSON格式
3. 每个元素都必须有对应的输出项
"""

        return prompt
    
    def _format_elements_info_table(self, elements: List[Dict[str, Any]]) -> str:
        """格式化元素信息为表格形式"""
        lines: list[Any] = []
        
        # 表头 - 增加ID列宽度以容纳完整ID
        header = f"{'ID':<25} {'类型':<15} {'位置(left,top,right,bottom)':<40} {'大小(width×height)':<20}"
        lines.append(header)
        lines.append("-" * 100)
        
        # 元素数据
        x_list,y_list = [element.get('x', 0) for element in elements], [element.get('y', 0) for element in elements]
        min_x,min_y = min(x_list), min(y_list)
        logger.info(f"element:{elements[0].keys()}")
        for element in elements:
            # 使用完整的ID，不再截断
            element_id = str(element.get('id', 'unknown'))
            element_type = element.get('type', 'unknown')[:15]
            x = element.get('x', 0) - min_x
            y = element.get('y', 0) - min_y
            width = element.get('width', 0)
            height = element.get('height', 0)
            angle = element.get('angle', 0)
            style = element.get("fillStyle", "unknown")
            # logger.info(f"{element_id:<15} {element_type:<15} {angle:<10} {style:<15}")
            
            # 保留两位小数以提高可读性
            position = f"({x:.2f}, {y:.2f}, {x+width:.2f}, {y+height:.2f})"
            size = f"{width:.0f}×{height:.0f}"
            
            # 如果ID太长，截断显示但保留完整ID在日志中
            display_id = element_id[:25] if len(element_id) > 25 else element_id
            line = f"{display_id:<25} {element_type:<15} {position:<40} {size:<20}"
            lines.append(line)
        
        return "\n".join(lines)
    
    async def call_gemini_api(self, 
                            prompt: str, 
                            temperature: float = 0.1,
                            max_tokens: int = 32000) -> str:
        """
        调用Gemini API
        
        Args:
            prompt: 提示词
            temperature: 温度参数
            max_tokens: 最大输出token数
            
        Returns:
            API响应文本
        """
        try:
            from google.genai import types
            
            # 创建客户端实例
            client = genai.Client(api_key=self.api_key)
            
            # 构建内容
            contents = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt)
                    ],
                ),
            ]
            
            # 配置生成参数
            generate_content_config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # 生成内容（非流式）
            response_text = ""
            for chunk in client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=generate_content_config,
            ):
                if hasattr(chunk, 'text') and chunk.text:
                    response_text += chunk.text
            
            if not response_text:
                raise ValueError("Gemini API返回的响应中没有文本内容")
            
            logger.info(f"Gemini API调用完成，响应长度: {len(response_text)}")
            return response_text
            
        except Exception as e:
            logger.error(f"Gemini API调用失败: {e}", exc_info=True)
            raise
    
    def parse_gemini_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        解析Gemini的JSON响应
        
        Args:
            response_text: API响应文本
            
        Returns:
            解析后的元素调整信息列表
        """
        logger.info("正在解析Gemini响应...")
        
        # 方法1: 直接解析
        try:
            data = json.loads(response_text.strip())
            logger.info("成功解析JSON响应")
            return data
        except json.JSONDecodeError:
            pass
        
        # 方法2: 提取代码块中的JSON
        json_pattern = r'```(?:json)?\s*(\[[\s\S]*?\])\s*```'
        matches = re.findall(json_pattern, response_text)
        
        if matches:
            try:
                data = json.loads(matches[0])
                logger.info("从代码块中成功提取JSON")
                return data
            except json.JSONDecodeError:
                pass
        
        # 方法3: 查找第一个 [ 到最后一个 ] 之间的内容
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                json_str = response_text[start_idx:end_idx+1]
                data = json.loads(json_str)
                logger.info("通过查找边界成功提取JSON")
                return data
            except json.JSONDecodeError:
                pass
        
        # 如果都失败了，保存原始响应并报错
        logger.error("无法解析Gemini响应为JSON格式")
        raise ValueError(f"无法解析Gemini响应为JSON格式。原始响应: {response_text[:500]}...")
    
    async def arrange_canvas_elements(self, 
                                    selected_elements: List[Dict[str, Any]],
                                    canvas_width: int,
                                    canvas_height: int,
                                    target_width: int,
                                    target_height: int) -> List[Dict[str, Any]]:
        """
        完整的画布元素排列流程
        
        Args:
            selected_elements: 选中的画布元素列表
            canvas_width: 当前画布宽度
            canvas_height: 当前画布高度
            target_width: 目标宽度
            target_height: 目标高度
            
        Returns:
            调整后的元素信息列表
        """
        logger.info("=== CanvasLayerArrangementService.arrange_canvas_elements 被调用 ===")
        logger.info(msg=f"接收到的参数 - 元素数量: {len(selected_elements)}, 画布尺寸: {canvas_width}x{canvas_height}, 目标尺寸: {target_width}x{target_height}")
        try:
            logger.info(f"开始处理画布元素排列，元素数量: {len(selected_elements)}")
            logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
            logger.info(f"目标尺寸: {target_width}x{target_height}")
            
            # 验证和清理元素数据
            cleaned_elements: List[Dict[str, Any]] = self._clean_element_data(selected_elements)
            
            # 生成提示词
            prompt = self.generate_arrangement_prompt(
                cleaned_elements, canvas_width, canvas_height, 
                target_width, target_height
            )
            
            logger.info("生成提示词完成，准备调用Gemini API")
            
            # 调用Gemini API
            response_text = await self.call_gemini_api(prompt)
            
            logger.info("Gemini API调用完成，准备解析响应")
            logger.debug(f"Gemini API响应内容: {response_text[:50]}...")
            
            # 解析响应
            arrangements = self.parse_gemini_response(response_text)
            
            logger.info(f"成功生成 {len(arrangements)} 个元素的调整方案")
            
            # 转换格式：将 left/top/right/bottom 转换为 x/y/width/height
            # 并确保 id 是字符串格式，匹配前端期望
            converted_arrangements = self._convert_arrangements_format(arrangements, selected_elements)
            
            logger.info(f"转换后的排列方案数量: {len(converted_arrangements)}")
            if converted_arrangements:
                logger.info(f"第一个排列方案示例: {converted_arrangements[0]}")
            else:
                logger.error("转换后的排列方案为空，可能是 ID 匹配失败或格式转换问题")
                raise ValueError("无法转换排列方案格式，请检查 Gemini API 返回的数据格式")
            
            # 验证转换后的数据格式
            if len(converted_arrangements) < len(selected_elements):
                logger.warning(f"转换后的排列方案数量 ({len(converted_arrangements)}) 少于原始元素数量 ({len(selected_elements)})")
            
            return converted_arrangements
            
        except Exception as e:
            logger.error(f"画布元素排列失败: {e}")
            raise
    
    def _convert_arrangements_format(self, 
                                    arrangements: List[Dict[str, Any]], 
                                    original_elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将 Gemini 返回的格式转换为前端期望的格式
        
        Args:
            arrangements: Gemini 返回的排列方案（可能包含 left/top/right/bottom）
            original_elements: 原始元素列表，用于查找 id 和类型
            
        Returns:
            转换后的排列方案列表，格式为前端期望的 x/y/width/height
        """
        converted = []
        
        # 创建原始元素的 id 映射，以便匹配
        element_id_map = {str(elem.get('id')): elem for elem in original_elements}
        
        for arr in arrangements:
            try:
                # 获取 id（可能是数字或字符串）
                arr_id = str(arr.get('id', '')).strip()
                
                # 查找原始元素以获取正确的 id 格式
                # 首先尝试精确匹配
                original_element = None
                for elem in original_elements:
                    elem_id = str(elem.get('id', '')).strip()
                    if elem_id == arr_id:
                        original_element = elem
                        break
                
                # 如果精确匹配失败，尝试部分匹配（用于处理ID格式差异）
                if not original_element:
                    for elem in original_elements:
                        elem_id = str(elem.get('id', '')).strip()
                        # 如果arr_id是elem_id的后缀或包含关系，也认为匹配
                        if arr_id in elem_id or elem_id in arr_id:
                            logger.info(f"使用部分匹配找到元素: arr_id={arr_id}, elem_id={elem_id}")
                            original_element = elem
                            break
                
                if not original_element:
                    logger.warning(f"找不到对应的原始元素，id={arr_id}。可用的原始元素ID: {[str(e.get('id', '')) for e in original_elements]}")
                    continue
                
                # 获取原始坐标（前端发送的格式）
                original_coords = {
                    'x': original_element.get('x', 0),
                    'y': original_element.get('y', 0),
                    'width': abs(original_element.get('width', 0)),
                    'height': abs(original_element.get('height', 0))
                }
                
                # 转换新坐标
                new_coords_data = arr.get('new_coords', {})
                new_coords = {}
                
                # 检查是否是 left/top/right/bottom 格式
                if 'left' in new_coords_data and 'top' in new_coords_data:
                    # 转换 left/top/right/bottom 为 x/y/width/height
                    left = float(new_coords_data.get('left', 0))
                    top = float(new_coords_data.get('top', 0))
                    right = float(new_coords_data.get('right', 0))
                    bottom = float(new_coords_data.get('bottom', 0))
                    
                    new_coords = {
                        'x': left,
                        'y': top,
                        'width': abs(right - left),
                        'height': abs(bottom - top)
                    }
                elif 'x' in new_coords_data and 'y' in new_coords_data:
                    # 已经是 x/y/width/height 格式
                    new_coords = {
                        'x': float(new_coords_data.get('x', 0)),
                        'y': float(new_coords_data.get('y', 0)),
                        'width': abs(float(new_coords_data.get('width', 0))),
                        'height': abs(float(new_coords_data.get('height', 0)))
                    }
                else:
                    logger.warning(f"无法识别的坐标格式: {new_coords_data}")
                    continue
                
                # 构建转换后的排列方案
                converted_arr = {
                    'id': str(original_element.get('id')),  # 确保 id 是字符串
                    'type': arr.get('type', original_element.get('type', 'unknown')),
                    'original_coords': original_coords,
                    'new_coords': new_coords,
                    'scale_factor': arr.get('scale_factor', 1.0),
                    'adjustment_reason': arr.get('adjustment_reason', ''),
                    'quality_check': arr.get('quality_check', ''),
                    'warnings': arr.get('warnings', [])
                }
                
                converted.append(converted_arr)
                
            except Exception as e:
                logger.error(f"转换排列方案格式失败: {e}, arrangement: {arr}")
                continue
        
        return converted
    
    def _clean_element_data(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        清理和验证元素数据，确保坐标和尺寸有效
        
        Args:
            elements: 元素列表
            
        Returns:
            清理后的元素列表
        """
        cleaned_elements = []
        for element in elements:
            # 创建元素副本
            cleaned_element = element.copy()
            
            # 确保必要的数值字段存在且为数值类型
            for field in ['x', 'y', 'width', 'height']:
                if field not in cleaned_element or cleaned_element[field] is None:
                    cleaned_element[field] = 0
                else:
                    # 确保是数值类型
                    try:
                        cleaned_element[field] = float(cleaned_element[field])
                    except (ValueError, TypeError):
                        cleaned_element[field] = 0
            
            # 确保尺寸为正数
            cleaned_element['width'] = abs(cleaned_element['width'])
            cleaned_element['height'] = abs(cleaned_element['height'])
            
            # 记录清理后的元素信息
            logger.debug(f"清理元素数据: ID={cleaned_element.get('id')}, 位置=({cleaned_element['x']:.2f}, {cleaned_element['y']:.2f}), 尺寸={cleaned_element['width']:.2f}×{cleaned_element['height']:.2f}")
            
            cleaned_elements.append(cleaned_element)
        
        return cleaned_elements