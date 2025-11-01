from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool
from psd_tools import PSDImage
from PIL import Image
from io import BytesIO
import os
import json
import uuid
import numpy as np
from typing import List, Dict, Any, Optional
from common import DEFAULT_PORT
from tools.utils.image_canvas_utils import generate_file_id
from services.config_service import FILES_DIR, SERVER_DIR
from datetime import datetime

router = APIRouter(prefix="/api/psd")

# PSD文件存储目录
PSD_DIR = os.path.join(FILES_DIR, "psd")
os.makedirs(PSD_DIR, exist_ok=True)

# Template文件夹路径（项目根目录下的template文件夹）
TEMPLATE_DIR = os.path.join(os.path.dirname(SERVER_DIR), "template")

# 模板数据库配置
TEMPLATE_DB_URL = "sqlite:///./user_data/templates.db"
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

template_engine = create_engine(TEMPLATE_DB_URL)
TemplateSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=template_engine)
TemplateBase = declarative_base()

# 模板数据库模型
class TemplateCategory(TemplateBase):
    __tablename__ = "template_categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TemplateItem(TemplateBase):
    __tablename__ = "template_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String, ForeignKey("template_categories.id"), nullable=False)
    type = Column(String, nullable=False)  # psd_file, psd_layer, image, text_style, layer_group, canvas_element
    thumbnail_url = Column(String, nullable=True)
    preview_url = Column(String, nullable=True)
    template_metadata = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    usage_count = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
    
    # 关系
    category = relationship("TemplateCategory", backref="templates")

# 创建模板数据库表
TemplateBase.metadata.create_all(bind=template_engine)

def get_template_db():
    db = TemplateSessionLocal()
    try:
        yield db
    finally:
        db.close()

