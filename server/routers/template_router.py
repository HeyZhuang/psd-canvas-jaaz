from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query, Form
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
import uuid
from PIL import Image
import io

# 数据库配置
DATABASE_URL = "sqlite:///./user_data/templates.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 数据库模型
class TemplateCategory(Base):
    __tablename__ = "template_categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TemplateItem(Base):
    __tablename__ = "template_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String, ForeignKey("template_categories.id"), nullable=False)
    type = Column(String, nullable=False)  # psd_layer, image, text_style, layer_group, canvas_element
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

class TemplateCollection(Base):
    __tablename__ = "template_collections"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    template_ids = Column(JSON, nullable=True, default=list)
    thumbnail_url = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)

# Pydantic模型
class TemplateCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class TemplateCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class TemplateItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    type: str
    template_metadata: Optional[Dict[str, Any]] = {}
    tags: Optional[List[str]] = []
    is_public: bool = False

class TemplateItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    template_metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class TemplateCollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_ids: Optional[List[str]] = []
    is_public: bool = False

class TemplateCollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_ids: Optional[List[str]] = None
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

# 文件上传目录
UPLOAD_DIR = "user_data/template_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_uploaded_file(file: UploadFile, subfolder: str = "") -> str:
    """保存上传的文件并返回URL"""
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{file_id}{file_extension}"
    
    folder_path = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder_path, exist_ok=True)
    
    file_path = os.path.join(folder_path, filename)
    
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
    
    # 返回完整的URL路径
    return f"http://localhost:3004/api/templates/uploads/{subfolder}/{filename}"

def generate_thumbnail(image_path: str, size: tuple = (200, 200)) -> str:
    """生成缩略图"""
    try:
        with Image.open(image_path) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            thumbnail_path = image_path.replace(".", "_thumb.")
            img.save(thumbnail_path)
            return thumbnail_path
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return image_path

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 路由
router = APIRouter(prefix="/templates", tags=["templates"])

# 分类管理
@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """获取所有分类"""
    categories = db.query(TemplateCategory).all()
    return JSONResponse([{
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "icon": cat.icon,
        "color": cat.color,
        "created_at": cat.created_at.isoformat(),
        "updated_at": cat.updated_at.isoformat(),
    } for cat in categories])

@router.post("/categories")
async def create_category(category: TemplateCategoryCreate, db: Session = Depends(get_db)):
    """创建新分类"""
    db_category = TemplateCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return JSONResponse({
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description,
        "icon": db_category.icon,
        "color": db_category.color,
        "created_at": db_category.created_at.isoformat(),
        "updated_at": db_category.updated_at.isoformat(),
    })

@router.put("/categories/{category_id}")
async def update_category(category_id: str, category: TemplateCategoryUpdate, db: Session = Depends(get_db)):
    """更新分类"""
    db_category = db.query(TemplateCategory).filter(TemplateCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db_category.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_category)
    
    return JSONResponse({
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description,
        "icon": db_category.icon,
        "color": db_category.color,
        "created_at": db_category.created_at.isoformat(),
        "updated_at": db_category.updated_at.isoformat(),
    })

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    """删除分类"""
    db_category = db.query(TemplateCategory).filter(TemplateCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 检查是否有模板使用此分类
    templates_count = db.query(TemplateItem).filter(TemplateItem.category_id == category_id).count()
    if templates_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {templates_count} templates")
    
    db.delete(db_category)
    db.commit()
    return JSONResponse({"message": "Category deleted successfully"})

# 模板管理
@router.get("/items")
async def get_templates(
    category_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    created_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取模板列表"""
    query = db.query(TemplateItem)
    
    if category_id:
        query = query.filter(TemplateItem.category_id == category_id)
    if type:
        query = query.filter(TemplateItem.type == type)
    if is_favorite is not None:
        query = query.filter(TemplateItem.is_favorite == is_favorite)
    if is_public is not None:
        query = query.filter(TemplateItem.is_public == is_public)
    if created_by:
        query = query.filter(TemplateItem.created_by == created_by)
    
    templates = query.all()
    return JSONResponse([{
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "metadata": template.template_metadata,
        "tags": template.tags or [],
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    } for template in templates])

@router.get("/items/{template_id}")
async def get_template(template_id: str, db: Session = Depends(get_db)):
    """获取单个模板"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return JSONResponse({
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "metadata": template.template_metadata,
        "tags": template.tags or [],
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    })

