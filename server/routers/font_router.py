from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query, Form
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
import uuid
import shutil
from fontTools.ttLib import TTFont
import mimetypes

# 数据库配置
DATABASE_URL = "sqlite:///./user_data/fonts.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 字体数据库模型
class FontCategory(Base):
    __tablename__ = "font_categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FontItem(Base):
    __tablename__ = "font_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    font_family = Column(String, nullable=False)
    font_file_name = Column(String, nullable=False)
    font_file_path = Column(String, nullable=False)
    font_file_url = Column(String, nullable=False)
    font_format = Column(String, nullable=False)  # ttf, otf, woff, woff2
    file_size = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String, ForeignKey("font_categories.id"), nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    usage_count = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
    
    # 字体元数据
    font_metadata = Column(JSON, nullable=True)  # 存储字体信息如字重、样式等
    
    # 关系
    category = relationship("FontCategory", backref="fonts")

# Pydantic模型
class FontCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class FontCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class FontItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = []
    is_public: bool = False

class FontItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 依赖注入
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 字体文件上传目录
FONT_UPLOAD_DIR = "user_data/font_uploads"
os.makedirs(FONT_UPLOAD_DIR, exist_ok=True)

# 支持的字体格式
SUPPORTED_FONT_FORMATS = {'.ttf', '.otf', '.woff', '.woff2'}

def get_font_metadata(font_path: str) -> Dict[str, Any]:
    """提取字体元数据"""
    try:
        font = TTFont(font_path)
        name_table = font['name']
        
        metadata = {
            'font_family': '',
            'font_weight': 'normal',
            'font_style': 'normal',
            'font_stretch': 'normal',
            'unicode_ranges': [],
            'glyph_count': len(font.getGlyphSet()),
            'version': '',
            'copyright': '',
            'vendor': ''
        }
        
        # 提取字体名称信息
        for record in name_table.names:
            if record.nameID == 1:  # Font Family
                metadata['font_family'] = record.toUnicode()
            elif record.nameID == 2:  # Font Subfamily
                metadata['font_style'] = record.toUnicode()
            elif record.nameID == 5:  # Version
                metadata['version'] = record.toUnicode()
            elif record.nameID == 0:  # Copyright
                metadata['copyright'] = record.toUnicode()
            elif record.nameID == 8:  # Manufacturer
                metadata['vendor'] = record.toUnicode()
        
        # 提取字重信息
        if 'OS/2' in font:
            os2_table = font['OS/2']
            weight_class = os2_table.usWeightClass
            weight_map = {
                100: 'Thin',
                200: 'Extra Light',
                300: 'Light',
                400: 'Normal',
                500: 'Medium',
                600: 'Semi Bold',
                700: 'Bold',
                800: 'Extra Bold',
                900: 'Black'
            }
            metadata['font_weight'] = weight_map.get(weight_class, 'Normal')
        
        font.close()
        return metadata
        
    except Exception as e:
        print(f"Error extracting font metadata: {e}")
        return {
            'font_family': 'Unknown',
            'font_weight': 'normal',
            'font_style': 'normal',
            'font_stretch': 'normal',
            'unicode_ranges': [],
            'glyph_count': 0,
            'version': '',
            'copyright': '',
            'vendor': ''
        }

def save_font_file(file: UploadFile) -> Dict[str, str]:
    """保存字体文件并返回文件信息"""
    # 检查文件格式
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if file_extension not in SUPPORTED_FONT_FORMATS:
        raise HTTPException(status_code=400, detail=f"不支持的字体格式: {file_extension}")
    
    # 生成唯一文件名
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_extension}"
    
    # 创建字体文件目录
    font_dir = os.path.join(FONT_UPLOAD_DIR, "fonts")
    os.makedirs(font_dir, exist_ok=True)
    
    file_path = os.path.join(font_dir, filename)
    
    # 保存文件
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
    
    # 获取文件大小
    file_size = os.path.getsize(file_path)
    
    # 提取字体元数据
    font_metadata = get_font_metadata(file_path)
    
    # 生成访问URL
    file_url = f"/api/fonts/files/{filename}"
    
    return {
        'file_path': file_path,
        'file_url': file_url,
        'file_size': file_size,
        'font_metadata': font_metadata,
        'font_format': file_extension[1:]  # 去掉点号
    }

