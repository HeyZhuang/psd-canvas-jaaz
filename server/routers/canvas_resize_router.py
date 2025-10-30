#!/usr/bin/env python3
"""
画布智能缩放API路由
整合画布数据收集、PSD创建和智能缩放
"""

import os
import json
import tempfile
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import FileResponse
import logging

from services.gemini_psd_resize_service import GeminiPSDResizeService
from utils.psd_layer_info import get_psd_layers_info, draw_detection_boxes
from utils.resize_psd import resize_psd_with_new_positions
from utils.canvas_to_psd import save_canvas_layers_as_psd, save_canvas_layers_separate, create_layered_psd_from_resized
from services.config_service import FILES_DIR
from common import DEFAULT_PORT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/canvas", tags=["Canvas Resize"])

# PSD目录
PSD_DIR = os.path.join(FILES_DIR, "psd")
os.makedirs(PSD_DIR, exist_ok=True)


@router.post("/resize")
async def resize_canvas(
    canvas_data: str = Form(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None),
    output_format: str = Form("png")  # "png" 或 "psd"
):
    """
    智能缩放整个画布
    
    工作流程：
    1. 接收画布数据（所有图片元素）
    2. 创建临时图层文件
    3. 使用Gemini API生成缩放方案
    4. 根据output_format返回PNG或PSD文件
    
    Args:
        canvas_data: JSON格式的画布数据
        target_width: 目标宽度
        target_height: 目标高度
        api_key: Gemini API密钥（可选）
        output_format: 输出格式 ("png" 或 "psd")
    
    Returns:
        缩放后的图像信息
    """
    temp_dir = None
    
    try:
        # 1. 解析画布数据
        logger.info("开始处理画布缩放请求")
        canvas_dict = json.loads(canvas_data)
        
        original_width = canvas_dict['width']
        original_height = canvas_dict['height']
        layers_count = len(canvas_dict['layers'])
        
        logger.info(f"画布信息: {original_width}x{original_height}, {layers_count}个图层")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        # 2. 保存图层（根据输出格式选择不同的处理方式）
        if output_format == "psd":
            logger.info("步骤1: 保存独立图层文件（PSD模式）")
            layer_data = save_canvas_layers_separate(canvas_dict, temp_dir)
            layer_files = layer_data['layers']
            logger.info(f"已保存 {len(layer_files)} 个图层文件")
        else:
            logger.info("步骤1: 合成画布图层（PNG模式）")
            composite_path = os.path.join(temp_dir, "canvas_composite.png")
            actual_path = save_canvas_layers_as_psd(canvas_dict, composite_path)
            logger.info(f"画布已合成: {actual_path}")
        
        # 3. 构造图层信息
        logger.info("步骤2: 构造图层信息")
        
        # 为了使用现有的智能缩放逻辑，我们需要构造图层信息
        layers_info = []
        for idx, layer in enumerate(canvas_dict['layers']):
            layers_info.append({
                'id': idx,
                'name': layer.get('name', f'Layer_{idx}'),
                'type': 'pixel',
                'level': 0,
                'visible': True,
                'left': layer['x'],
                'top': layer['y'],
                'right': layer['x'] + layer['width'],
                'bottom': layer['y'] + layer['height'],
                'width': layer['width'],
                'height': layer['height'],
                'opacity': layer.get('opacity', 100)
            })
        
        # 4. 生成检测框图像（用于Gemini分析）
        logger.info("步骤3: 生成检测框图像")
        from PIL import Image, ImageDraw
        
        # 根据模式创建检测图像
        if output_format == "psd":
            # PSD模式：从图层文件合成检测图像
            detection_image = Image.new('RGBA', (original_width, original_height), (255, 255, 255, 255))
            for layer_file in layer_files:
                layer_img = Image.open(layer_file['path'])
                position = (layer_file['x'], layer_file['y'])
                detection_image.paste(layer_img, position, layer_img)
        else:
            # PNG模式：使用已合成的图像
            detection_image = Image.open(actual_path)
        
        draw = ImageDraw.Draw(detection_image)
        
        # 绘制检测框
        for layer_info in layers_info:
            box = [
                layer_info['left'],
                layer_info['top'],
                layer_info['right'],
                layer_info['bottom']
            ]
            draw.rectangle(box, outline='red', width=2)
            # 添加图层名称
            draw.text(
                (layer_info['left'], layer_info['top'] - 10),
                layer_info['name'],
                fill='red'
            )
        
        detection_image_path = os.path.join(temp_dir, "detection.png")
        detection_image.save(detection_image_path)
        logger.info(f"检测框图像已生成: {detection_image_path}")
        
        # 5. 调用Gemini API生成缩放方案
        logger.info("步骤4: 调用Gemini API生成缩放方案")
        service = GeminiPSDResizeService(api_key=api_key)
        
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        logger.info(f"Gemini返回了 {len(new_positions)} 个图层的新位置")
        
        # 6. 使用新位置缩放图像
        logger.info("步骤5: 应用缩放方案")
        
        import time
        result_file_id = f"canvas_resized_{int(time.time())}"
        
        if output_format == "psd":
            # PSD模式：从图层创建多层PSD
            logger.info("创建多层PSD文件")
            result_path = os.path.join(PSD_DIR, f"{result_file_id}.psd")
            
            actual_result_path = create_layered_psd_from_resized(
                layer_files=layer_files,
                new_positions=new_positions,
                target_width=target_width,
                target_height=target_height,
                output_path=result_path
            )
            
            # 由于create_layered_psd_from_resized可能返回.png，更新result_file_id
            if actual_result_path.endswith('.png'):
                result_file_id = os.path.splitext(os.path.basename(actual_result_path))[0]
            
            logger.info(f"PSD缩放结果已保存: {actual_result_path}")
        else:
            # PNG模式：简单缩放合成图像
            logger.info("创建缩放后的PNG文件")
            from PIL import Image
            
            composite_image = Image.open(actual_path)
            resized_image = composite_image.resize(
                (target_width, target_height),
                Image.Resampling.LANCZOS
            )
            
            result_path = os.path.join(PSD_DIR, f"{result_file_id}.png")
            resized_image.save(result_path, 'PNG')
            
            logger.info(f"PNG缩放结果已保存: {result_path}")
        
        # 7. 保存元数据
        metadata = {
            "file_id": result_file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": layers_count,
            "new_positions": new_positions,
            "source": "canvas_resize",
            "output_format": output_format
        }
        
        metadata_path = os.path.join(PSD_DIR, f"{result_file_id}_metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info("画布智能缩放完成")
        
        return {
            "success": True,
            "file_id": result_file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": layers_count,
            "output_url": f"/api/psd/resize/output/{result_file_id}",
            "metadata_url": f"/api/psd/resize/metadata/{result_file_id}",
            "new_positions": new_positions,
            "output_format": output_format
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"解析画布数据失败: {e}")
        raise HTTPException(status_code=400, detail=f"无效的画布数据格式: {str(e)}")
    
    except Exception as e:
        logger.error(f"画布智能缩放失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"画布智能缩放失败: {str(e)}")
    
    finally:
        # 清理临时文件
        if temp_dir:
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info("临时文件已清理")
            except Exception as e:
                logger.warning(f"清理临时文件失败: {e}")


@router.post("/resize-layered")
async def resize_canvas_layered(
    canvas_data: str = Form(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None)
):
    """
    智能缩放整个画布并返回分层结果
    
    每个图层会：
    1. 保存为独立的PNG文件
    2. 生成JSON元数据
    3. 返回可在画布上独立移动的图层列表
    
    Args:
        canvas_data: JSON格式的画布数据
        target_width: 目标宽度
        target_height: 目标高度
        api_key: Gemini API密钥（可选）
    
    Returns:
        分层结果信息，包含每个图层的PNG和元数据
    """
    temp_dir = None
    
    try:
        # 1. 解析画布数据
        logger.info("开始处理画布分层缩放请求")
        canvas_dict = json.loads(canvas_data)
        
        original_width = canvas_dict['width']
        original_height = canvas_dict['height']
        layers_count = len(canvas_dict['layers'])
        
        logger.info(f"画布信息: {original_width}x{original_height}, {layers_count}个图层")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        # 2. 保存独立图层文件
        logger.info("步骤1: 保存独立图层文件")
        layer_data = save_canvas_layers_separate(canvas_dict, temp_dir)
        layer_files = layer_data['layers']
        logger.info(f"已保存 {len(layer_files)} 个图层文件")
        
        # 3. 构造图层信息用于Gemini分析
        logger.info("步骤2: 构造图层信息")
        layers_info = []
        for idx, layer in enumerate(canvas_dict['layers']):
            layers_info.append({
                'id': idx,
                'name': layer.get('name', f'Layer_{idx}'),
                'type': 'pixel',
                'level': 0,
                'visible': True,
                'left': layer['x'],
                'top': layer['y'],
                'right': layer['x'] + layer['width'],
                'bottom': layer['y'] + layer['height'],
                'width': layer['width'],
                'height': layer['height'],
                'opacity': layer.get('opacity', 100)
            })
        
        # 4. 生成检测框图像
        logger.info("步骤3: 生成检测框图像")
        from PIL import Image, ImageDraw
        
        detection_image = Image.new('RGBA', (original_width, original_height), (255, 255, 255, 255))
        for layer_file in layer_files:
            layer_img = Image.open(layer_file['path'])
            position = (layer_file['x'], layer_file['y'])
            detection_image.paste(layer_img, position, layer_img)
        
        draw = ImageDraw.Draw(detection_image)
        for layer_info in layers_info:
            box = [
                layer_info['left'],
                layer_info['top'],
                layer_info['right'],
                layer_info['bottom']
            ]
            draw.rectangle(box, outline='red', width=2)
            draw.text(
                (layer_info['left'], layer_info['top'] - 10),
                layer_info['name'],
                fill='red'
            )
        
        detection_image_path = os.path.join(temp_dir, "detection.png")
        detection_image.save(detection_image_path)
        logger.info(f"检测框图像已生成")
        
        # 5. 调用Gemini API生成缩放方案
        logger.info("步骤4: 调用Gemini API生成缩放方案")
        service = GeminiPSDResizeService(api_key=api_key)
        
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        logger.info(f"Gemini返回了 {len(new_positions)} 个图层的新位置")
        
        # 6. 处理每个图层并保存
        logger.info("步骤5: 处理并保存每个图层")
        
        import time
        result_file_id = f"canvas_layered_{int(time.time())}"
        result_dir = os.path.join(PSD_DIR, result_file_id)
        os.makedirs(result_dir, exist_ok=True)
        
        resized_layers = []
        
        for idx, layer_file in enumerate(layer_files):
            layer_id = layer_file['id']
            
            # 查找对应的新位置
            new_pos = None
            for pos in new_positions:
                if pos['id'] == layer_id:
                    new_pos = pos['new_coords']
                    break
            
            if not new_pos:
                logger.warning(f"图层 {layer_id} 没有新位置信息，跳过")
                continue
            
            # 加载原始图层图像
            layer_image = Image.open(layer_file['path'])
            
            # 计算新尺寸
            new_width = new_pos['right'] - new_pos['left']
            new_height = new_pos['bottom'] - new_pos['top']
            
            if new_width <= 0 or new_height <= 0:
                logger.warning(f"图层 {layer_id} 尺寸无效，跳过")
                continue
            
            # 调整图层大小
            resized_layer = layer_image.resize(
                (new_width, new_height),
                Image.Resampling.LANCZOS
            )
            
            # 保存缩放后的图层
            layer_filename = f"layer_{idx:03d}_{layer_file['name'].replace(' ', '_')}.png"
            layer_path = os.path.join(result_dir, layer_filename)
            resized_layer.save(layer_path, 'PNG')
            
            # 构建图层元数据
            layer_metadata = {
                'index': idx,
                'name': layer_file['name'],
                'type': 'layer',
                'visible': True,
                'opacity': layer_file.get('opacity', 100),
                'left': new_pos['left'],
                'top': new_pos['top'],
                'width': new_width,
                'height': new_height,
                'image_url': f'/api/psd/resize/layered/{result_file_id}/layer_{idx:03d}',
                'image_path': layer_filename,
                'original_index': layer_id
            }
            
            resized_layers.append(layer_metadata)
            
            logger.info(f"已处理图层 {idx}: {layer_file['name']} -> ({new_pos['left']}, {new_pos['top']}) {new_width}x{new_height}")
        
        # 7. 保存元数据JSON
        metadata = {
            "file_id": result_file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(resized_layers),
            "layers": resized_layers,
            "source": "canvas_layered_resize",
            "created_at": time.time()
        }
        
        metadata_path = os.path.join(result_dir, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"元数据已保存: {metadata_path}")
        logger.info("画布分层智能缩放完成")
        
        return {
            "success": True,
            "file_id": result_file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(resized_layers),
            "layers": resized_layers,
            "metadata_url": f"/api/canvas/resize-layered/metadata/{result_file_id}"
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"解析画布数据失败: {e}")
        raise HTTPException(status_code=400, detail=f"无效的画布数据格式: {str(e)}")
    
    except Exception as e:
        logger.error(f"画布分层智能缩放失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"画布分层智能缩放失败: {str(e)}")
    
    finally:
        # 清理临时文件
        if temp_dir:
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info("临时文件已清理")
            except Exception as e:
                logger.warning(f"清理临时文件失败: {e}")


@router.get("/resize-layered/metadata/{file_id}")
async def get_layered_metadata(file_id: str):
    """获取分层缩放结果的元数据"""
    try:
        metadata_path = os.path.join(PSD_DIR, file_id, "metadata.json")
        
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="元数据文件不存在")
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"读取元数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"读取元数据失败: {str(e)}")


@router.get("/resize-layered/{file_id}/layer_{layer_index:int}")
async def get_layered_image(file_id: str, layer_index: int):
    """获取单个图层的PNG图像"""
    try:
        result_dir = os.path.join(PSD_DIR, file_id)
        
        if not os.path.exists(result_dir):
            raise HTTPException(status_code=404, detail="结果目录不存在")
        
        # 读取元数据获取文件名
        metadata_path = os.path.join(result_dir, "metadata.json")
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 查找对应图层
        layer = None
        for l in metadata['layers']:
            if l['index'] == layer_index:
                layer = l
                break
        
        if not layer:
            raise HTTPException(status_code=404, detail=f"图层 {layer_index} 不存在")
        
        # 获取图层文件
        layer_path = os.path.join(result_dir, layer['image_path'])
        
        if not os.path.exists(layer_path):
            raise HTTPException(status_code=404, detail="图层文件不存在")
        
        # 使用简单的文件名避免编码问题
        simple_filename = f"layer_{layer_index:03d}.png"
        
        return FileResponse(
            layer_path,
            media_type='image/png',
            headers={
                'Content-Disposition': f'inline; filename="{simple_filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图层图像失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取图层图像失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "Canvas Resize Service",
        "version": "1.0.0"
    }

