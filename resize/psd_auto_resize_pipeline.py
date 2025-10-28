#!/usr/bin/env python3
"""
PSD自动缩放完整流程
1. 提取PSD图层信息并生成检测框图片
2. 调用Gemini 2.5 Pro生成新的图层位置
3. 根据新位置重建PSD并渲染输出
"""

import base64
import os
import sys
import json
import re
from pathlib import Path
import google.generativeai as genai
from google.generativeai import types

# 导入现有的模块
from psd_layer_info import get_psd_layers_info, draw_detection_boxes, print_layers_info
from resize_psd import resize_psd_with_new_positions


class PSDAutoResizePipeline:
    def __init__(self, psd_path, target_width, target_height, api_key=None):
        """
        初始化PSD自动缩放流程

        参数:
            psd_path: 原始PSD文件路径
            target_width: 目标宽度
            target_height: 目标高度
            api_key: Gemini API密钥（如果不提供，从环境变量读取）
        """
        self.psd_path = Path(psd_path)
        self.target_width = target_width
        self.target_height = target_height
        # self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.api_key = "AIzaSyBi***************"

        if not self.api_key:
            raise ValueError("需要提供Gemini API密钥，通过参数或GEMINI_API_KEY环境变量")

        # 设置输出文件路径
        self.base_name = self.psd_path.stem
        self.output_dir = self.psd_path.parent
        # 文件名加上时间戳
        import time
        timestamp = time.strftime("%Y%m%d_%H%M%S", time.localtime())
        self.layer_info_json = self.output_dir / f"{self.base_name}_{timestamp}_layers_info.json"
        self.detection_image = self.output_dir / f"{self.base_name}_{timestamp}_detection.png"
        self.new_position_json = self.output_dir / f"{self.base_name}_{timestamp}_new_positions.json"
        self.output_psd = self.output_dir / f"{self.base_name}_{timestamp}_resized.psd"
        self.output_png = self.output_dir / f"{self.base_name}_{timestamp}_resized.png"

    def step1_extract_layer_info(self):
        """
        步骤1: 提取PSD图层信息并生成检测框图片
        """
        print("=" * 80)
        print("步骤1: 提取PSD图层信息")
        print("=" * 80)

        # 获取图层信息
        psd, layers_info = get_psd_layers_info(str(self.psd_path))
        self.psd = psd
        self.layers_info = layers_info
        self.original_width = psd.width
        self.original_height = psd.height

        print(f"\n原始画布尺寸: {self.original_width} x {self.original_height}")
        print(f"目标画布尺寸: {self.target_width} x {self.target_height}")
        print(f"共有 {len(layers_info)} 个图层\n")

        # 打印图层信息
        print_layers_info(layers_info)

        # 保存图层信息到JSON
        with open(self.layer_info_json, 'w', encoding='utf-8') as f:
            json.dump(layers_info, f, ensure_ascii=False, indent=2)
        print(f"\n图层信息已保存到: {self.layer_info_json}")

        # 绘制检测框
        draw_detection_boxes(psd, layers_info, str(self.detection_image))
        print(f"检测框图像已保存到: {self.detection_image}")

        return psd, layers_info

    def step2_generate_new_positions_with_gemini(self):
        """
        步骤2: 使用Gemini 2.5 Pro生成新的图层位置
        """
        print("\n" + "=" * 80)
        print("步骤2: 调用Gemini 2.5 Pro生成新的图层位置")
        print("=" * 80)

        # 构建图层信息文本
        layer_info_text = self._format_layer_info_for_prompt()

        # 构建prompt
        prompt = self._build_prompt(layer_info_text)

        # 读取检测框图片并转换为base64
        with open(self.detection_image, 'rb') as f:
            image_data = f.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # 调用Gemini API
        print("\n正在调用Gemini API...")
        response_text = self._call_gemini_api(prompt, image_base64)

        # 解析JSON响应
        new_positions = self._parse_gemini_response(response_text)

        # 保存新位置信息
        with open(self.new_position_json, 'w', encoding='utf-8') as f:
            json.dump(new_positions, f, ensure_ascii=False, indent=2)

        print(f"\n新的图层位置已保存到: {self.new_position_json}")
        return new_positions

    def step3_rebuild_psd(self):
        """
        步骤3: 根据新位置重建PSD并渲染为PNG
        """
        print("\n" + "=" * 80)
        print("步骤3: 重建并渲染为PNG")
        print("=" * 80)

        # 调用resize_psd_with_new_positions函数，输出 PNG 文件
        result_image = resize_psd_with_new_positions(
            str(self.psd_path),
            str(self.new_position_json),
            str(self.output_png),
            self.target_width,
            self.target_height
        )

        print(f"\n最终 PNG 文件已保存到: {self.output_png}")
        return result_image

    def run(self):
        """
        运行完整流程
        """
        print("\n" + "=" * 80)
        print(f"开始PSD自动缩放流程")
        print(f"输入文件: {self.psd_path}")
        print(f"目标尺寸: {self.target_width} x {self.target_height}")
        print("=" * 80 + "\n")

        try:
            # 步骤1: 提取图层信息
            self.step1_extract_layer_info()

            # 步骤2: 使用Gemini生成新位置
            self.step2_generate_new_positions_with_gemini()

            # 步骤3: 重建PSD
            self.step3_rebuild_psd()

            print("\n" + "=" * 80)
            print("流程完成!")
            print("=" * 80)
            print(f"\n生成的文件:")
            print(f"  - 新位置JSON: {self.new_position_json}")
            print(f"  - 输出PNG文件: {self.output_png}")

        except Exception as e:
            print(f"\n错误: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

    def _format_layer_info_for_prompt(self):
        """格式化图层信息为prompt文本"""
        lines = []
        lines.append(f"{'ID':<5} {'层级':<5} {'图层名称':<30} {'类型':<15} {'可见':<6} {'位置(left,top,right,bottom)':<40} {'大小(width×height)':<20}")
        lines.append("-" * 130)

        for info in self.layers_info:
            indent = "  " * info['level']
            name = f"{indent}{info['name']}"
            position = f"({info['left']}, {info['top']}, {info['right']}, {info['bottom']})"
            size = f"{info['width']}×{info['height']}"
            visible = "是" if info['visible'] else "否"

            lines.append(f"{info['id']:<5} {info['level']:<5} {name:<30} {info['type']:<15} {visible:<6} {position:<40} {size:<20}")

        return "\n".join(lines)

    def _build_prompt(self, layer_info_text):
        """构建Gemini prompt"""
        prompt = f"""# PSD 图层自适应缩放任务

## 任务目标
将 PSD 文件从原始尺寸自适应转换为目标尺寸，保持设计的视觉平衡和专业性。所有前景图层都要保留，文字产品一定不能重叠!!!

## 输入信息
- **原始尺寸**: {self.original_width}x{self.original_height} (宽x高)
- **目标尺寸**: {self.target_width}x{self.target_height} (宽x高)

## 图层数据
```
{layer_info_text}
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
    "id": 图层ID(数字),
    "name": "图层名称",
    "original_coords": {{"left": X, "top": Y, "right": X, "bottom": Y}},
    "type": "图层类型",
    "level": 图层层级(数字),
    "new_coords": {{"left": X, "top": Y, "right": X, "bottom": Y}},
    "adjustment_notes": "说明此调整的原因以及如何确保视觉效果",
    "precautions": "需要人工检查的潜在问题"
  }}
]
```

**重要**: 请直接输出JSON数组，不要添加markdown代码块标记(如```json)，确保输出是有效的JSON格式。
"""
        return prompt

    def _call_gemini_api(self, prompt, image_base64):
        """调用Gemini API"""
        client = genai.Client(api_key=self.api_key)

        model = "gemini-2.5-pro"

        # 构建内容，包括文本和图片
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(
                        data=base64.b64decode(image_base64),
                        mime_type="image/png"
                    )
                ],
            ),
        ]

        generate_content_config = types.GenerateContentConfig(
            temperature=0.,
            max_output_tokens=32000,
        )

        # 流式获取响应
        response_text = ""
        print("\nGemini响应:")
        print("-" * 80)

        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                print(chunk.text, end="", flush=True)
                response_text += chunk.text

        print("\n" + "-" * 80)

        return response_text

    def _parse_gemini_response(self, response_text):
        """解析Gemini的JSON响应"""
        print("\n正在解析Gemini响应...")

        # 尝试提取JSON内容
        # 方法1: 直接解析
        try:
            data = json.loads(response_text.strip())
            print("成功解析JSON响应")
            return data
        except json.JSONDecodeError:
            pass

        # 方法2: 提取代码块中的JSON
        json_pattern = r'```(?:json)?\s*(\[[\s\S]*?\])\s*```'
        matches = re.findall(json_pattern, response_text)

        if matches:
            try:
                data = json.loads(matches[0])
                print("从代码块中成功提取JSON")
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
                print("通过查找边界成功提取JSON")
                return data
            except json.JSONDecodeError:
                pass

        # 如果都失败了，保存原始响应并报错
        error_file = self.output_dir / f"{self.base_name}_gemini_response_error.txt"
        with open(error_file, 'w', encoding='utf-8') as f:
            f.write(response_text)

        raise ValueError(f"无法解析Gemini响应为JSON格式。原始响应已保存到: {error_file}")


def main():
    """主函数"""
    if len(sys.argv) < 4:
        print("使用方法: python psd_auto_resize_pipeline.py <PSD文件> <目标宽度> <目标高度> [API密钥]")
        print("示例: python psd_auto_resize_pipeline.py input.psd 1200 628")
        print("\n注意: API密钥可以通过参数传递，或设置环境变量 GEMINI_API_KEY")
        sys.exit(1)

    psd_path = sys.argv[1]
    target_width = int(sys.argv[2])
    target_height = int(sys.argv[3])
    api_key = sys.argv[4] if len(sys.argv) > 4 else None

    # 创建并运行流程
    pipeline = PSDAutoResizePipeline(psd_path, target_width, target_height, api_key)
    pipeline.run()


if __name__ == "__main__":
    main()
