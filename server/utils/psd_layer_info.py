#!/usr/bin/env python3
"""
PSD圖層信息提取工具
用於提取PSD文件的圖層信息並生成檢測框圖像
"""

from psd_tools import PSDImage
from PIL import Image, ImageDraw, ImageFont
import random
from typing import List, Dict, Any, Tuple, Optional


def get_psd_layers_info(psd_file_path: str) -> Tuple[PSDImage, List[Dict[str, Any]]]:
    """
    讀取PSD文件並獲取所有圖層的位置和大小信息

    參數:
        psd_file_path: PSD文件路徑

    返回:
        psd對象, 包含所有圖層信息的列表
    """
    # 打開PSD文件
    psd = PSDImage.open(psd_file_path)

    # 獲取圖像尺寸
    img_width = psd.width
    img_height = psd.height

    layers_info = []
    layer_id = 0

    def clamp_bbox(bbox: Tuple[int, int, int, int], width: int, height: int) -> Tuple[int, int, int, int]:
        """限制邊界框在圖像範圍內"""
        left = max(0, min(bbox[0], width))
        top = max(0, min(bbox[1], height))
        right = max(0, min(bbox[2], width))
        bottom = max(0, min(bbox[3], height))
        return (left, top, right, bottom)

    def process_layer(layer, level: int = 0) -> None:
        """遞歸處理圖層(包括圖層組)"""
        nonlocal layer_id

        # 獲取圖層邊界框
        bbox = layer.bbox

        # 限制邊界框在圖像範圍內
        clamped_bbox = clamp_bbox(bbox, img_width, img_height)

        layer_info = {
            'id': layer_id,
            'index': layer_id,  # 添加 index 键用于兼容性
            'name': layer.name,
            'type': layer.kind,
            'visible': layer.visible,
            'left': clamped_bbox[0],      # 左邊界 x
            'top': clamped_bbox[1],       # 上邊界 y
            'right': clamped_bbox[2],     # 右邊界 x
            'bottom': clamped_bbox[3],    # 下邊界 y
            'width': clamped_bbox[2] - clamped_bbox[0],   # 寬度
            'height': clamped_bbox[3] - clamped_bbox[1],  # 高度
            'level': level,  # 圖層嵌套層級
            'bounds': {  # 添加 bounds 格式用于兼容性
                'left': clamped_bbox[0],
                'top': clamped_bbox[1],
                'right': clamped_bbox[2],
                'bottom': clamped_bbox[3]
            }
        }

        layer_id += 1
        layers_info.append(layer_info)

        # 如果是圖層組,遞歸處理子圖層
        if hasattr(layer, '__iter__'):
            for child in layer:
                process_layer(child, level + 1)

    # 處理所有頂層圖層
    for layer in psd:
        process_layer(layer)

    return psd, layers_info


def draw_detection_boxes(psd: PSDImage, layers_info: List[Dict[str, Any]], output_path: str) -> Image.Image:
    """
    在圖像上繪製檢測框

    參數:
        psd: PSD對象
        layers_info: 圖層信息列表
        output_path: 輸出圖像路徑
    """
    # 將PSD轉換為PIL Image
    image = psd.composite()

    # 創建繪圖對象
    draw = ImageDraw.Draw(image)

    # 嘗試加載字體，如果失敗使用默認字體
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 40)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
        except:
            font = ImageFont.load_default()

    # 使用紅色作為統一的檢測框顏色
    color = (255, 0, 0)  # 紅色

    # 為每個圖層繪製檢測框
    for info in layers_info:
        # 繪製矩形框
        left, top, right, bottom = info['left'], info['top'], info['right'], info['bottom']

        # 只繪製有效的框（寬度和高度大於0）
        if right > left and bottom > top:
            draw.rectangle([left, top, right, bottom], outline=color, width=3)

            # 繪製標籤背景
            label = f"{info['id']}"
            bbox = draw.textbbox((left, top - 50), label, font=font)
            draw.rectangle(bbox, fill=color)

            # 繪製標籤文字
            draw.text((left, top - 50), label, fill='white', font=font)

    # 保存圖像
    image.save(output_path)
    print(f"檢測框圖像已保存到: {output_path}")

    return image


def print_layers_info(layers_info: List[Dict[str, Any]]) -> None:
    """打印圖層信息"""
    print(f"{'ID':<5} {'層級':<5} {'圖層名稱':<30} {'類型':<15} {'位置(x,y)':<20} {'大小(w×h)':<20}")
    print("-" * 100)

    for info in layers_info:
        indent = "  " * info['level']
        name = f"{indent}{info['name']}"
        position = f"({info['left']}, {info['top']})"
        size = f"{info['width']}×{info['height']}"

        print(f"{info['id']:<5} {info['level']:<5} {name:<30} {info['type']:<15} {position:<20} {size:<20}")


# 使用示例
if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("使用方法: python psd_layer_info.py <psd文件路徑>")
        sys.exit(1)

    psd_file = sys.argv[1]

    # 獲取圖層信息
    psd, layers_info = get_psd_layers_info(psd_file)
    print_layers_info(layers_info)

    # 輸出為JSON格式
    base_name = psd_file.rsplit('.', 1)[0]
    json_file = base_name + '_layers_info.json'
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(layers_info, f, ensure_ascii=False, indent=2)

    # 繪製檢測框
    output_image = base_name + '_detection.png'
    draw_detection_boxes(psd, layers_info, output_image)

    print(f"\n總共 {len(layers_info)} 個圖層")
    print(f"詳細信息已保存到: {json_file}")

