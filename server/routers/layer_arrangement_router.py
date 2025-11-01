#!/usr/bin/env python3
"""
图层智能排列API路由
整合Gemini API进行画布元素智能排列
"""

import os
import json
import base64
import tempfile
import math
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import logging

from services.canvas_layer_arrangement_service import CanvasLayerArrangementService
from services.config_service import config_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/psd", tags=["Layer Arrangement"])

@router.post("/arrange-layers")
async def arrange_layers(request: Request):
    """
    智能排列选中的画布元素
    
    Args:
        request: 包含选中元素信息和目标尺寸的请求
        
    Request body:
        {
            "selectedElements": [...],  # 选中的画布元素列表
            "canvasWidth": 1200,        # 当前画布宽度
            "canvasHeight": 800,        # 当前画布高度
            "targetWidth": 800,         # 目标宽度
            "targetHeight": 600,        # 目标高度
            "apiKey": "optional_gemini_api_key"  # 可选的Gemini API密钥
        }
    
    Returns:
        排列后的元素位置信息
    """
    try:
        data = await request.json()
        logger.info(f"收到图层排列请求: {data}")
        logger.info("开始处理图层排列请求...")
        
        # 提取参数
        selected_elements = data.get('selectedElements', [])
        canvas_width = data.get('canvasWidth', 0)
        canvas_height = data.get('canvasHeight', 0)
        target_width = data.get('targetWidth', 0)
        target_height = data.get('targetHeight', 0)
        api_key = data.get('apiKey', None)
        
        logger.info(f"接收到的图层数量: {len(selected_elements)}")
        for i, element in enumerate(selected_elements):
            x = element.get('x', 0)
            y = element.get('y', 0)
            width = element.get('width', 0)
            height = element.get('height', 0)
            logger.info(f"  图层 {i+1}: ID={element.get('id')}, 类型={element.get('type')}, 位置=({x}, {y}), 尺寸={width}x{height}")
        
        logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 验证参数
        if len(selected_elements) < 2:
            raise HTTPException(status_code=400, detail="至少需要选择2个元素进行排列")
        
        # 确保尺寸为正数
        canvas_width = abs(canvas_width)
        canvas_height = abs(canvas_height)
        target_width = abs(target_width)
        target_height = abs(target_height)
        
        if target_width <= 0 or target_height <= 0:
            raise HTTPException(status_code=400, detail="目标尺寸必须为正数")
        
        if canvas_width <= 0 or canvas_height <= 0:
            raise HTTPException(status_code=400, detail="画布尺寸必须为正数")
        
        # 验证元素数据
        for i, element in enumerate(selected_elements):
            if not all(k in element for k in ['id', 'type', 'x', 'y', 'width', 'height']):
                raise HTTPException(status_code=400, detail=f"元素 {i+1} 缺少必要字段")
            
            # 确保数值字段有效
            for field in ['x', 'y', 'width', 'height']:
                if not isinstance(element[field], (int, float)) or not math.isfinite(element[field]):
                    logger.warning(f"元素 {element.get('id')} 的 {field} 字段无效: {element[field]}")
                    element[field] = 0  # 设置默认值
            
            # 确保尺寸为正数
            element['width'] = abs(element['width'])
            element['height'] = abs(element['height'])
        
        logger.info(f"开始排列 {len(selected_elements)} 个元素")
        logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 初始化服务
        try:
            service = CanvasLayerArrangementService(api_key=api_key)
        except ValueError as ve:
            logger.error(f"服务初始化失败: {ve}")
            raise HTTPException(status_code=500, detail=f"服务初始化失败: {str(ve)}")
        
        # 执行排列
        try:
            arrangements = await service.arrange_canvas_elements(
                selected_elements=selected_elements,
                canvas_width=canvas_width,
                canvas_height=canvas_height,
                target_width=target_width,
                target_height=target_height
            )
        except ValueError as ve:
            logger.error(f"排列处理失败: {ve}")
            raise HTTPException(status_code=400, detail=f"排列处理失败: {str(ve)}")
        
        # 验证返回结果
        if not arrangements or len(arrangements) == 0:
            logger.warning("排列服务返回空结果")
            raise HTTPException(status_code=500, detail="排列服务返回空结果，请检查 Gemini API 配置")
        
        if len(arrangements) != len(selected_elements):
            logger.warning(f"排列结果数量 ({len(arrangements)}) 与选中元素数量 ({len(selected_elements)}) 不匹配")
        
        logger.info(f"成功生成 {len(arrangements)} 个元素的排列方案")
        
        return {
            "success": True,
            "arrangements": arrangements
        }
        
    except HTTPException as he:
        logger.error(f"HTTP错误: {he.detail}")
        raise he
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"图层排列失败: {e}\n{error_trace}")
        # 提供更详细的错误信息
        error_detail = str(e)
        if "API密钥" in error_detail or "api_key" in error_detail.lower() or "GEMINI_API_KEY" in error_detail:
            error_detail = "需要配置Gemini API密钥，请设置GEMINI_API_KEY环境变量或在请求中提供apiKey参数"
        raise HTTPException(status_code=500, detail=f"图层排列失败: {error_detail}")

@router.get("/arrangement/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "Canvas Layer Arrangement Service",
        "version": "1.0.0"
    }