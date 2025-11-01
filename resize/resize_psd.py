from psd_tools import PSDImage
from PIL import Image
import json
import sys

def resize_psd_with_new_positions(psd_file_path, new_pos_json_path, output_path):
    """
    根据新的位置信息对每个图层进行resize和repositioning

    参数:
        psd_file_path: 原始PSD文件路径
        new_pos_json_path: 新位置JSON文件路径
        output_path: 输出文件路径
    """
    # 读取PSD文件
    psd = PSDImage.open(psd_file_path)

    # 读取新位置信息
    with open(new_pos_json_path, 'r', encoding='utf-8') as f:
        new_positions = json.load(f)

    # 创建ID到新位置的映射，转换新的JSON格式
    pos_map = {}
    target_width = 0
    target_height = 0
    
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
            'visible': item.get('visible', True)  # 默认可见
        }
        
        # 从背景图层（通常是id=0）或最大坐标确定目标画布尺寸
        if item['id'] == 0 or (item['name'] == '背景' and item.get('level', 0) == 0):
            target_width = new_coord['right']
            target_height = new_coord['bottom']
    
    # 如果没有找到背景图层，则从所有图层中找到最大坐标
    if target_width == 0 or target_height == 0:
        for item in new_positions:
            new_coord = item['new_coords']
            target_width = max(target_width, new_coord['right'])
            target_height = max(target_height, new_coord['bottom'])

    print(f"原始画布尺寸: {psd.width} x {psd.height}")
    print(f"目标画布尺寸: {target_width} x {target_height}")
    print(f"共有 {len(new_positions)} 个图层需要调整\n")

    # 创建新画布，使用动态获取的目标尺寸
    new_canvas = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))

    # 收集所有图层

    all_layers = []
    layer_id = 0

    def collect_layers(layer):
        """递归收集所有图层"""
        nonlocal layer_id
        all_layers.append((layer_id, layer))
        layer_id += 1

        if hasattr(layer, '__iter__'):
            for child in layer:
                collect_layers(child)

    for layer in psd:
        collect_layers(layer)

    print(f"收集到 {len(all_layers)} 个图层\n")

    # 处理每个图层
    processed_count = 0
    for layer_id, layer in all_layers:
        if layer_id not in pos_map:
            continue

        new_pos = pos_map[layer_id]

        # 跳过不可见的图层
        if not new_pos['visible']:
            print(f"ID {layer_id}: {layer.name} - 跳过（不可见）")
            continue

        # 跳过无效尺寸的图层
        if new_pos['width'] == 0 or new_pos['height'] == 0:
            print(f"ID {layer_id}: {layer.name} - 跳过（尺寸为0）")
            continue

        # 跳过图层组，只处理实际的图层（避免重复渲染）
        if new_pos['type'] == 'group':
            print(f"ID {layer_id}: {layer.name} - 跳过（图层组）")
            continue

        try:
            # 渲染当前图层为图像（使用最大质量）
            layer_image = layer.composite()

            if layer_image is None or layer_image.size[0] == 0 or layer_image.size[1] == 0:
                print(f"ID {layer_id}: {layer.name} - 跳过（无法渲染）")
                continue

            # 确保图像是RGBA模式
            if layer_image.mode != 'RGBA':
                layer_image = layer_image.convert('RGBA')

            old_bbox = layer.bbox
            old_width = old_bbox[2] - old_bbox[0]
            old_height = old_bbox[3] - old_bbox[1]

            new_left = new_pos['left']
            new_top = new_pos['top']
            new_width = new_pos['width']
            new_height = new_pos['height']

            # 如果尺寸发生变化，使用高质量插值进行resize
            if old_width != new_width or old_height != new_height:
                if new_width > 0 and new_height > 0:
                    # 如果是放大，先提升分辨率再缩小以提高质量
                    if new_width > old_width or new_height > old_height:
                        # 放大操作使用LANCZOS
                        layer_image = layer_image.resize(
                            (new_width, new_height),
                            Image.Resampling.LANCZOS
                        )
                    else:
                        # 缩小操作也使用LANCZOS，并添加抗锯齿
                        layer_image = layer_image.resize(
                            (new_width, new_height),
                            Image.Resampling.LANCZOS
                        )

                    print(f"ID {layer_id}: {layer.name}")
                    print(f"  原始尺寸: {old_width}x{old_height}")
                    print(f"  新尺寸: {new_width}x{new_height}")
                    print(f"  新位置: ({new_left}, {new_top})")
            else:
                print(f"ID {layer_id}: {layer.name} - 尺寸未变化，位置: ({new_left}, {new_top})")

            # 粘贴到新画布上（使用alpha通道进行合成）
            if layer_image.mode == 'RGBA':
                new_canvas.alpha_composite(layer_image, (new_left, new_top))
            else:
                new_canvas.paste(layer_image, (new_left, new_top), layer_image)
            processed_count += 1

        except Exception as e:
            print(f"ID {layer_id}: {layer.name} - 处理失败: {e}")

    print(f"\n成功处理 {processed_count} 个图层")

    # 保存为高质量PNG
    output_png = output_path.rsplit('.', 1)[0] + '.png'
    new_canvas.save(output_png, 'PNG', optimize=False, compress_level=0, dpi=(300, 300))

    print(f"\n输出图像已保存到: {output_png}")
    print(f"最终尺寸: {new_canvas.width} x {new_canvas.height}")

    return new_canvas

# if __name__ == "__main__":
#     if len(sys.argv) < 3:
#         print("使用方法: python resize_psd.py <原始PSD文件> <新位置JSON文件> [输出文件名]")
#         print("示例: python resize_psd.py test.psd new_pos.json output.psd")
#         sys.exit(1)

#     psd_file = sys.argv[1]
#     new_pos_file = sys.argv[2]
#     output_file = sys.argv[3] if len(sys.argv) > 3 else psd_file.rsplit('.', 1)[0] + '_resized.psd'

#     resize_psd_with_new_positions(psd_file, new_pos_file, output_file)
