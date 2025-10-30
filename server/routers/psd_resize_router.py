#!/usr/bin/env python3
"""
PSD自動縮放API路由
整合Gemini API進行智能圖層縮放
"""

import os
import json
import base64
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
import logging

from services.gemini_psd_resize_service import GeminiPSDResizeService
from utils.psd_layer_info import get_psd_layers_info, draw_detection_boxes
from utils.resize_psd import resize_psd_with_new_positions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/psd/resize", tags=["PSD Resize"])

# 配置
from services.config_service import FILES_DIR
from common import DEFAULT_PORT
PSD_DIR = os.path.join(FILES_DIR, "psd")


@router.post("/auto-resize")
async def auto_resize_psd(
    psd_file: UploadFile = File(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None)
):
    """
    使用Gemini API自動縮放PSD文件
    
    Args:
        psd_file: PSD文件
        target_width: 目標寬度
        target_height: 目標高度
        api_key: Gemini API密鑰（可選，如果不提供則使用環境變量）
    
    Returns:
        縮放後的圖層信息和輸出文件URL
    """
    try:
        # 驗證文件類型
        if not psd_file.filename.lower().endswith('.psd'):
            raise HTTPException(status_code=400, detail="只支持PSD文件格式")
        
        # 保存上傳的PSD文件
        temp_dir = tempfile.mkdtemp()
        psd_path = os.path.join(temp_dir, psd_file.filename)
        
        with open(psd_path, "wb") as buffer:
            content = await psd_file.read()
            buffer.write(content)
        
        logger.info(f"PSD文件已保存到: {psd_path}")
        
        # 步驟1: 提取圖層信息
        logger.info("步驟1: 提取PSD圖層信息")
        psd, layers_info = get_psd_layers_info(psd_path)
        original_width = psd.width
        original_height = psd.height
        
        logger.info(f"原始尺寸: {original_width}x{original_height}")
        logger.info(f"目標尺寸: {target_width}x{target_height}")
        logger.info(f"圖層數量: {len(layers_info)}")
        
        # 生成檢測框圖像
        detection_image_path = os.path.join(temp_dir, "detection.png")
        draw_detection_boxes(psd, layers_info, detection_image_path)
        
        # 步驟2: 使用Gemini生成新位置
        logger.info("步驟2: 調用Gemini API生成新位置")
        service = GeminiPSDResizeService(api_key=api_key)
        
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        # 保存新位置信息
        positions_file = os.path.join(temp_dir, "new_positions.json")
        with open(positions_file, 'w', encoding='utf-8') as f:
            json.dump(new_positions, f, ensure_ascii=False, indent=2)
        
        # 步驟3: 重建PSD並渲染
        logger.info("步驟3: 重建PSD並渲染")
        output_png_path = os.path.join(temp_dir, "resized_output.png")
        
        result_image = resize_psd_with_new_positions(
            psd_path,
            positions_file,
            output_png_path,
            target_width,
            target_height
        )
        
        # 生成文件ID
        import time
        file_id = f"resized_{int(time.time())}"
        
        # 移動文件到永久目錄
        final_png_path = os.path.join(PSD_DIR, f"{file_id}.png")
        os.makedirs(PSD_DIR, exist_ok=True)
        
        import shutil
        shutil.move(output_png_path, final_png_path)
        
        # 保存元數據
        metadata = {
            "file_id": file_id,
            "original_filename": psd_file.filename,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(layers_info),
            "new_positions": new_positions,
            "output_url": f"/api/psd/resize/output/{file_id}"
        }
        
        metadata_path = os.path.join(PSD_DIR, f"{file_id}_metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info("PSD自動縮放完成")
        
        return {
            "success": True,
            "file_id": file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(layers_info),
            "output_url": f"/api/psd/resize/output/{file_id}",
            "metadata_url": f"/api/psd/resize/metadata/{file_id}",
            "new_positions": new_positions
        }
        
    except Exception as e:
        logger.error(f"PSD自動縮放失敗: {e}")
        raise HTTPException(status_code=500, detail=f"PSD自動縮放失敗: {str(e)}")
    
    finally:
        # 清理臨時文件
        try:
            import shutil
            if 'temp_dir' in locals():
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@router.get("/output/{file_id}")
async def get_resized_output(file_id: str):
    """
    獲取縮放後的輸出圖像
    
    Args:
        file_id: 文件ID
    
    Returns:
        縮放後的PNG圖像
    """
    png_path = os.path.join(PSD_DIR, f"{file_id}.png")
    
    if not os.path.exists(png_path):
        raise HTTPException(status_code=404, detail="輸出文件未找到")
    
    return FileResponse(png_path, media_type="image/png")


@router.get("/metadata/{file_id}")
async def get_resize_metadata(file_id: str):
    """
    獲取縮放操作的元數據
    
    Args:
        file_id: 文件ID
    
    Returns:
        縮放操作的詳細元數據
    """
    metadata_path = os.path.join(PSD_DIR, f"{file_id}_metadata.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="元數據文件未找到")
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    return metadata


@router.post("/preview-resize")
async def preview_resize(
    psd_file: UploadFile = File(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None)
):
    """
    預覽縮放效果（不保存文件，只返回調整方案）
    
    Args:
        psd_file: PSD文件
        target_width: 目標寬度
        target_height: 目標高度
        api_key: Gemini API密鑰
    
    Returns:
        縮放預覽信息
    """
    try:
        # 驗證文件類型
        if not psd_file.filename.lower().endswith('.psd'):
            raise HTTPException(status_code=400, detail="只支持PSD文件格式")
        
        # 保存臨時文件
        temp_dir = tempfile.mkdtemp()
        psd_path = os.path.join(temp_dir, psd_file.filename)
        
        with open(psd_path, "wb") as buffer:
            content = await psd_file.read()
            buffer.write(content)
        
        # 提取圖層信息
        psd, layers_info = get_psd_layers_info(psd_path)
        original_width = psd.width
        original_height = psd.height
        
        # 生成檢測框圖像
        detection_image_path = os.path.join(temp_dir, "detection.png")
        draw_detection_boxes(psd, layers_info, detection_image_path)
        
        # 使用Gemini生成調整方案
        service = GeminiPSDResizeService(api_key=api_key)
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        # 生成預覽信息
        preview_info = {
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(layers_info),
            "adjustments": new_positions,
            "summary": {
                "total_layers": len(layers_info),
                "adjusted_layers": len(new_positions),
                "scale_ratio": min(target_width/original_width, target_height/original_height)
            }
        }
        
        return {
            "success": True,
            "preview": preview_info
        }
        
    except Exception as e:
        logger.error(f"預覽縮放失敗: {e}")
        raise HTTPException(status_code=500, detail=f"預覽縮放失敗: {str(e)}")
    
    finally:
        # 清理臨時文件
        try:
            import shutil
            if 'temp_dir' in locals():
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@router.post("/resize-by-id")
async def resize_psd_by_file_id(
    file_id: str = Form(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None)
):
    """
    通過file_id直接處理已上傳的PSD文件（無需前端下載）
    這是為大文件優化的版本，避免前端下載大PSD文件。
    服務器直接讀取已上傳的PSD文件進行處理。
    
    Args:
        file_id: PSD文件ID
        target_width: 目標寬度
        target_height: 目標高度
        api_key: Gemini API密鑰（可選）
    
    Returns:
        縮放後的圖層信息和輸出文件URL
    """
    try:
        # 檢查PSD文件是否存在
        psd_path = os.path.join(PSD_DIR, f'{file_id}.psd')
        
        if not os.path.exists(psd_path):
            logger.error(f"PSD文件未找到: {psd_path}")
            raise HTTPException(status_code=404, detail=f"PSD文件未找到: {file_id}")
        
        # 檢查文件大小
        file_size_mb = os.path.getsize(psd_path) / (1024 * 1024)
        logger.info(f"開始處理PSD文件: {file_id}, 大小: {file_size_mb:.2f} MB")
        
        # 創建臨時目錄
        temp_dir = tempfile.mkdtemp()
        
        # 步驟1: 提取圖層信息
        logger.info("步驟1: 提取PSD圖層信息")
        psd, layers_info = get_psd_layers_info(psd_path)
        original_width = psd.width
        original_height = psd.height
        
        logger.info(f"原始尺寸: {original_width}x{original_height}")
        logger.info(f"目標尺寸: {target_width}x{target_height}")
        logger.info(f"圖層數量: {len(layers_info)}")
        
        # 生成檢測框圖像
        detection_image_path = os.path.join(temp_dir, "detection.png")
        draw_detection_boxes(psd, layers_info, detection_image_path)
        
        # 步驟2: 使用Gemini生成新位置
        logger.info("步驟2: 調用Gemini API生成新位置")
        service = GeminiPSDResizeService(api_key=api_key)
        
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        # 保存新位置信息
        positions_file = os.path.join(temp_dir, "new_positions.json")
        with open(positions_file, 'w', encoding='utf-8') as f:
            json.dump(new_positions, f, ensure_ascii=False, indent=2)
        
        # 步驟3: 重建PSD並渲染
        logger.info("步驟3: 重建PSD並渲染")
        output_png_path = os.path.join(temp_dir, "resized_output.png")
        
        result_image = resize_psd_with_new_positions(
            psd_path,
            positions_file,
            output_png_path,
            target_width,
            target_height
        )
        
        # 生成文件ID
        import time
        result_file_id = f"resized_{int(time.time())}"
        
        # 移動文件到永久目錄
        final_png_path = os.path.join(PSD_DIR, f"{result_file_id}.png")
        os.makedirs(PSD_DIR, exist_ok=True)
        
        import shutil
        shutil.move(output_png_path, final_png_path)
        
        # 保存元數據
        metadata = {
            "file_id": result_file_id,
            "original_file_id": file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(layers_info),
            "new_positions": new_positions,
            "output_url": f"/api/psd/resize/output/{result_file_id}"
        }
        
        metadata_path = os.path.join(PSD_DIR, f"{result_file_id}_metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"PSD自動縮放完成，文件大小: {file_size_mb:.2f} MB")
        
        return {
            "success": True,
            "file_id": result_file_id,
            "original_file_id": file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(layers_info),
            "output_url": f"/api/psd/resize/output/{result_file_id}",
            "metadata_url": f"/api/psd/resize/metadata/{result_file_id}",
            "new_positions": new_positions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PSD自動縮放失敗: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PSD自動縮放失敗: {str(e)}")
    
    finally:
        # 清理臨時文件
        try:
            import shutil
            if 'temp_dir' in locals():
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@router.post("/resize-by-id-layered")
async def resize_psd_by_id_layered(
    file_id: str = Form(...),
    target_width: int = Form(...),
    target_height: int = Form(...),
    api_key: Optional[str] = Form(None)
):
    """
    通過file_id智能縮放PSD文件（分層模式）
    
    與普通縮放不同，此端點會：
    1. 保存每個圖層為獨立PNG文件
    2. 生成JSON元數據
    3. 返回可在畫布上獨立移動的圖層列表
    
    Args:
        file_id: PSD文件ID
        target_width: 目標寬度
        target_height: 目標高度
        api_key: Gemini API密鑰（可選）
    
    Returns:
        分層縮放結果，包含每個圖層的URL和元數據
    """
    temp_dir = None
    
    try:
        logger.info(f"開始PSD分層縮放: file_id={file_id}, 目標尺寸={target_width}x{target_height}")
        
        # 1. 獲取原始PSD文件路徑
        psd_upload_dir = os.path.join(FILES_DIR, "psd")
        psd_metadata_path = os.path.join(psd_upload_dir, f"{file_id}_metadata.json")
        
        if not os.path.exists(psd_metadata_path):
            raise HTTPException(status_code=404, detail="PSD文件不存在")
        
        with open(psd_metadata_path, 'r', encoding='utf-8') as f:
            psd_metadata = json.load(f)
        
        psd_path = os.path.join(psd_upload_dir, f"{file_id}.psd")
        if not os.path.exists(psd_path):
            raise HTTPException(status_code=404, detail="PSD文件不存在")
        
        # 2. 提取圖層信息
        logger.info("提取PSD圖層信息")
        psd, layers_info = get_psd_layers_info(psd_path)
        original_width = psd.width
        original_height = psd.height
        
        logger.info(f"PSD信息: {original_width}x{original_height}, {len(layers_info)}個圖層")
        
        # 3. 創建臨時目錄
        temp_dir = tempfile.mkdtemp()
        
        # 4. 創建圖層對象映射
        logger.info("創建圖層對象映射")
        layer_map = {}
        layer_id_counter = 0
        
        def map_layers(layer_obj, level=0):
            """遞歸映射圖層對象"""
            nonlocal layer_id_counter
            layer_map[layer_id_counter] = layer_obj
            layer_id_counter += 1
            
            # 處理圖層組的子圖層
            if hasattr(layer_obj, '__iter__'):
                for child in layer_obj:
                    map_layers(child, level + 1)
        
        # 映射所有圖層
        for layer_obj in psd:
            map_layers(layer_obj)
        
        logger.info(f"已映射 {len(layer_map)} 個圖層對象")
        
        # 5. 保存各個圖層為獨立PNG
        logger.info(f"開始保存獨立圖層文件，共 {len(layers_info)} 個圖層")
        layer_files = []
        skipped_layers = []
        
        for idx, layer_info in enumerate(layers_info):
            try:
                # 使用 layer_info['id'] 從映射中獲取圖層對象
                layer_id = layer_info['id']
                if layer_id not in layer_map:
                    logger.warning(f"找不到圖層ID {layer_id}: {layer_info['name']}")
                    skipped_layers.append(f"{layer_info['name']} (ID不存在)")
                    continue
                
                layer = layer_map[layer_id]
                
                # 檢查圖層是否可見
                if not layer.visible:
                    logger.info(f"跳過不可見圖層: {layer_info['name']}")
                    skipped_layers.append(f"{layer_info['name']} (不可見)")
                    continue
                
                # 嘗試提取圖層圖像
                layer_image = None
                try:
                    layer_image = layer.topil()
                except Exception as e:
                    logger.warning(f"topil()失敗，圖層 {layer_info['name']}: {e}")
                
                if layer_image and layer_image.size[0] > 0 and layer_image.size[1] > 0:
                    # 清理文件名中的特殊字符
                    safe_name = layer_info['name'].replace('/', '_').replace('\\', '_').replace(':', '_')
                    layer_filename = f"layer_{idx:03d}_{safe_name}.png"
                    layer_path = os.path.join(temp_dir, layer_filename)
                    
                    # 保存圖層
                    layer_image.save(layer_path, 'PNG')
                    
                    # 獲取圖層不透明度（0-255 或 0-100，取決於PSD版本）
                    opacity = 255  # 默認完全不透明
                    if hasattr(layer, 'opacity'):
                        opacity = layer.opacity
                    
                    layer_files.append({
                        'id': idx,
                        'name': layer_info['name'],
                        'path': layer_path,
                        'x': layer_info['left'],
                        'y': layer_info['top'],
                        'width': layer_info['width'],
                        'height': layer_info['height'],
                        'opacity': opacity
                    })
                    logger.info(f"✅ 已保存圖層 {idx+1}/{len(layers_info)}: {layer_info['name']} ({layer_info['width']}x{layer_info['height']}, opacity={opacity})")
                else:
                    reason = "圖像為空" if not layer_image else f"尺寸無效 ({layer_image.size})"
                    logger.warning(f"❌ 跳過圖層 {layer_info['name']}: {reason}")
                    skipped_layers.append(f"{layer_info['name']} ({reason})")
                    
            except Exception as e:
                logger.error(f"❌ 處理圖層 {layer_info['name']} 時出錯: {e}", exc_info=True)
                skipped_layers.append(f"{layer_info['name']} (錯誤: {str(e)})")
                continue
        
        logger.info(f"圖層處理完成: 成功 {len(layer_files)} 個，跳過 {len(skipped_layers)} 個")
        if skipped_layers:
            logger.info(f"跳過的圖層: {', '.join(skipped_layers)}")
        
        if not layer_files:
            error_msg = f"沒有可處理的圖層。總共 {len(layers_info)} 個圖層，全部被跳過。"
            if skipped_layers:
                error_msg += f" 跳過原因: {', '.join(skipped_layers[:5])}"
                if len(skipped_layers) > 5:
                    error_msg += f" 等{len(skipped_layers)}個圖層"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 6. 生成檢測框圖像
        logger.info("生成檢測框圖像")
        detection_image_path = os.path.join(temp_dir, "detection.png")
        draw_detection_boxes(psd, layers_info, detection_image_path)
        
        # 7. 調用Gemini API生成縮放方案
        logger.info("調用Gemini API生成縮放方案")
        service = GeminiPSDResizeService(api_key=api_key)
        new_positions = await service.resize_psd_layers(
            layers_info=layers_info,
            detection_image_path=detection_image_path,
            original_width=original_width,
            original_height=original_height,
            target_width=target_width,
            target_height=target_height
        )
        
        logger.info(f"Gemini返回了 {len(new_positions)} 個圖層的新位置")
        
        # 8. 處理每個圖層並保存
        logger.info("處理並保存縮放後的圖層")
        
        import time
        result_file_id = f"psd_layered_{int(time.time())}"
        result_dir = os.path.join(PSD_DIR, result_file_id)
        os.makedirs(result_dir, exist_ok=True)
        
        resized_layers = []
        
        for layer_file in layer_files:
            layer_id = layer_file['id']
            
            # 查找對應的新位置
            new_pos = None
            for pos in new_positions:
                if pos['id'] == layer_id:
                    new_pos = pos['new_coords']
                    break
            
            if not new_pos:
                logger.warning(f"圖層 {layer_id} 沒有新位置信息，跳過")
                continue
            
            # 加載原始圖層圖像
            from PIL import Image
            layer_image = Image.open(layer_file['path'])
            
            # 計算新尺寸
            new_width = new_pos['right'] - new_pos['left']
            new_height = new_pos['bottom'] - new_pos['top']
            
            if new_width <= 0 or new_height <= 0:
                logger.warning(f"圖層 {layer_id} 尺寸無效，跳過")
                continue
            
            # 調整圖層大小
            resized_layer = layer_image.resize(
                (new_width, new_height),
                Image.Resampling.LANCZOS
            )
            
            # 保存縮放後的圖層
            layer_filename = f"layer_{layer_id:03d}_{layer_file['name'].replace(' ', '_')}.png"
            layer_path = os.path.join(result_dir, layer_filename)
            resized_layer.save(layer_path, 'PNG')
            
            # 構建圖層元數據
            layer_metadata = {
                'index': layer_id,
                'name': layer_file['name'],
                'type': 'layer',
                'visible': True,
                'opacity': layer_file.get('opacity', 100),
                'left': new_pos['left'],
                'top': new_pos['top'],
                'width': new_width,
                'height': new_height,
                'image_url': f'/api/psd/resize/layered/{result_file_id}/layer_{layer_id:03d}',
                'image_path': layer_filename,
                'original_index': layer_id
            }
            
            resized_layers.append(layer_metadata)
            
            logger.info(f"已處理圖層 {layer_id}: {layer_file['name']} -> ({new_pos['left']}, {new_pos['top']}) {new_width}x{new_height}")
        
        # 8. 保存元數據JSON
        metadata = {
            "file_id": result_file_id,
            "original_file_id": file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(resized_layers),
            "layers": resized_layers,
            "source": "psd_layered_resize",
            "created_at": time.time()
        }
        
        metadata_path = os.path.join(result_dir, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"元數據已保存: {metadata_path}")
        logger.info("PSD分層智能縮放完成")
        
        return {
            "success": True,
            "file_id": result_file_id,
            "original_size": {"width": original_width, "height": original_height},
            "target_size": {"width": target_width, "height": target_height},
            "layers_count": len(resized_layers),
            "layers": resized_layers,
            "metadata_url": f"/api/canvas/resize-layered/metadata/{result_file_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PSD分層縮放失敗: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PSD分層縮放失敗: {str(e)}")
    
    finally:
        # 清理臨時文件
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info(f"已清理臨時目錄: {temp_dir}")
            except Exception as e:
                logger.warning(f"清理臨時文件失敗: {e}")


@router.get("/layered/{file_id}/layer_{layer_index:int}")
async def get_layered_psd_image(file_id: str, layer_index: int):
    """獲取PSD分層縮放結果中的單個圖層PNG"""
    try:
        result_dir = os.path.join(PSD_DIR, file_id)
        
        if not os.path.exists(result_dir):
            raise HTTPException(status_code=404, detail="結果目錄不存在")
        
        # 讀取元數據獲取文件名
        metadata_path = os.path.join(result_dir, "metadata.json")
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 查找對應圖層
        layer = None
        for l in metadata['layers']:
            if l['index'] == layer_index:
                layer = l
                break
        
        if not layer:
            raise HTTPException(status_code=404, detail=f"圖層 {layer_index} 不存在")
        
        # 獲取圖層文件
        layer_path = os.path.join(result_dir, layer['image_path'])
        
        if not os.path.exists(layer_path):
            raise HTTPException(status_code=404, detail="圖層文件不存在")
        
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
        logger.error(f"獲取圖層圖像失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取圖層圖像失敗: {str(e)}")


@router.get("/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "service": "PSD Auto Resize Service",
        "version": "1.0.0"
    }
