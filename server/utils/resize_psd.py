#!/usr/bin/env python3
"""
PSD圖層縮放和重建工具
根據新的位置信息對每個圖層進行resize和repositioning
"""

from psd_tools import PSDImage
from PIL import Image
import json
import sys
from typing import List, Dict, Any, Optional


def resize_psd_with_new_positions(psd_file_path: str, 
                                 new_pos_json_path: str, 
                                 output_path: str,
                                 target_width: int,
                                 target_height: int) -> Image.Image:
    """
    根據新的位置信息對每個圖層進行resize和repositioning

    參數:
        psd_file_path: 原始PSD文件路徑
        new_pos_json_path: 新位置JSON文件路徑
        output_path: 輸出文件路徑
        target_width: 目標寬度
        target_height: 目標高度
    """
    # 讀取PSD文件
    psd = PSDImage.open(psd_file_path)

    # 讀取新位置信息
    with open(new_pos_json_path, 'r', encoding='utf-8') as f:
        new_positions = json.load(f)

    # 創建ID到新位置的映射，轉換新的JSON格式
    pos_map = {}
    
    for item in new_positions:
        new_coord = item['new_coords']
        pos_map[item['id']] = {
            'id': item['id'],
            'name': item['name'],
            'type': item.get('type', 'unknown'),
            'level': item.get('level', 0),
            'left': new_coord['left'],
            'top': new_coord['top'],
            'right': new_coord['right'],
            'bottom': new_coord['bottom'],
            'width': new_coord['right'] - new_coord['left'],
            'height': new_coord['bottom'] - new_coord['top'],
            'visible': item.get('visible', True)  # 默認可見
        }

    print(f"原始畫布尺寸: {psd.width} x {psd.height}")
    print(f"目標畫布尺寸: {target_width} x {target_height}")
    print(f"共有 {len(new_positions)} 個圖層需要調整\n")

    # 創建新畫布，使用指定的目標尺寸
    new_canvas = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))

    # 收集所有圖層
    all_layers = []
    layer_id = 0

    def collect_layers(layer):
        """遞歸收集所有圖層"""
        nonlocal layer_id
        all_layers.append((layer_id, layer))
        layer_id += 1

        if hasattr(layer, '__iter__'):
            for child in layer:
                collect_layers(child)

    for layer in psd:
        collect_layers(layer)

    print(f"收集到 {len(all_layers)} 個圖層\n")

    # 處理每個圖層
    processed_count = 0
    for layer_id, layer in all_layers:
        if layer_id not in pos_map:
            continue

        new_pos = pos_map[layer_id]

        # 跳過不可見的圖層
        if not new_pos['visible']:
            print(f"ID {layer_id}: {layer.name} - 跳過（不可見）")
            continue

        # 跳過無效尺寸的圖層
        if new_pos['width'] == 0 or new_pos['height'] == 0:
            print(f"ID {layer_id}: {layer.name} - 跳過（尺寸為0）")
            continue

        # 跳過圖層組，只處理實際的圖層（避免重複渲染）
        if new_pos['type'] == 'group':
            print(f"ID {layer_id}: {layer.name} - 跳過（圖層組）")
            continue

        try:
            # 渲染當前圖層為圖像（使用最大質量）
            layer_image = layer.composite()

            if layer_image is None or layer_image.size[0] == 0 or layer_image.size[1] == 0:
                print(f"ID {layer_id}: {layer.name} - 跳過（無法渲染）")
                continue

            # 確保圖像是RGBA模式
            if layer_image.mode != 'RGBA':
                layer_image = layer_image.convert('RGBA')

            old_bbox = layer.bbox
            old_width = old_bbox[2] - old_bbox[0]
            old_height = old_bbox[3] - old_bbox[1]

            new_left = new_pos['left']
            new_top = new_pos['top']
            new_width = new_pos['width']
            new_height = new_pos['height']

            # 如果尺寸發生變化，使用高質量插值進行resize
            if old_width != new_width or old_height != new_height:
                if new_width > 0 and new_height > 0:
                    # 使用LANCZOS插值進行高質量縮放
                    layer_image = layer_image.resize(
                        (new_width, new_height),
                        Image.Resampling.LANCZOS
                    )

                    print(f"ID {layer_id}: {layer.name}")
                    print(f"  原始尺寸: {old_width}x{old_height}")
                    print(f"  新尺寸: {new_width}x{new_height}")
                    print(f"  新位置: ({new_left}, {new_top})")
            else:
                print(f"ID {layer_id}: {layer.name} - 尺寸未變化，位置: ({new_left}, {new_top})")

            # 確保新位置在畫布範圍內
            if (new_left >= 0 and new_top >= 0 and 
                new_left + new_width <= target_width and 
                new_top + new_height <= target_height):
                
                # 粘貼到新畫布上（使用alpha通道進行合成）
                if layer_image.mode == 'RGBA':
                    new_canvas.alpha_composite(layer_image, (new_left, new_top))
                else:
                    new_canvas.paste(layer_image, (new_left, new_top), layer_image)
                processed_count += 1
            else:
                print(f"ID {layer_id}: {layer.name} - 位置超出畫布範圍，跳過")

        except Exception as e:
            print(f"ID {layer_id}: {layer.name} - 處理失敗: {e}")

    print(f"\n成功處理 {processed_count} 個圖層")

    # 保存為高質量PNG
    output_png = output_path.rsplit('.', 1)[0] + '.png'
    new_canvas.save(output_png, 'PNG', optimize=False, compress_level=0, dpi=(300, 300))

    print(f"\n輸出圖像已保存到: {output_png}")
    print(f"最終尺寸: {new_canvas.width} x {new_canvas.height}")

    return new_canvas


# 使用示例
if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("使用方法: python resize_psd.py <原始PSD文件> <新位置JSON文件> <輸出文件名> <目標寬度> <目標高度>")
        print("示例: python resize_psd.py test.psd new_pos.json output.png 800 600")
        sys.exit(1)

    psd_file = sys.argv[1]
    new_pos_file = sys.argv[2]
    output_file = sys.argv[3]
    target_width = int(sys.argv[4])
    target_height = int(sys.argv[5])

    resize_psd_with_new_positions(psd_file, new_pos_file, output_file, target_width, target_height)