# 路由
router = APIRouter(prefix="/api/fonts", tags=["fonts"])

# 分类管理
@router.get("/categories")
async def get_font_categories(db: Session = Depends(get_db)):
    """获取所有字体分类"""
    categories = db.query(FontCategory).all()
    return [{
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "icon": cat.icon,
        "color": cat.color,
        "created_at": cat.created_at.isoformat(),
        "updated_at": cat.updated_at.isoformat(),
    } for cat in categories]

@router.post("/categories")
async def create_font_category(category: FontCategoryCreate, db: Session = Depends(get_db)):
    """创建新字体分类"""
    db_category = FontCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return {
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description,
        "icon": db_category.icon,
        "color": db_category.color,
        "created_at": db_category.created_at.isoformat(),
        "updated_at": db_category.updated_at.isoformat(),
    }

@router.put("/categories/{category_id}")
async def update_font_category(category_id: str, category: FontCategoryUpdate, db: Session = Depends(get_db)):
    """更新字体分类"""
    db_category = db.query(FontCategory).filter(FontCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db_category.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_category)
    
    return {
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description,
        "icon": db_category.icon,
        "color": db_category.color,
        "created_at": db_category.created_at.isoformat(),
        "updated_at": db_category.updated_at.isoformat(),
    }

@router.delete("/categories/{category_id}")
async def delete_font_category(category_id: str, db: Session = Depends(get_db)):
    """删除字体分类"""
    db_category = db.query(FontCategory).filter(FontCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 检查是否有字体使用此分类
    fonts_count = db.query(FontItem).filter(FontItem.category_id == category_id).count()
    if fonts_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {fonts_count} fonts")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}

# 字体管理
@router.get("/items")
async def get_fonts(
    category_id: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    created_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取字体列表"""
    query = db.query(FontItem)
    
    if category_id:
        query = query.filter(FontItem.category_id == category_id)
    if is_favorite is not None:
        query = query.filter(FontItem.is_favorite == is_favorite)
    if is_public is not None:
        query = query.filter(FontItem.is_public == is_public)
    if created_by:
        query = query.filter(FontItem.created_by == created_by)
    
    fonts = query.all()
    return [{
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "font_file_name": font.font_file_name,
        "font_file_url": font.font_file_url,
        "font_format": font.font_format,
        "file_size": font.file_size,
        "description": font.description,
        "category_id": font.category_id,
        "tags": font.tags or [],
        "usage_count": font.usage_count,
        "is_favorite": font.is_favorite,
        "is_public": font.is_public,
        "font_metadata": font.font_metadata or {},
        "created_at": font.created_at.isoformat(),
        "updated_at": font.updated_at.isoformat(),
        "created_by": font.created_by,
    } for font in fonts]

@router.get("/items/{font_id}")
async def get_font(font_id: str, db: Session = Depends(get_db)):
    """获取单个字体"""
    font = db.query(FontItem).filter(FontItem.id == font_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    
    return {
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "font_file_name": font.font_file_name,
        "font_file_url": font.font_file_url,
        "font_format": font.font_format,
        "file_size": font.file_size,
        "description": font.description,
        "category_id": font.category_id,
        "tags": font.tags or [],
        "usage_count": font.usage_count,
        "is_favorite": font.is_favorite,
        "is_public": font.is_public,
        "font_metadata": font.font_metadata or {},
        "created_at": font.created_at.isoformat(),
        "updated_at": font.updated_at.isoformat(),
        "created_by": font.created_by,
    }

@router.post("/items")
async def upload_font(
    font_file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category_id: str = Form(""),
    tags: str = Form("[]"),
    is_public: str = Form("false"),
    db: Session = Depends(get_db)
):
    """上传字体文件"""
    try:
        tags_list = json.loads(tags)
        is_public_bool = is_public.lower() == "true"
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    
    # 保存字体文件
    file_info = save_font_file(font_file)
    
    # 创建字体记录
    font = FontItem(
        name=name,
        font_family=file_info['font_metadata']['font_family'],
        font_file_name=font_file.filename,
        font_file_path=file_info['file_path'],
        font_file_url=file_info['file_url'],
        font_format=file_info['font_format'],
        file_size=file_info['file_size'],
        description=description,
        category_id=category_id if category_id else None,
        tags=tags_list,
        is_public=is_public_bool,
        font_metadata=file_info['font_metadata'],
    )
    
    db.add(font)
    db.commit()
    db.refresh(font)
    
    return {
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "font_file_name": font.font_file_name,
        "font_file_url": font.font_file_url,
        "font_format": font.font_format,
        "file_size": font.file_size,
        "description": font.description,
        "category_id": font.category_id,
        "tags": font.tags,
        "usage_count": font.usage_count,
        "is_favorite": font.is_favorite,
        "is_public": font.is_public,
        "font_metadata": font.font_metadata,
        "created_at": font.created_at.isoformat(),
        "updated_at": font.updated_at.isoformat(),
        "created_by": font.created_by,
    }

@router.put("/items/{font_id}")
async def update_font(
    font_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_public: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """更新字体信息"""
    font = db.query(FontItem).filter(FontItem.id == font_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    
    # 更新基本字段
    if name is not None:
        font.name = name
    if description is not None:
        font.description = description
    if category_id is not None:
        font.category_id = category_id if category_id else None
    if tags is not None:
        try:
            font.tags = json.loads(tags)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid tags JSON format")
    if is_public is not None:
        font.is_public = is_public.lower() == "true"
    
    font.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(font)
    
    return {
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "font_file_name": font.font_file_name,
        "font_file_url": font.font_file_url,
        "font_format": font.font_format,
        "file_size": font.file_size,
        "description": font.description,
        "category_id": font.category_id,
        "tags": font.tags,
        "usage_count": font.usage_count,
        "is_favorite": font.is_favorite,
        "is_public": font.is_public,
        "font_metadata": font.font_metadata,
        "created_at": font.created_at.isoformat(),
        "updated_at": font.updated_at.isoformat(),
        "created_by": font.created_by,
    }

@router.delete("/items/{font_id}")
async def delete_font(font_id: str, db: Session = Depends(get_db)):
    """删除字体"""
    font = db.query(FontItem).filter(FontItem.id == font_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    
    # 删除字体文件
    if os.path.exists(font.font_file_path):
        os.remove(font.font_file_path)
    
    db.delete(font)
    db.commit()
    return {"message": "Font deleted successfully"}

@router.post("/items/{font_id}/favorite")
async def toggle_font_favorite(font_id: str, db: Session = Depends(get_db)):
    """切换字体收藏状态"""
    font = db.query(FontItem).filter(FontItem.id == font_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    
    font.is_favorite = not font.is_favorite
    font.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(font)
    
    return {
        "id": font.id,
        "is_favorite": font.is_favorite,
    }

@router.post("/items/{font_id}/usage")
async def increment_font_usage(font_id: str, db: Session = Depends(get_db)):
    """增加字体使用次数"""
    font = db.query(FontItem).filter(FontItem.id == font_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    
    font.usage_count += 1
    font.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Usage count incremented"}

@router.get("/search")
async def search_fonts(
    q: str = Query(...),
    category_id: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """搜索字体"""
    query = db.query(FontItem)
    
    # 文本搜索
    if q:
        query = query.filter(
            FontItem.name.contains(q) |
            FontItem.font_family.contains(q) |
            FontItem.description.contains(q)
        )
    
    # 其他筛选条件
    if category_id:
        query = query.filter(FontItem.category_id == category_id)
    if is_favorite is not None:
        query = query.filter(FontItem.is_favorite == is_favorite)
    if is_public is not None:
        query = query.filter(FontItem.is_public == is_public)
    
    fonts = query.all()
    return [{
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "font_file_name": font.font_file_name,
        "font_file_url": font.font_file_url,
        "font_format": font.font_format,
        "file_size": font.file_size,
        "description": font.description,
        "category_id": font.category_id,
        "tags": font.tags or [],
        "usage_count": font.usage_count,
        "is_favorite": font.is_favorite,
        "is_public": font.is_public,
        "font_metadata": font.font_metadata or {},
        "created_at": font.created_at.isoformat(),
        "updated_at": font.updated_at.isoformat(),
        "created_by": font.created_by,
    } for font in fonts]

@router.get("/stats")
async def get_font_stats(db: Session = Depends(get_db)):
    """获取字体统计信息"""
    total_fonts = db.query(FontItem).count()
    total_categories = db.query(FontCategory).count()
    
    # 最常用的字体
    most_used = db.query(FontItem).order_by(FontItem.usage_count.desc()).limit(5).all()
    most_used_fonts = [{
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "usage_count": font.usage_count,
    } for font in most_used]
    
    # 最近的字体
    recent = db.query(FontItem).order_by(FontItem.created_at.desc()).limit(5).all()
    recent_fonts = [{
        "id": font.id,
        "name": font.name,
        "font_family": font.font_family,
        "created_at": font.created_at.isoformat(),
    } for font in recent]
    
    return {
        "total_fonts": total_fonts,
        "total_categories": total_categories,
        "most_used_fonts": most_used_fonts,
        "recent_fonts": recent_fonts,
    }

# 字体文件服务
@router.get("/files/{filename}")
async def get_font_file(filename: str):
    """获取字体文件"""
    file_path = os.path.join(FONT_UPLOAD_DIR, "fonts", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Font file not found")
    
    # 根据文件扩展名设置正确的媒体类型
    media_type = "application/octet-stream"
    if filename.lower().endswith('.ttf'):
        media_type = "font/ttf"
    elif filename.lower().endswith('.otf'):
        media_type = "font/otf"
    elif filename.lower().endswith('.woff'):
        media_type = "font/woff"
    elif filename.lower().endswith('.woff2'):
        media_type = "font/woff2"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000",  # 缓存1年
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )

# 批量导入现有字体
@router.post("/import-existing")
async def import_existing_fonts(db: Session = Depends(get_db)):
    """导入fonts文件夹中的现有字体"""
    fonts_dir = "fonts"
    if not os.path.exists(fonts_dir):
        raise HTTPException(status_code=404, detail="Fonts directory not found")
    
    imported_count = 0
    errors = []
    
    for filename in os.listdir(fonts_dir):
        if any(filename.lower().endswith(ext) for ext in SUPPORTED_FONT_FORMATS):
            try:
                # 检查是否已经存在
                existing_font = db.query(FontItem).filter(FontItem.font_file_name == filename).first()
                if existing_font:
                    continue
                
                file_path = os.path.join(fonts_dir, filename)
                
                # 创建模拟的UploadFile对象
                class MockUploadFile:
                    def __init__(self, file_path, filename):
                        self.filename = filename
                        self.file = open(file_path, 'rb')
                
                mock_file = MockUploadFile(file_path, filename)
                
                # 保存字体文件
                file_info = save_font_file(mock_file)
                mock_file.file.close()
                
                # 创建字体记录
                font = FontItem(
                    name=os.path.splitext(filename)[0],
                    font_family=file_info['font_metadata']['font_family'],
                    font_file_name=filename,
                    font_file_path=file_info['file_path'],
                    font_file_url=file_info['file_url'],
                    font_format=file_info['font_format'],
                    file_size=file_info['file_size'],
                    description=f"从现有文件导入: {filename}",
                    tags=["imported"],
                    is_public=False,
                    font_metadata=file_info['font_metadata'],
                )
                
                db.add(font)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"导入 {filename} 失败: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"成功导入 {imported_count} 个字体",
        "imported_count": imported_count,
        "errors": errors
    }
