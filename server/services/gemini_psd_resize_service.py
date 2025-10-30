#!/usr/bin/env python3
"""
Gemini PSD自動縮放服務
整合Gemini 2.5 Pro API進行PSD圖層智能縮放
"""

import base64
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
try:
    from google import genai
    from google.genai import types
except ImportError:
    import google.generativeai as genai
    types = None
import logging

logger = logging.getLogger(__name__)


class GeminiPSDResizeService:
    """Gemini PSD自動縮放服務類"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        初始化服務
        
        Args:
            api_key: Gemini API密鑰，如果不提供則從環境變量或配置文件讀取
            model_name: 模型名稱，默認使用 gemini-2.5-pro，可選 gemini-1.5-flash（更快但可能效果稍差）
        """
        self.api_key = api_key or self._load_api_key_from_config()
        if not self.api_key:
            raise ValueError("需要提供Gemini API密鑰，通過參數、GEMINI_API_KEY環境變量或config.env文件")
        
        # 设置API密钥和初始化客户端
        os.environ["GOOGLE_API_KEY"] = self.api_key
        # 支持模型选择：gemini-2.5-pro（更好质量）或 gemini-1.5-flash（更快速度）
        self.model_name = model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-pro")
        logger.info(f"使用模型: {self.model_name}")
        
        # 初始化客户端
        try:
            # 尝试使用新版 google-genai SDK
            self.client = genai.Client(api_key=self.api_key)
            self.use_new_sdk = True
            self.genai_old = None
            logger.info("使用 google-genai SDK (新版)")
        except (AttributeError, TypeError) as e:
            # 回退到旧版 google-generativeai
            logger.info(f"新版SDK初始化失败 ({e})，回退到旧版SDK")
            # 重新导入旧版SDK以确保使用正确的API
            import google.generativeai as genai_old
            self.genai_old = genai_old  # 先保存引用
            genai_old.configure(api_key=self.api_key)
            self.client = None
            self.use_new_sdk = False
            logger.info("使用 google-generativeai SDK (旧版)")
    
    def _load_api_key_from_config(self) -> Optional[str]:
        """從配置文件加載API密鑰"""
        try:
            # 首先嘗試從環境變量讀取
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key and api_key not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
                logger.info(f"从环境变量加载 API key: {api_key[:10]}...")
                return api_key
            
            # 嘗試從config.env文件讀取
            # 从server目录向上两级到项目根目录
            config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.env")
            if os.path.exists(config_path):
                logger.info(f"找到配置文件: {config_path}")
                with open(config_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
                            api_key = line.split('=', 1)[1].strip()
                            # 排除常见的占位符，但接受实际的 API key
                            if api_key and api_key not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
                                logger.info(f"从配置文件加载 API key: {api_key[:10]}...")
                                return api_key
            else:
                logger.warning(f"配置文件不存在: {config_path}")
            
            return None
        except Exception as e:
            logger.warning(f"從配置文件讀取API密鑰失敗: {e}")
            return None
    
    def generate_resize_prompt(self, 
                            layers_info: List[Dict[str, Any]], 
                            original_width: int, 
                            original_height: int,
                            target_width: int, 
                            target_height: int) -> str:
        """
        生成Gemini API調用的完整提示詞
        
        Args:
            layers_info: 圖層信息列表
            original_width: 原始寬度
            original_height: 原始高度
            target_width: 目標寬度
            target_height: 目標高度
            
        Returns:
            完整的提示詞字符串
        """
        
        # 格式化圖層信息為表格
        layer_info_text = self._format_layers_info_table(layers_info)
        
        prompt = f"""# PSD 圖層智能縮放任務

## 🎯 任務目標
將 PSD 文件從原始尺寸 {original_width}x{original_height} 智能縮放至目標尺寸 {target_width}x{target_height}，保持設計的視覺平衡、專業性和可讀性。

## 📊 原始圖層信息
```
{layer_info_text}
```

## 🔧 縮放規則與策略

### 1. 核心原則
- **等比例縮放**: 所有圖層必須保持原始比例，不得變形
- **邊界限制**: 調整後的圖層不得超出目標畫布範圍 (0,0) 到 ({target_width},{target_height})
- **視覺層次**: 保持圖層間的視覺層次關係和重要性
- **內容完整性**: 確保所有重要內容（文字、產品、標誌）完整可見
- **避免重疊**: 特別注意文字與產品/圖像之間的重疊問題
- **美學平衡**: 保持整體設計的美觀和專業性

### 2. 圖層類型處理策略

#### 🖼️ 背景圖層 (Background)
- **像素背景**: 根據目標尺寸進行居中裁切或等比縮放
- **純色背景**: 直接擴展至目標尺寸
- **漸變背景**: 保持漸變方向，調整至目標尺寸

#### 📝 文字圖層 (Text)
- **優先級**: 最高優先級，確保完全可見
- **縮放策略**: 根據畫布縮放比例調整字體大小
- **位置調整**: 避免與其他元素重疊，保持可讀性
- **最小尺寸**: 確保文字在目標尺寸下仍然清晰可讀

#### 🛍️ 產品圖像 (Product)
- **完整性**: 確保產品完整展示，不被裁切
- **比例保持**: 嚴格保持原始寬高比
- **位置優化**: 根據目標尺寸重新定位，避免與文字重疊

#### 🎨 裝飾元素 (Decoration)
- **次要優先級**: 在保證主要內容的前提下調整
- **比例縮放**: 等比例縮放至合適大小
- **位置調整**: 保持與主要元素的相對位置關係

#### 📐 形狀圖層 (Shape)
- **矢量保持**: 保持形狀的幾何特性
- **比例縮放**: 等比例調整大小
- **位置重排**: 根據新畫布尺寸重新定位

### 3. 智能調整算法

#### 📏 縮放比例計算
```
縮放比例 = min(目標寬度/原始寬度, 目標高度/原始高度)
```

#### 🎯 位置調整策略
1. **中心對齊**: 主要元素優先居中對齊
2. **邊距保持**: 保持適當的邊距比例
3. **重疊檢測**: 自動檢測並避免元素重疊
4. **視覺平衡**: 確保整體視覺平衡

#### 🔍 質量保證檢查
- 所有圖層都在目標畫布範圍內
- 文字清晰可讀，無裁切
- 產品完整展示
- 無元素重疊
- 保持設計美學

## 📋 輸出格式要求

請為每個圖層提供新的坐標信息，使用以下JSON格式：

```json
[
  {{
    "id": 圖層ID,
    "name": "圖層名稱",
    "type": "圖層類型",
    "level": 圖層層級,
    "visible": true/false,
    "original_coords": {{
      "left": 原始左邊界,
      "top": 原始上邊界,
      "right": 原始右邊界,
      "bottom": 原始下邊界
    }},
    "new_coords": {{
      "left": 新左邊界,
      "top": 新上邊界,
      "right": 新右邊界,
      "bottom": 新下邊界
    }},
    "scale_factor": 縮放比例,
    "adjustment_reason": "調整原因說明",
    "quality_check": "質量檢查結果",
    "warnings": ["潛在問題警告"]
  }}
]
```

## ⚠️ 重要注意事項

1. **JSON格式**: 直接輸出JSON數組，不要包含markdown代碼塊標記
2. **數據完整性**: 確保所有圖層都有對應的調整信息
3. **邊界檢查**: 所有坐標值必須在 [0, {target_width}] x [0, {target_height}] 範圍內
4. **比例保持**: 新尺寸必須保持原始寬高比
5. **可見性**: 保持原始圖層的visible屬性
6. **錯誤處理**: 如果某個圖層無法調整，請在warnings中說明原因

## 🎨 設計美學要求

- **視覺層次**: 保持重要元素在前景，次要元素在背景
- **色彩平衡**: 確保調整後色彩分布均勻
- **空間利用**: 合理利用目標畫布空間
- **專業外觀**: 保持商業設計的專業性和美觀性

請基於以上規則和策略，為每個圖層生成最優的縮放和位置調整方案。"""

        return prompt
    
    def _format_layers_info_table(self, layers_info: List[Dict[str, Any]]) -> str:
        """格式化圖層信息為表格形式"""
        lines = []
        
        # 表頭
        header = f"{'ID':<5} {'層級':<5} {'圖層名稱':<30} {'類型':<15} {'可見':<6} {'位置(left,top,right,bottom)':<40} {'大小(width×height)':<20}"
        lines.append(header)
        lines.append("-" * 130)
        
        # 圖層數據
        for info in layers_info:
            indent = "  " * info.get('level', 0)
            name = f"{indent}{info['name']}"
            position = f"({info['left']}, {info['top']}, {info['right']}, {info['bottom']})"
            size = f"{info['width']}×{info['height']}"
            visible = "是" if info.get('visible', True) else "否"
            
            line = f"{info['id']:<5} {info.get('level', 0):<5} {name:<30} {info['type']:<15} {visible:<6} {position:<40} {size:<20}"
            lines.append(line)
        
        return "\n".join(lines)
    
    async def call_gemini_api(self, 
                            prompt: str, 
                            image_base64: str,
                            temperature: float = 0.1,
                            max_tokens: int = 32000,
                            max_retries: int = 3,
                            timeout: int = 480) -> str:
        """
        調用Gemini API（带重试机制和超时控制）
        
        Args:
            prompt: 提示詞
            image_base64: 圖像的base64編碼
            temperature: 溫度參數
            max_tokens: 最大輸出token數
            max_retries: 最大重试次数（针对配额错误）
            timeout: API调用超时时间（秒），默认480秒（8分钟）
            
        Returns:
            API響應文本
        """
        import time
        import asyncio
        
        for attempt in range(max_retries):
            try:
                import base64
                from PIL import Image
                from io import BytesIO
                
                # 準備圖像數據
                image_data = base64.b64decode(image_base64)
                image = Image.open(BytesIO(image_data))
                
                async def _make_api_call():
                    if self.use_new_sdk and self.client:
                        # 使用新版 google-genai SDK
                        logger.info(f"使用新版SDK調用Gemini API (超时: {timeout}秒)")
                        
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
                        return response.candidates[0].content.parts[0].text
                    else:
                        # 使用旧版 google-generativeai SDK
                        logger.info(f"使用旧版SDK調用Gemini API (超时: {timeout}秒)")
                        
                        model = self.genai_old.GenerativeModel(self.model_name)
                        
                        # 生成內容
                        response = model.generate_content(
                            [prompt, image],
                            generation_config={
                                "temperature": temperature,
                                "max_output_tokens": max_tokens,
                            }
                        )
                        
                        return response.text
                
                # 使用asyncio.wait_for添加超时控制
                try:
                    result = await asyncio.wait_for(_make_api_call(), timeout=timeout)
                    return result
                except asyncio.TimeoutError:
                    raise Exception(f"Gemini API调用超时（超过{timeout}秒）。建议：减少图层数量或稍后重试。")
                
            except Exception as e:
                error_str = str(e)
                error_type = type(e).__name__
                
                # 检查是否是配额错误
                is_quota_error = (
                    '429' in error_str or 
                    'RESOURCE_EXHAUSTED' in error_str or
                    'quota' in error_str.lower() or
                    'rate limit' in error_str.lower()
                )
                
                if is_quota_error and attempt < max_retries - 1:
                    # 指数退避重试
                    wait_time = (2 ** attempt) * 5  # 5秒, 10秒, 20秒...
                    logger.warning(f"配额限制错误，{wait_time}秒后进行第{attempt + 2}次重试...")
                    await asyncio.sleep(wait_time)
                    continue
                
                # 记录详细错误信息
                logger.error(f"Gemini API調用失敗: {e}")
                logger.error(f"错误详情: {error_type}: {error_str}")
                
                # 提供更友好的错误消息
                if is_quota_error:
                    raise Exception(
                        f"Gemini API 配额已用尽。\n"
                        f"免费配额限制：每分钟 15 次，每天 1,500 次。\n"
                        f"解决方案：\n"
                        f"1. 等待一段时间后重试\n"
                        f"2. 访问 https://ai.dev/usage?tab=rate-limit 查看配额使用情况\n"
                        f"3. 考虑升级到付费计划以获得更高配额\n"
                        f"原始错误: {error_str}"
                    )
                
                raise
    
    def parse_gemini_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        解析Gemini的JSON響應
        
        Args:
            response_text: API響應文本
            
        Returns:
            解析後的圖層調整信息列表
        """
        logger.info("正在解析Gemini響應...")
        
        # 方法1: 直接解析
        try:
            data = json.loads(response_text.strip())
            logger.info("成功解析JSON響應")
            return data
        except json.JSONDecodeError:
            pass
        
        # 方法2: 提取代碼塊中的JSON
        json_pattern = r'```(?:json)?\s*(\[[\s\S]*?\])\s*```'
        matches = re.findall(json_pattern, response_text)
        
        if matches:
            try:
                data = json.loads(matches[0])
                logger.info("從代碼塊中成功提取JSON")
                return data
            except json.JSONDecodeError:
                pass
        
        # 方法3: 查找第一個 [ 到最後一個 ] 之間的內容
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                json_str = response_text[start_idx:end_idx+1]
                data = json.loads(json_str)
                logger.info("通過查找邊界成功提取JSON")
                return data
            except json.JSONDecodeError:
                pass
        
        # 如果都失敗了，保存原始響應並報錯
        logger.error("無法解析Gemini響應為JSON格式")
        raise ValueError(f"無法解析Gemini響應為JSON格式。原始響應: {response_text[:500]}...")
    
    async def resize_psd_layers(self, 
                              layers_info: List[Dict[str, Any]],
                              detection_image_path: str,
                              original_width: int,
                              original_height: int,
                              target_width: int,
                              target_height: int) -> List[Dict[str, Any]]:
        """
        完整的PSD圖層縮放流程
        
        Args:
            layers_info: 圖層信息列表
            detection_image_path: 檢測框圖像路徑
            original_width: 原始寬度
            original_height: 原始高度
            target_width: 目標寬度
            target_height: 目標高度
            
        Returns:
            調整後的圖層信息列表
        """
        try:
            # 生成提示詞
            prompt = self.generate_resize_prompt(
                layers_info, original_width, original_height, 
                target_width, target_height
            )
            
            # 讀取檢測框圖像並轉換為base64
            with open(detection_image_path, 'rb') as f:
                image_data = f.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # 調用Gemini API
            response_text = await self.call_gemini_api(prompt, image_base64)
            
            # 解析響應
            new_positions = self.parse_gemini_response(response_text)
            
            logger.info(f"成功生成 {len(new_positions)} 個圖層的調整方案")
            return new_positions
            
        except Exception as e:
            logger.error(f"PSD圖層縮放失敗: {e}")
            raise
    
    async def resize_selected_layers(self,
                                   layers_info: List[Dict[str, Any]],
                                   detection_image_path: str,
                                   original_width: int,
                                   original_height: int,
                                   target_width: int,
                                   target_height: int) -> List[Dict[str, Any]]:
        """
        对选中的图层进行智能缩放
        
        Args:
            layers_info: 选中的图层信息列表
            detection_image_path: 检测框图像路径
            original_width: 原始宽度
            original_height: 原始高度
            target_width: 目标宽度
            target_height: 目标高度
        
        Returns:
            新的图层位置和尺寸列表
        """
        logger.info(f"开始调用Gemini API分析选中的 {len(layers_info)} 个图层")
        
        # 生成针对选中图层的提示词
        prompt = self.generate_selected_layers_prompt(
            layers_info=layers_info,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        # 调用Gemini API
        response_text = await self.call_gemini_api(
            prompt=prompt,
            image_path=detection_image_path
        )
        
        # 解析结果
        new_positions = self.parse_gemini_response(response_text)
        
        logger.info(f"成功获取 {len(new_positions)} 个图层的新位置")
        return new_positions
    
    def generate_selected_layers_prompt(self,
                                       layers_info: List[Dict[str, Any]],
                                       original_width: int,
                                       original_height: int,
                                       target_width: int,
                                       target_height: int) -> str:
        """
        生成针对选中图层的提示词
        """
        # 构建图层信息
        layers_json = []
        for i, layer in enumerate(layers_info):
            layers_json.append({
                "index": layer['index'],
                "name": layer['name'],
                "type": layer.get('type', 'layer'),
                "bounds": layer['bounds'],
                "width": layer['width'],
                "height": layer['height']
            })
        
        layers_str = json.dumps(layers_json, indent=2, ensure_ascii=False)
        
        prompt = f"""你是一个专业的PSD图层缩放专家。用户选中了 {len(layers_info)} 个图层进行智能缩放。

**原始画布尺寸**: {original_width} x {original_height}
**目标画布尺寸**: {target_width} x {target_height}

**选中的图层信息**:
```json
{layers_str}
```

**任务要求**:
1. **保持相对位置**: 选中图层之间的相对位置关系要保持一致
2. **等比例缩放**: 每个图层按相同比例缩放，避免变形
3. **边界限制**: 确保所有图层都在目标画布范围内
4. **文字优先**: 文字图层优先保证可读性和完整性
5. **美学平衡**: 整体布局保持美观和专业

**请直接返回JSON格式的结果（不要使用markdown代码块）**:
```json
[
  {{
    "index": 0,
    "name": "图层名称",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150,
    "reasoning": "缩放理由"
  }}
]
```

注意：
- 返回的图层数量必须等于选中的图层数量
- 每个图层的 index 必须与输入的 index 对应
- 所有坐标和尺寸必须为整数
- 确保 x, y, width, height 都在合理范围内"""

        return prompt


# 使用示例
async def example_usage():
    """使用示例"""
    # 初始化服務
    service = GeminiPSDResizeService()
    
    # 示例圖層信息
    layers_info = [
        {
            'id': 0,
            'name': '背景',
            'type': 'pixel',
            'level': 0,
            'visible': True,
            'left': 0,
            'top': 0,
            'right': 1200,
            'bottom': 800,
            'width': 1200,
            'height': 800
        },
        {
            'id': 1,
            'name': '產品圖片',
            'type': 'pixel',
            'level': 0,
            'visible': True,
            'left': 100,
            'top': 150,
            'right': 500,
            'bottom': 450,
            'width': 400,
            'height': 300
        },
        {
            'id': 2,
            'name': '標題文字',
            'type': 'text',
            'level': 0,
            'visible': True,
            'left': 600,
            'top': 200,
            'right': 1100,
            'bottom': 280,
            'width': 500,
            'height': 80
        }
    ]
    
    # 調用縮放服務
    try:
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path="detection.png",
            original_width=1200,
            original_height=800,
            target_width=800,
            target_height=600
        )
        
        print("縮放結果:")
        for pos in new_positions:
            print(f"圖層 {pos['id']}: {pos['name']}")
            print(f"  原始位置: {pos['original_coords']}")
            print(f"  新位置: {pos['new_coords']}")
            print(f"  縮放比例: {pos.get('scale_factor', 'N/A')}")
            print(f"  調整原因: {pos.get('adjustment_reason', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"錯誤: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())

