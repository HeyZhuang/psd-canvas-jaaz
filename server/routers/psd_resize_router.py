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


@router.get("/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "service": "PSD Auto Resize Service",
        "version": "1.0.0"
    }