async def _create_psd_file_template(
    file_id: str,
    filename: str,
    width: int,
    height: int,
    layers_count: int,
    thumbnail_url: str,
    layers_info: List[Dict[str, Any]]
) -> str:
    """
    为PSD文件自动创建模板
    """
    db = TemplateSessionLocal()
    try:
        # 获取或创建默认分类
        default_category = db.query(TemplateCategory).filter(
            TemplateCategory.name == "PSD文件"
        ).first()
        
        if not default_category:
            default_category = TemplateCategory(
                name="PSD文件",
                description="从PSD文件自动创建的模板分类",
                icon="📁",
                color="#3b82f6"
            )
            db.add(default_category)
            db.commit()
            db.refresh(default_category)
        
        # 创建模板名称（去掉.psd扩展名）
        template_name = filename.replace('.psd', '').replace('.PSD', '')
        
        # 创建模板元数据
        template_metadata = {
            "psd_file_id": file_id,
            "original_filename": filename,
            "width": width,
            "height": height,
            "layers_count": layers_count,
            "layers_info": layers_info,
            "file_type": "psd_file",
            "created_from": "auto_upload"
        }
        
        # 创建模板
        template = TemplateItem(
            name=template_name,
            description=f"PSD文件模板 - {layers_count}个图层，尺寸: {width}x{height}",
            category_id=default_category.id,
            type="psd_file",
            thumbnail_url=thumbnail_url,
            preview_url=thumbnail_url,
            template_metadata=template_metadata,
            tags=["psd", "文件", "自动创建"],
            is_public=False,
            is_favorite=False,
            usage_count=0
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        return template.id
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


@router.post("/upload")
async def upload_psd(file: UploadFile = File(...)):
    """
    上传PSD文件并解析其图层结构，同时自动创建模板
    
    Returns:
        {
            "file_id": str,
            "url": str,
            "width": int,
            "height": int,
            "layers": List[Dict],  # 图层信息列表
            "thumbnail_url": str,
            "template_id": str,  # 自动创建的模板ID
            "template_created": bool  # 是否成功创建模板
        }
    """
    print(f'🎨 Uploading PSD file: {file.filename}')
    
    # 验证文件类型
    if not file.filename or not file.filename.lower().endswith('.psd'):
        raise HTTPException(status_code=400, detail="File must be a PSD file")
    
    # 生成文件ID
    file_id = generate_file_id()
    
    try:
        # 读取文件内容
        content = await file.read()
        
        # 保存原始PSD文件
        psd_path = os.path.join(PSD_DIR, f'{file_id}.psd')
        with open(psd_path, 'wb') as f:
            f.write(content)
        
        # 解析PSD文件
        psd = PSDImage.open(BytesIO(content))
        width, height = psd.width, psd.height
        
        # 提取图层信息
        layers_info = await run_in_threadpool(_extract_layers_info, psd, file_id)
        
        # 生成缩略图
        thumbnail_url = await run_in_threadpool(_generate_thumbnail, psd, file_id)
        
        # 保存图层元数据
        metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump({
                'width': width,
                'height': height,
                'layers': layers_info,
                'original_filename': file.filename
            }, f, ensure_ascii=False, indent=2)
        
        # 自动创建PSD文件模板
        template_id = None
        template_created = False
        try:
            template_id = await _create_psd_file_template(
                file_id=file_id,
                filename=file.filename,
                width=width,
                height=height,
                layers_count=len(layers_info),
                thumbnail_url=thumbnail_url,
                layers_info=layers_info
            )
            template_created = True
            print(f'✅ PSD文件模板创建成功: {template_id}')
        except Exception as e:
            print(f'⚠️ 创建PSD文件模板失败: {e}')
            # 不影响主流程，继续返回PSD上传结果
        
        return JSONResponse({
            'file_id': file_id,
            'url': f'/api/psd/file/{file_id}',
            'width': width,
            'height': height,
            'layers': layers_info,
            'thumbnail_url': f'/api/psd/thumbnail/{file_id}',
            'template_id': template_id,
            'template_created': template_created
        })
        
    except Exception as e:
        print(f'❌ Error processing PSD: {e}')
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing PSD file: {str(e)}")


@router.get("/file/{file_id}")
async def get_psd_file(file_id: str):
    """获取原始PSD文件"""
    file_path = os.path.join(PSD_DIR, f'{file_id}.psd')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PSD file not found")
    response = FileResponse(file_path)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@router.get("/composite/{file_id}")
async def get_psd_composite(file_id: str):
    """获取PSD合成后的图像"""
    try:
        psd_path = os.path.join(PSD_DIR, f'{file_id}.psd')
        if not os.path.exists(psd_path):
            raise HTTPException(status_code=404, detail="PSD file not found")
        
        # 加载PSD并合成
        psd = PSDImage.open(psd_path)
        merged_image = psd.composite()
        
        # 保存合成图像
        composite_path = os.path.join(PSD_DIR, f'{file_id}_composite.png')
        merged_image.save(composite_path, format='PNG')
        
        return FileResponse(composite_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating composite: {str(e)}")


@router.get("/metadata/{file_id}")
async def get_psd_metadata(file_id: str):
    """获取PSD文件的元数据"""
    metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="PSD metadata not found")
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    return JSONResponse(metadata)


@router.get("/layer/{file_id}/{layer_index}")
async def get_layer_image(file_id: str, layer_index: int):
    """
    获取指定图层的图像
    
    Args:
        file_id: PSD文件ID
        layer_index: 图层索引
    """
    layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{layer_index}.png')
    if not os.path.exists(layer_path):
        raise HTTPException(status_code=404, detail="Layer image not found")
    response = FileResponse(layer_path)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@router.post("/update_layer/{file_id}/{layer_index}")
async def update_layer(file_id: str, layer_index: int, file: UploadFile = File(...)):
    """
    更新指定图层的图像
    
    Args:
        file_id: PSD文件ID
        layer_index: 图层索引
        file: 新的图层图像
    """
    try:
        # 读取新图像
        content = await file.read()
        img = Image.open(BytesIO(content))
        
        # 保存更新后的图层
        layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{layer_index}.png')
        await run_in_threadpool(img.save, layer_path, format='PNG')
        
        return JSONResponse({
            'success': True,
            'layer_url': f'/api/psd/layer/{file_id}/{layer_index}'
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating layer: {str(e)}")


@router.post("/export/{file_id}")
async def export_psd(file_id: str, format: str = "png"):
    """
    导出合成后的图像
    
    Args:
        file_id: PSD文件ID
        format: 导出格式 (png, jpg)
    
    Returns:
        导出的图像文件
    """
    try:
        psd_path = os.path.join(PSD_DIR, f'{file_id}.psd')
        if not os.path.exists(psd_path):
            raise HTTPException(status_code=404, detail="PSD file not found")
        
        # 加载PSD并合成
        psd = PSDImage.open(psd_path)
        merged_image = psd.composite()
        
        # 导出为指定格式
        export_id = generate_file_id()
        ext = format.lower()
        export_path = os.path.join(FILES_DIR, f'{export_id}.{ext}')
        
        if ext == 'jpg' or ext == 'jpeg':
            merged_image = merged_image.convert('RGB')
            await run_in_threadpool(merged_image.save, export_path, format='JPEG', quality=95)
        else:
            await run_in_threadpool(merged_image.save, export_path, format='PNG')
        
        return JSONResponse({
            'export_id': f'{export_id}.{ext}',
            'url': f'/api/file/{export_id}.{ext}'
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting PSD: {str(e)}")


def _composite_layer_with_transparency(layer) -> Optional[Image.Image]:
    """
    使用透明背景合成图层，确保保持PSD的原始透明度
    """
    try:
        from PIL import Image
        
        # 获取图层尺寸
        width = getattr(layer, 'width', 0)
        height = getattr(layer, 'height', 0)
        
        if width <= 0 or height <= 0:
            return None
            
        # 创建透明背景
        transparent_bg = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        
        # 尝试多种合成方法
        composed = None
        
        # 方法1: 直接合成
        try:
            composed = layer.composite()
        except Exception as e:
            print(f'⚠️ 直接合成失败: {e}')
        
        # 方法2: 如果直接合成失败，尝试使用透明背景
        if composed is None:
            try:
                # 临时设置图层为可见
                orig_visible = getattr(layer, 'visible', True)
                if hasattr(layer, 'visible'):
                    layer.visible = True
                
                # 在透明背景上合成
                composed = layer.composite()
                
                # 恢复原始可见性
                if hasattr(layer, 'visible'):
                    layer.visible = orig_visible
            except Exception as e:
                print(f'⚠️ 透明背景合成失败: {e}')
        
        if composed is None:
            return None
            
        # 确保合成结果是RGBA格式
        if composed.mode != 'RGBA':
            composed = composed.convert('RGBA')
            
        # 更精确的背景检测和移除
        img_array = np.array(composed)
        
        if len(img_array.shape) == 3 and img_array.shape[2] == 4:
            # RGBA图像
            alpha_channel = img_array[:, :, 3]
            rgb_channels = img_array[:, :, :3]
            
            # 检查是否为纯背景图层
            # 1. 检查alpha通道是否全为255（完全不透明）
            # 2. 检查RGB通道是否为纯色（白色、灰色等）
            
            if np.all(alpha_channel == 255):
                # 检查是否为纯色背景
                rgb_min = np.min(rgb_channels)
                rgb_max = np.max(rgb_channels)
                rgb_std = np.std(rgb_channels)
                
                # 如果RGB值变化很小（标准差小于10），认为是纯色背景
                if rgb_std < 10:
                    # 检查是否为白色或浅灰色背景
                    if rgb_min > 240:  # 接近白色
                        print(f'⚠️ 检测到白色/浅灰色背景，设为透明')
                        return Image.new('RGBA', composed.size, (0, 0, 0, 0))
                    elif rgb_min > 200:  # 浅灰色
                        print(f'⚠️ 检测到浅灰色背景，设为透明')
                        return Image.new('RGBA', composed.size, (0, 0, 0, 0))
                
                # 检查是否为特定灰色值（常见的PSD背景色）
                gray_values = [128, 192, 224, 240]  # 常见的灰色值
                for gray_val in gray_values:
                    if np.all(np.abs(rgb_channels - gray_val) < 5):
                        print(f'⚠️ 检测到灰色背景 (值: {gray_val})，设为透明')
                        return Image.new('RGBA', composed.size, (0, 0, 0, 0))
            
            # 如果有透明度，检查是否大部分区域是透明的
            transparent_pixels = np.sum(alpha_channel < 10)
            total_pixels = alpha_channel.size
            transparent_ratio = transparent_pixels / total_pixels
            
            if transparent_ratio > 0.8:  # 80%以上是透明的
                print(f'⚠️ 图层 {transparent_ratio:.2%} 透明，可能为空图层')
                return Image.new('RGBA', composed.size, (0, 0, 0, 0))
            
            return composed
        else:
            # 非RGBA图像，转换为RGBA
            return composed.convert('RGBA')
            
    except Exception as e:
        print(f'⚠️ 透明合成失败: {e}')
        import traceback
        traceback.print_exc()
        return None


def _extract_layers_info(psd: PSDImage, file_id: str) -> List[Dict[str, Any]]:
    """
    提取所有图层（含群組內子層、文字层）的信息並保存圖層圖像。
    - 對所有非群組圖層輸出 image_url（含文字層轉為位圖）。
    - 保留父子層關係（parent_index）。
    """
    layers_info: List[Dict[str, Any]] = []

    current_index = 0

    def next_index() -> int:
        nonlocal current_index
        idx = current_index
        current_index += 1
        print(f'🔢 分配圖層索引: {idx}')
        return idx

    def process_layer_recursive(layer, parent_index: Optional[int] = None) -> int:
        idx = next_index()
        layer_name = getattr(layer, 'name', f'Layer {idx}')

        layer_type = 'group' if layer.is_group() else 'layer'
        # 檢測文字層（psd-tools: layer.kind == 'type'）
        if hasattr(layer, 'kind') and getattr(layer, 'kind', None) == 'type':
            layer_type = 'text'

        print(f'📋 處理圖層 {idx}: "{layer_name}" (類型: {layer_type}, 父層: {parent_index})')

        layer_info: Dict[str, Any] = {
            'index': idx,
            'name': layer_name,
            'visible': getattr(layer, 'visible', True),
            'opacity': getattr(layer, 'opacity', 255),
            'blend_mode': str(getattr(layer, 'blend_mode', 'normal')),
            'left': getattr(layer, 'left', 0),
            'top': getattr(layer, 'top', 0),
            'width': getattr(layer, 'width', 0),
            'height': getattr(layer, 'height', 0),
            'parent_index': parent_index,
            'type': layer_type,
        }

        # 文字層屬性（若存在）
        if layer_type == 'text' and hasattr(layer, 'text_data'):
            text_data = layer.text_data
            layer_info.update({
                'font_family': getattr(text_data, 'font_name', 'Arial'),
                'font_size': getattr(text_data, 'font_size', 16),
                'font_weight': getattr(text_data, 'font_weight', 'normal'),
                'font_style': getattr(text_data, 'font_style', 'normal'),
                'text_align': getattr(text_data, 'text_align', 'left'),
                'text_color': getattr(text_data, 'text_color', '#000000'),
                'text_content': getattr(text_data, 'text_content', ''),
                'line_height': getattr(text_data, 'line_height', 1.2),
                'letter_spacing': getattr(text_data, 'letter_spacing', 0),
                'text_decoration': getattr(text_data, 'text_decoration', 'none'),
            })

        # 為所有圖層（包含群組）嘗試輸出合成位圖
        try:
            # 一律強制臨時可見以便輸出位圖（處理被隱藏的圖層）
            orig_visible = getattr(layer, 'visible', True)
            try:
                if hasattr(layer, 'visible'):
                    layer.visible = True  # type: ignore[attr-defined]
            except Exception:
                pass

            # 使用专门的透明合成函数
            composed = _composite_layer_with_transparency(layer)
                
            if composed is not None:
                # 若原始寬高為 0（常見於群組），以合成圖像大小回填
                if not layer_info['width'] or not layer_info['height']:
                    w, h = composed.size
                    layer_info['width'] = w
                    layer_info['height'] = h

                # 檢查圖像是否為空（全透明）
                img_array = np.array(composed)
                
                # 檢查是否有非透明像素
                has_content = False
                if len(img_array.shape) == 3:  # RGB/RGBA
                    if img_array.shape[2] == 4:  # RGBA
                        # 檢查alpha通道，只考虑真正有内容的像素
                        has_content = np.any(img_array[:, :, 3] > 10)  # 降低阈值，避免半透明像素被忽略
                    else:  # RGB - 这种情况不应该出现，因为PSD图层应该有alpha通道
                        # 如果只有RGB，检查是否有非白色像素
                        has_content = not np.all(img_array == 255)
                elif len(img_array.shape) == 2:  # Grayscale
                    has_content = not np.all(img_array == 255)

                if has_content:
                    # 确保保存为PNG格式以保持透明度
                    layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{idx}.png')
                    
                    # 如果图像没有alpha通道，转换为RGBA
                    if composed.mode != 'RGBA':
                        composed = composed.convert('RGBA')
                    
                    composed.save(layer_path, format='PNG')
                    layer_info['image_url'] = f'/api/psd/layer/{file_id}/{idx}'
                    print(f'✅ 成功生成圖層 {idx} ({getattr(layer, "name", "")}) 圖像: {composed.size}, 模式: {composed.mode}')
                else:
                    layer_info['image_url'] = None
                    print(f'⚠️ 圖層 {idx} ({getattr(layer, "name", "")}) 為空圖像，跳過')
            else:
                layer_info['image_url'] = None
                print(f'⚠️ 圖層 {idx} ({getattr(layer, "name", "")}) 無法合成，跳過')
        except Exception as e:
            print(f'❌ 生成圖層 {idx} ({getattr(layer, "name", "")}) 圖像失敗: {e}')
            layer_info['image_url'] = None
        finally:
            # 還原可見性
            try:
                if hasattr(layer, 'visible'):
                    layer.visible = orig_visible  # type: ignore[attr-defined]
            except Exception:
                pass

        layers_info.append(layer_info)

        # 遞迴處理群組
        if layer.is_group():
            try:
                for child in layer:
                    process_layer_recursive(child, parent_index=idx)
            except Exception as e:
                print(f'Warning: Failed to traverse group {idx}: {e}')

        return idx

    # 自頂向下遍歷所有最上層圖層
    print(f'🎨 開始解析 PSD 文件，總圖層數: {len(list(psd))}')
    try:
        for i, top_layer in enumerate(psd):
            print(f'🔄 處理頂層圖層 {i}: {getattr(top_layer, "name", f"Layer {i}")}')
            process_layer_recursive(top_layer, parent_index=None)
    except Exception as e:
        print(f'❌ 遍歷 PSD 失敗: {e}')
        import traceback
        traceback.print_exc()

    print(f'✅ PSD 解析完成，共提取 {len(layers_info)} 個圖層')
    for layer in layers_info:
        print(f'  - 圖層 {layer["index"]}: "{layer["name"]}" ({layer["type"]}) - 尺寸: {layer["width"]}x{layer["height"]} - 圖像: {bool(layer.get("image_url"))}')

    return layers_info


def _generate_thumbnail(psd: PSDImage, file_id: str) -> str:
    """生成PSD缩略图"""
    try:
        # 合成图像
        composite = psd.composite()
        
        # 生成缩略图（最大400px）
        thumbnail = composite.copy()
        thumbnail.thumbnail((400, 400), Image.Resampling.LANCZOS)
        
        # 保存缩略图
        thumbnail_path = os.path.join(PSD_DIR, f'{file_id}_thumbnail.png')
        thumbnail.save(thumbnail_path, format='PNG')
        
        return f'/api/psd/thumbnail/{file_id}'
        
    except Exception as e:
        print(f'Warning: Failed to generate thumbnail: {e}')
        return ''


@router.post("/update_layer_order/{file_id}")
async def update_layer_order(file_id: str, layer_order: List[int]):
    """
    更新图层顺序
    
    Args:
        file_id: PSD文件ID
        layer_order: 新的图层顺序（图层索引列表）
    """
    try:
        metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")
        
        # 读取现有元数据
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 重新排序图层
        layers = metadata['layers']
        ordered_layers = []
        for index in layer_order:
            layer = next((l for l in layers if l['index'] == index), None)
            if layer:
                ordered_layers.append(layer)
        
        # 更新元数据
        metadata['layers'] = ordered_layers
        
        # 保存更新后的元数据
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return JSONResponse({
            'success': True,
            'message': 'Layer order updated successfully'
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating layer order: {str(e)}")


@router.post("/duplicate_layer/{file_id}/{layer_index}")
async def duplicate_layer(file_id: str, layer_index: int):
    """
    复制指定图层
    
    Args:
        file_id: PSD文件ID
        layer_index: 要复制的图层索引
    """
    try:
        metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")
        
        # 读取现有元数据
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 找到要复制的图层
        original_layer = next((l for l in metadata['layers'] if l['index'] == layer_index), None)
        if not original_layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # 创建新图层
        new_layer_index = max([l['index'] for l in metadata['layers']]) + 1
        new_layer = original_layer.copy()
        new_layer['index'] = new_layer_index
        new_layer['name'] = f"{original_layer['name']} 副本"
        new_layer['left'] = original_layer['left'] + 20
        new_layer['top'] = original_layer['top'] + 20
        
        # 复制图层图像文件
        original_layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{layer_index}.png')
        new_layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{new_layer_index}.png')
        
        if os.path.exists(original_layer_path):
            import shutil
            shutil.copy2(original_layer_path, new_layer_path)
            new_layer['image_url'] = f'http://localhost:{DEFAULT_PORT}/api/psd/layer/{file_id}/{new_layer_index}'
        
        # 添加新图层到元数据
        metadata['layers'].append(new_layer)
        
        # 保存更新后的元数据
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return JSONResponse({
            'success': True,
            'new_layer': new_layer
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error duplicating layer: {str(e)}")


@router.delete("/delete_layer/{file_id}/{layer_index}")
async def delete_layer(file_id: str, layer_index: int):
    """
    删除指定图层
    
    Args:
        file_id: PSD文件ID
        layer_index: 要删除的图层索引
    """
    try:
        metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")
        
        # 读取现有元数据
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 删除图层
        metadata['layers'] = [l for l in metadata['layers'] if l['index'] != layer_index]
        
        # 删除图层图像文件
        layer_path = os.path.join(PSD_DIR, f'{file_id}_layer_{layer_index}.png')
        if os.path.exists(layer_path):
            os.remove(layer_path)
        
        # 保存更新后的元数据
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return JSONResponse({
            'success': True,
            'message': 'Layer deleted successfully'
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting layer: {str(e)}")


@router.post("/update_layer_properties/{file_id}/{layer_index}")
async def update_layer_properties(
    file_id: str, 
    layer_index: int, 
    properties: Dict[str, Any]
):
    """
    更新图层属性
    
    Args:
        file_id: PSD文件ID
        layer_index: 图层索引
        properties: 要更新的属性字典
    """
    try:
        metadata_path = os.path.join(PSD_DIR, f'{file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")

        # 读取现有元数据
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        # 找到要更新的图层
        layer = next((l for l in metadata['layers'] if l['index'] == layer_index), None)
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")

        # 更新图层属性
        for key, value in properties.items():
            if key in layer:
                layer[key] = value

        # 保存更新后的元数据
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        return JSONResponse({"message": "Layer properties updated successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update layer properties: {str(e)}")

@router.get("/thumbnail/{file_id}")
async def get_thumbnail(file_id: str):
    """获取PSD缩略图"""
    thumbnail_path = os.path.join(PSD_DIR, f'{file_id}_thumbnail.png')
    if not os.path.exists(thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(thumbnail_path)


@router.get("/template/{template_id}/layers")
async def get_psd_template_layers(template_id: str):
    """
    获取PSD模板的图层信息
    
    Args:
        template_id: 模板ID
    
    Returns:
        图层信息列表
    """
    db = TemplateSessionLocal()
    try:
        # 查找模板
        template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template.type != "psd_file":
            raise HTTPException(status_code=400, detail="Template is not a PSD file")
        
        # 获取PSD文件ID
        psd_file_id = template.template_metadata.get("psd_file_id")
        if not psd_file_id:
            raise HTTPException(status_code=404, detail="PSD file ID not found in template metadata")
        
        # 读取PSD元数据
        metadata_path = os.path.join(PSD_DIR, f'{psd_file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return JSONResponse({
            "template_id": template_id,
            "template_name": template.name,
            "psd_file_id": psd_file_id,
            "width": metadata["width"],
            "height": metadata["height"],
            "layers": metadata["layers"],
            "original_filename": metadata["original_filename"]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting PSD template layers: {str(e)}")
    finally:
        db.close()


@router.post("/template/{template_id}/apply")
async def apply_psd_template(template_id: str, canvas_id: str = None):
    """
    应用PSD模板到画布
    
    Args:
        template_id: 模板ID
        canvas_id: 画布ID（可选）
    
    Returns:
        应用结果
    """
    db = TemplateSessionLocal()
    try:
        # 查找模板
        template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template.type != "psd_file":
            raise HTTPException(status_code=400, detail="Template is not a PSD file")
        
        # 增加使用次数
        template.usage_count += 1
        template.updated_at = datetime.utcnow()
        db.commit()
        
        # 获取PSD文件ID
        psd_file_id = template.template_metadata.get("psd_file_id")
        if not psd_file_id:
            raise HTTPException(status_code=404, detail="PSD file ID not found in template metadata")
        
        # 读取PSD元数据
        metadata_path = os.path.join(PSD_DIR, f'{psd_file_id}_metadata.json')
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="PSD metadata not found")
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return JSONResponse({
            "success": True,
            "message": f"PSD模板 '{template.name}' 已应用到画布",
            "template_id": template_id,
            "psd_file_id": psd_file_id,
            "canvas_id": canvas_id,
            "layers": metadata["layers"],
            "usage_count": template.usage_count
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying PSD template: {str(e)}")
    finally:
        db.close()


@router.get("/templates/list")
async def list_psd_templates():
    """
    列出template文件夹下的所有PSD模板（从数据库获取已解析的模板）
    
    Returns:
        已解析的PSD模板列表（包含模板ID和基本信息）
    """
    db = TemplateSessionLocal()
    try:
        # 从数据库获取所有PSD文件类型的模板，且original_filename来自template文件夹
        templates = db.query(TemplateItem).filter(
            TemplateItem.type == "psd_file"
        ).all()
        
        # 检查template文件夹，同步新的PSD文件
        template_files = []
        if os.path.exists(TEMPLATE_DIR):
            for filename in os.listdir(TEMPLATE_DIR):
                if filename.lower().endswith('.psd'):
                    file_path = os.path.join(TEMPLATE_DIR, filename)
                    if os.path.isfile(file_path):
                        template_files.append(filename)
        
        # 返回模板列表，包含数据库中的模板信息
        # 使用字典去重：同一个文件名只保留最新的模板（按updated_at）
        template_dict = {}
        for template in templates:
            metadata = template.template_metadata or {}
            original_filename = metadata.get("original_filename", template.name)
            
            # 只处理template文件夹中存在的文件对应的模板
            if original_filename in template_files:
                # 如果这个文件名还没有记录，或者当前模板更新，则更新记录
                if original_filename not in template_dict:
                    template_dict[original_filename] = {
                        "template_id": template.id,
                        "name": original_filename,
                        "display_name": template.name,
                        "description": template.description,
                        "width": metadata.get("width", 0),
                        "height": metadata.get("height", 0),
                        "layers_count": metadata.get("layers_count", 0),
                        "thumbnail_url": template.thumbnail_url,
                        "is_parsed": True,
                        "created_at": template.created_at.isoformat() if template.created_at else None,
                        "updated_at": template.updated_at.isoformat() if template.updated_at else None
                    }
                else:
                    # 如果已存在，比较更新时间，保留最新的
                    existing_updated = template_dict[original_filename].get("updated_at")
                    current_updated = template.updated_at.isoformat() if template.updated_at else None
                    if current_updated and (not existing_updated or current_updated > existing_updated):
                        template_dict[original_filename] = {
                            "template_id": template.id,
                            "name": original_filename,
                            "display_name": template.name,
                            "description": template.description,
                            "width": metadata.get("width", 0),
                            "height": metadata.get("height", 0),
                            "layers_count": metadata.get("layers_count", 0),
                            "thumbnail_url": template.thumbnail_url,
                            "is_parsed": True,
                            "created_at": template.created_at.isoformat() if template.created_at else None,
                            "updated_at": current_updated
                        }
        
        # 转换为列表
        result = list(template_dict.values())
        
        # 查找未解析的PSD文件
        parsed_filenames = {t["name"] for t in result}
        for filename in template_files:
            if filename not in parsed_filenames:
                # 返回未解析的文件信息（前端可以触发解析）
                file_path = os.path.join(TEMPLATE_DIR, filename)
                stat = os.stat(file_path)
                result.append({
                    "template_id": None,
                    "name": filename,
                    "display_name": filename.replace('.psd', '').replace('.PSD', ''),
                    "description": None,
                    "width": 0,
                    "height": 0,
                    "layers_count": 0,
                    "thumbnail_url": None,
                    "is_parsed": False,
                    "created_at": None,
                    "size": stat.st_size,
                    "mtime": stat.st_mtime
                })
        
        # 按文件名排序
        result.sort(key=lambda x: x["name"])
        
        return JSONResponse({"templates": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing PSD templates: {str(e)}")
    finally:
        db.close()


@router.get("/templates/{filename}")
async def get_psd_template(filename: str):
    """
    获取template文件夹下的指定PSD文件（原始文件，用于fallback）
    
    Args:
        filename: PSD文件名
    
    Returns:
        PSD文件内容
    """
    try:
        # 安全检查：防止路径遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(TEMPLATE_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="PSD template file not found")
        
        if not filename.lower().endswith('.psd'):
            raise HTTPException(status_code=400, detail="File is not a PSD file")
        
        response = FileResponse(file_path)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting PSD template: {str(e)}")


@router.get("/templates/by-id/{template_id}")
async def get_psd_template_by_id(template_id: str):
    """
    根据模板ID获取已解析的PSD模板数据（快速加载，无需重新解析）
    
    Args:
        template_id: 模板ID
    
    Returns:
        已解析的PSD数据（包含所有图层信息）
    """
    db = TemplateSessionLocal()
    try:
        template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template.type != "psd_file":
            raise HTTPException(status_code=400, detail="Template is not a PSD file")
        
        metadata = template.template_metadata or {}
        
        # 检查是否有已解析的图层信息
        layers_info = metadata.get("layers_info", [])
        if not layers_info:
            raise HTTPException(status_code=404, detail="Template not parsed yet")
        
        # 增加使用次数
        template.usage_count += 1
        template.updated_at = datetime.utcnow()
        db.commit()
        
        # 构造PSD上传响应格式的数据
        psd_file_id = metadata.get("psd_file_id")
        
        # 确保file_id有效（如果不存在，使用template_id作为fallback）
        file_id = psd_file_id if psd_file_id else f"template-{template.id}"
        
        return JSONResponse({
            "file_id": file_id,
            "url": f"/api/psd/file/{psd_file_id}" if psd_file_id else None,
            "width": metadata.get("width", 0),
            "height": metadata.get("height", 0),
            "layers": layers_info,
            "thumbnail_url": template.thumbnail_url,
            "original_filename": metadata.get("original_filename", template.name),
            "template_id": template.id,
            "template_created": True
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting PSD template: {str(e)}")
    finally:
        db.close()


@router.post("/templates/parse/{filename}")
async def parse_psd_template(filename: str):
    """
    解析template文件夹下的PSD文件并存储到数据库
    
    Args:
        filename: PSD文件名
    
    Returns:
        解析结果和模板ID
    """
    try:
        # 安全检查
        if '..' in filename or '/' in filename or '\\' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(TEMPLATE_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="PSD template file not found")
        
        if not filename.lower().endswith('.psd'):
            raise HTTPException(status_code=400, detail="File is not a PSD file")
        
        db = TemplateSessionLocal()
        try:
            # 检查是否已经解析过（查询所有psd_file类型的模板，然后检查metadata）
            all_psd_templates = db.query(TemplateItem).filter(
                TemplateItem.type == "psd_file"
            ).all()
            existing_template = None
            for template in all_psd_templates:
                metadata = template.template_metadata or {}
                if metadata.get("original_filename") == filename:
                    existing_template = template
                    break
            
            if existing_template:
                return JSONResponse({
                    "template_id": existing_template.id,
                    "already_parsed": True,
                    "message": "Template already parsed"
                })
            
            # 读取并解析PSD文件
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # 生成文件ID（使用文件名hash确保一致性）
            import hashlib
            file_hash = hashlib.md5(content).hexdigest()
            file_id = f"template-{file_hash[:16]}"
            
            # 解析PSD文件
            psd = PSDImage.open(BytesIO(content))
            width, height = psd.width, psd.height
            
            # 提取图层信息
            layers_info = await run_in_threadpool(_extract_layers_info, psd, file_id)
            
            # 生成缩略图
            thumbnail_url = await run_in_threadpool(_generate_thumbnail, psd, file_id)
            
            # 创建模板
            template_id = await _create_psd_file_template(
                file_id=file_id,
                filename=filename,
                width=width,
                height=height,
                layers_count=len(layers_info),
                thumbnail_url=thumbnail_url,
                layers_info=layers_info
            )
            
            return JSONResponse({
                "template_id": template_id,
                "already_parsed": False,
                "message": "Template parsed successfully",
                "layers_count": len(layers_info),
                "width": width,
                "height": height
            })
        finally:
            db.close()
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error parsing PSD template: {str(e)}")