@router.post("/items")
async def create_template(
    name: str = Form(...),
    description: str = Form(""),
    category_id: str = Form(...),
    type: str = Form(...),
    template_metadata: str = Form("{}"),
    tags: str = Form("[]"),
    is_public: str = Form("false"),
    thumbnail: Optional[UploadFile] = File(None),
    preview: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """创建新模板"""
    try:
        metadata_dict = json.loads(template_metadata)
        tags_list = json.loads(tags)
        is_public_bool = is_public.lower() == "true"
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    
    # 保存文件
    thumbnail_url = None
    preview_url = None
    
    if thumbnail:
        thumbnail_url = save_uploaded_file(thumbnail, "thumbnails")
    
    if preview:
        preview_url = save_uploaded_file(preview, "previews")
    
    template = TemplateItem(
        name=name,
        description=description,
        category_id=category_id,
        type=type,
        template_metadata=metadata_dict,
        tags=tags_list,
        is_public=is_public_bool,
        thumbnail_url=thumbnail_url,
        preview_url=preview_url,
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return JSONResponse({
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "metadata": template.template_metadata,
        "tags": template.tags,
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    })

@router.put("/items/{template_id}")
async def update_template(
    template_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    template_metadata: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_public: Optional[str] = Form(None),
    thumbnail: Optional[UploadFile] = File(None),
    preview: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """更新模板"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 更新基本字段
    if name is not None:
        template.name = name
    if description is not None:
        template.description = description
    if category_id is not None:
        template.category_id = category_id
    if template_metadata is not None:
        try:
            template.template_metadata = json.loads(template_metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata JSON format")
    if tags is not None:
        try:
            template.tags = json.loads(tags)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid tags JSON format")
    if is_public is not None:
        template.is_public = is_public.lower() == "true"
    
    # 更新文件
    if thumbnail:
        template.thumbnail_url = save_uploaded_file(thumbnail, "thumbnails")
    
    if preview:
        template.preview_url = save_uploaded_file(preview, "previews")
    
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    
    return JSONResponse({
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "metadata": template.template_metadata,
        "tags": template.tags,
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    })

@router.delete("/items/{template_id}")
async def delete_template(template_id: str, db: Session = Depends(get_db)):
    """删除模板"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 删除相关文件
    if template.thumbnail_url:
        thumbnail_path = template.thumbnail_url.replace("/api/template/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
    
    if template.preview_url:
        preview_path = template.preview_url.replace("/api/template/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(preview_path):
            os.remove(preview_path)
    
    db.delete(template)
    db.commit()
    return JSONResponse({"message": "Template deleted successfully"})

@router.post("/items/{template_id}/favorite")
async def toggle_favorite(template_id: str, db: Session = Depends(get_db)):
    """切换收藏状态"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_favorite = not template.is_favorite
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    
    return JSONResponse({
        "id": template.id,
        "is_favorite": template.is_favorite,
    })

@router.post("/items/{template_id}/usage")
async def increment_usage(template_id: str, db: Session = Depends(get_db)):
    """增加使用次数"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.usage_count += 1
    template.updated_at = datetime.utcnow()
    db.commit()
    
    return JSONResponse({"message": "Usage count incremented"})

# 集合管理
@router.get("/collections")
async def get_collections(db: Session = Depends(get_db)):
    """获取所有集合"""
    collections = db.query(TemplateCollection).all()
    return JSONResponse([{
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "template_ids": collection.template_ids or [],
        "thumbnail_url": collection.thumbnail_url,
        "is_public": collection.is_public,
        "created_at": collection.created_at.isoformat(),
        "updated_at": collection.updated_at.isoformat(),
        "created_by": collection.created_by,
    } for collection in collections])

@router.post("/collections")
async def create_collection(collection: TemplateCollectionCreate, db: Session = Depends(get_db)):
    """创建新集合"""
    db_collection = TemplateCollection(**collection.dict())
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    
    return JSONResponse({
        "id": db_collection.id,
        "name": db_collection.name,
        "description": db_collection.description,
        "template_ids": db_collection.template_ids or [],
        "thumbnail_url": db_collection.thumbnail_url,
        "is_public": db_collection.is_public,
        "created_at": db_collection.created_at.isoformat(),
        "updated_at": db_collection.updated_at.isoformat(),
        "created_by": db_collection.created_by,
    })

@router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, collection: TemplateCollectionUpdate, db: Session = Depends(get_db)):
    """更新集合"""
    db_collection = db.query(TemplateCollection).filter(TemplateCollection.id == collection_id).first()
    if not db_collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    update_data = collection.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_collection, field, value)
    
    db_collection.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_collection)
    
    return JSONResponse({
        "id": db_collection.id,
        "name": db_collection.name,
        "description": db_collection.description,
        "template_ids": db_collection.template_ids or [],
        "thumbnail_url": db_collection.thumbnail_url,
        "is_public": db_collection.is_public,
        "created_at": db_collection.created_at.isoformat(),
        "updated_at": db_collection.updated_at.isoformat(),
        "created_by": db_collection.created_by,
    })

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, db: Session = Depends(get_db)):
    """删除集合"""
    db_collection = db.query(TemplateCollection).filter(TemplateCollection.id == collection_id).first()
    if not db_collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    db.delete(db_collection)
    db.commit()
    return JSONResponse({"message": "Collection deleted successfully"})

# 特殊功能
@router.post("/from-psd-layer")
async def create_from_psd_layer(
    psd_file_id: str = Form(...),
    layer_index: int = Form(...),
    name: str = Form(...),
    description: str = Form(""),
    category_id: str = Form(...),
    tags: str = Form("[]"),
    is_public: str = Form("false"),
    db: Session = Depends(get_db)
):
    """从PSD图层创建模板"""
    try:
        tags_list = json.loads(tags)
        is_public_bool = is_public.lower() == "true"
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    
    # 这里需要实现从PSD文件提取图层信息的逻辑
    # 暂时使用占位符
    template_metadata = {
        "psd_file_id": psd_file_id,
        "layer_index": layer_index,
        "layer_name": f"Layer {layer_index}",
        "layer_type": "layer",
    }
    
    template = TemplateItem(
        name=name,
        description=description,
        category_id=category_id,
        type="psd_layer",
        template_metadata=template_metadata,
        tags=tags_list,
        is_public=is_public_bool,
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return JSONResponse({
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "metadata": template.template_metadata,
        "tags": template.tags,
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    })

@router.post("/apply-to-canvas")
async def apply_to_canvas(
    template_id: str = Form(...),
    canvas_id: str = Form(...),
    position: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """应用模板到画布"""
    template = db.query(TemplateItem).filter(TemplateItem.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 增加使用次数
    template.usage_count += 1
    template.updated_at = datetime.utcnow()
    db.commit()
    
    # 解析位置信息
    position_data = None
    if position:
        try:
            position_data = json.loads(position)
        except json.JSONDecodeError:
            position_data = None
    
    # 返回模板数据，前端将使用这些数据在Excalidraw中创建元素
    return JSONResponse({
        "message": "Template applied to canvas successfully",
        "template": {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "type": template.type,
            "thumbnail_url": template.thumbnail_url,
            "preview_url": template.preview_url,
            "metadata": template.template_metadata,
            "tags": template.tags,
            "position": position_data,
            "canvas_id": canvas_id
        }
    })

@router.get("/search")
async def search_templates(
    q: str = Query(...),
    category_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """搜索模板"""
    query = db.query(TemplateItem)
    
    # 文本搜索
    if q:
        query = query.filter(
            TemplateItem.name.contains(q) |
            TemplateItem.description.contains(q)
        )
    
    # 其他筛选条件
    if category_id:
        query = query.filter(TemplateItem.category_id == category_id)
    if type:
        query = query.filter(TemplateItem.type == type)
    if is_favorite is not None:
        query = query.filter(TemplateItem.is_favorite == is_favorite)
    if is_public is not None:
        query = query.filter(TemplateItem.is_public == is_public)
    
    templates = query.all()
    return JSONResponse([{
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category_id": template.category_id,
        "type": template.type,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "metadata": template.template_metadata,
        "tags": template.tags or [],
        "usage_count": template.usage_count,
        "is_favorite": template.is_favorite,
        "is_public": template.is_public,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "created_by": template.created_by,
    } for template in templates])

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """获取模板统计信息"""
    total_templates = db.query(TemplateItem).count()
    total_categories = db.query(TemplateCategory).count()
    total_collections = db.query(TemplateCollection).count()
    
    # 最常用的模板
    most_used = db.query(TemplateItem).order_by(TemplateItem.usage_count.desc()).limit(5).all()
    most_used_templates = [{
        "id": template.id,
        "name": template.name,
        "usage_count": template.usage_count,
    } for template in most_used]
    
    # 最近的模板
    recent = db.query(TemplateItem).order_by(TemplateItem.created_at.desc()).limit(5).all()
    recent_templates = [{
        "id": template.id,
        "name": template.name,
        "created_at": template.created_at.isoformat(),
    } for template in recent]
    
    return JSONResponse({
        "total_templates": total_templates,
        "total_categories": total_categories,
        "total_collections": total_collections,
        "most_used_templates": most_used_templates,
        "recent_templates": recent_templates,
    })

# 文件服务
@router.get("/uploads/{subfolder}/{filename}")
async def get_uploaded_file(subfolder: str, filename: str):
    """获取上传的文件"""
    file_path = os.path.join(UPLOAD_DIR, subfolder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    from fastapi.responses import FileResponse
    from fastapi import Response
    
    # 根据文件扩展名设置正确的媒体类型
    media_type = "application/octet-stream"
    if filename.lower().endswith(('.jpg', '.jpeg')):
        media_type = "image/jpeg"
    elif filename.lower().endswith('.png'):
        media_type = "image/png"
    elif filename.lower().endswith('.gif'):
        media_type = "image/gif"
    elif filename.lower().endswith('.webp'):
        media_type = "image/webp"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000",  # 缓存1年
            "Access-Control-Allow-Origin": "*",
        }
    )