from fastapi import APIRouter, Request, HTTPException
from starlette.requests import ClientDisconnect
#from routers.agent import chat
from services.chat_service import handle_chat
from services.db_service import db_service
import asyncio
import json

router = APIRouter(prefix="/api/canvas")

@router.get("/list")
async def list_canvases():
    return await db_service.list_canvases()

@router.post("/create")
async def create_canvas(request: Request):
    data = await request.json()
    id = data.get('canvas_id')
    name = data.get('name')

    asyncio.create_task(handle_chat(data))
    await db_service.create_canvas(id, name)
    return {"id": id }

@router.get("/{id}")
async def get_canvas(id: str):
    return await db_service.get_canvas_data(id)

@router.post("/{id}/save")
async def save_canvas(id: str, request: Request):
    try:
        payload = await request.json()
        data_str = json.dumps(payload['data'])
        await db_service.save_canvas_data(id, data_str, payload['thumbnail'])
        return {"id": id }
    except ClientDisconnect:
        # 客户端断开连接（通常发生在自动保存时用户关闭页面）
        print(f"⚠️ 客户端断开连接，画布 {id} 自动保存被中断")
        # 不抛出异常，静默处理
        return {"id": id, "status": "partial"}
    except Exception as e:
        # 记录详细错误信息
        import traceback
        print(f"❌ 保存画布 {id} 失败:")
        print(f"   错误类型: {type(e).__name__}")
        print(f"   错误信息: {str(e)}")
        print(f"   堆栈跟踪:")
        traceback.print_exc()
        
        # 返回友好的错误响应
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

@router.post("/{id}/rename")
async def rename_canvas(id: str, request: Request):
    data = await request.json()
    name = data.get('name')
    await db_service.rename_canvas(id, name)
    return {"id": id }

@router.delete("/{id}/delete")
async def delete_canvas(id: str):
    await db_service.delete_canvas(id)
    return {"id": id }