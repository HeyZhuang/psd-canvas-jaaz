from psd_tools import PSDImage
from PIL import Image, ImageDraw, ImageFont
import random

def get_psd_layers_info(psd_file_path):
    """
    读取PSD文件并获取所有图层的位置和大小信息

    参数:
        psd_file_path: PSD文件路径

    返回:
        psd对象, 包含所有图层信息的列表
    """
    # 打开PSD文件
    psd = PSDImage.open(psd_file_path)

    # 获取图像尺寸
    img_width = psd.width
    img_height = psd.height

    layers_info = []
    layer_id = 0

    def clamp_bbox(bbox, width, height):
        """限制边界框在图像范围内"""
        left = max(0, min(bbox[0], width))
        top = max(0, min(bbox[1], height))
        right = max(0, min(bbox[2], width))
        bottom = max(0, min(bbox[3], height))
        return (left, top, right, bottom)

    def process_layer(layer, level=0):
        """递归处理图层(包括图层组)"""
        nonlocal layer_id

        # 获取图层边界框
        bbox = layer.bbox

        # 限制边界框在图像范围内
        clamped_bbox = clamp_bbox(bbox, img_width, img_height)
        # 不做限制
        # clamped_bbox = bbox

        layer_info = {
            'id': layer_id,
            'name': layer.name,
            'type': layer.kind,
            'visible': layer.visible,
            'left': clamped_bbox[0],      # 左边界 x
            'top': clamped_bbox[1],       # 上边界 y
            'right': clamped_bbox[2],     # 右边界 x
            'bottom': clamped_bbox[3],    # 下边界 y
            'width': clamped_bbox[2] - clamped_bbox[0],   # 宽度
            'height': clamped_bbox[3] - clamped_bbox[1],  # 高度
            'level': level  # 图层嵌套层级
        }

        layer_id += 1
        layers_info.append(layer_info)

        # 如果是图层组,递归处理子图层
        if hasattr(layer, '__iter__'):
            for child in layer:
                process_layer(child, level + 1)

    # 处理所有顶层图层
    for layer in psd:
        process_layer(layer)

    return psd, layers_info

def draw_detection_boxes(psd, layers_info, output_path):
    """
    在图像上绘制检测框

    参数:
        psd: PSD对象
        layers_info: 图层信息列表
        output_path: 输出图像路径
    """
    # 将PSD转换为PIL Image
    image = psd.composite()

    # 创建绘图对象
    draw = ImageDraw.Draw(image)

    # 尝试加载字体，如果失败使用默认字体
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 40)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
        except:
            font = ImageFont.load_default()

    # 使用红色作为统一的检测框颜色
    color = (255, 0, 0)  # 红色

    # 为每个图层绘制检测框
    for info in layers_info:
        # 绘制矩形框
        left, top, right, bottom = info['left'], info['top'], info['right'], info['bottom']

        # 只绘制有效的框（宽度和高度大于0）
        if right > left and bottom > top:
            draw.rectangle([left, top, right, bottom], outline=color, width=3)

            # 绘制标签背景
            label = f"{info['id']}"
            bbox = draw.textbbox((left, top - 50), label, font=font)
            draw.rectangle(bbox, fill=color)

            # 绘制标签文字
            draw.text((left, top - 50), label, fill='white', font=font)

    # 保存图像
    image.save(output_path)
    print(f"检测框图像已保存到: {output_path}")

    return image

def print_layers_info(layers_info):
    """打印图层信息"""
    print(f"{'ID':<5} {'层级':<5} {'图层名称':<30} {'类型':<15} {'位置(x,y)':<20} {'大小(w×h)':<20}")
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
        print("使用方法: python psd_layer_info.py <psd文件路径>")
        sys.exit(1)

    psd_file = sys.argv[1]

    # 获取图层信息
    psd, layers_info = get_psd_layers_info(psd_file)
    print_layers_info(layers_info)

    # 输出为JSON格式
    base_name = psd_file.rsplit('.', 1)[0]
    json_file = base_name + '_layers_info_not_clamp.json'
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(layers_info, f, ensure_ascii=False, indent=2)

    # 绘制检测框
    output_image = base_name + '_detection_not_clamp.png'
    draw_detection_boxes(psd, layers_info, output_image)

    print(f"\n总共 {len(layers_info)} 个图层")
    print(f"详细信息已保存到: {json_file}")
