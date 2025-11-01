import sys
import io
import os
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import argparse
from contextlib import asynccontextmanager
from starlette.types import Scope
from starlette.responses import Response
import socketio # type: ignore

sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
print('Importing websocket_router')
from routers.websocket_router import *  # DO NOT DELETE THIS LINE, OTHERWISE, WEBSOCKET WILL NOT WORK
print('Importing routers')
from routers import config_router, image_router, root_router, workspace, canvas, ssl_test, chat_router, settings, tool_confirmation, layer_arrangement_router

# 条件导入PSD相关路由器，以支持在没有psd-tools的环境中运行
psd_router = None
psd_resize_router = None
try:
    from routers import psd_router, psd_resize_router
    print('Successfully imported PSD routers')
except ImportError as e:
    print(f'Skipping PSD routers import due to missing dependencies: {e}')

print('Importing websocket_state')
from services.websocket_state import sio
print('Importing websocket_service')
from services.websocket_service import broadcast_init_done
print('Importing config_service')
from services.config_service import config_service
print('Importing tool_service')
from services.tool_service import tool_service

async def initialize():
    print('Initializing config_service')
    await config_service.initialize()
    print('Initializing broadcast_init_done')
    await broadcast_init_done()

root_dir = os.path.dirname(__file__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # onstartup
    # TODO: Check if there will be racing conditions when user send chat request but tools and models are not initialized yet.
    await initialize()
    await tool_service.initialize()
    yield
    # onshutdown

print('Creating FastAPI app')
app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005", "http://127.0.0.1:3005", "http://localhost:3004", "http://127.0.0.1:3004"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
print('Including routers')
app.include_router(config_router.router)
app.include_router(settings.router)
app.include_router(root_router.router)
app.include_router(canvas.router)
app.include_router(workspace.router)
app.include_router(image_router.router)

# 只有当PSD路由器成功导入时才包含它们
if psd_router:
    app.include_router(psd_router.router)
if psd_resize_router:
    app.include_router(psd_resize_router.router)

app.include_router(layer_arrangement_router.router)
app.include_router(ssl_test.router)
app.include_router(chat_router.router)
app.include_router(tool_confirmation.router)

# Mount the React build directory
react_build_dir = os.environ.get('UI_DIST_DIR', os.path.join(
    os.path.dirname(root_dir), "react", "dist"))

# Mount the React public directory for static files
react_public_dir = os.path.join(os.path.dirname(root_dir), "react", "public")
psd_dir = os.path.join(react_public_dir, "psd")

# 挂载PSD目录
if os.path.exists(psd_dir):
    app.mount("/psd", StaticFiles(directory=psd_dir), name="psd")

# 挂载assets目录 - 优先使用构建目录，如果不存在则使用public目录
assets_dir = None
static_site = os.path.join(react_build_dir, "assets")
public_assets_dir = os.path.join(react_public_dir, "assets")

if os.path.exists(static_site):
    assets_dir = static_site
elif os.path.exists(public_assets_dir):
    assets_dir = public_assets_dir

if assets_dir:
    # 无缓存静态文件类
    class NoCacheStaticFiles(StaticFiles):
        async def get_response(self, path: str, scope: Scope) -> Response:
            response = await super().get_response(path, scope)
            if response.status_code == 200:
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
            return response

    app.mount("/assets", NoCacheStaticFiles(directory=assets_dir), name="assets")


@app.get("/")
async def serve_react_app():
    # 优先使用构建目录的index.html，如果不存在则使用public目录的index.html
    index_file = None
    build_index = os.path.join(react_build_dir, "index.html")
    public_index = os.path.join(react_public_dir, "index.html")
    
    if os.path.exists(build_index):
        index_file = build_index
    elif os.path.exists(public_index):
        index_file = public_index
    
    if index_file:
        response = FileResponse(index_file)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    else:
        return {"message": "Frontend not found"}

print('Creating socketio app')
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='/socket.io')

if __name__ == "__main__":
    # bypass localhost request for proxy, fix ollama proxy issue
    _bypass = {"127.0.0.1", "localhost", "::1"}
    current = set(os.environ.get("no_proxy", "").split(",")) | set(
        os.environ.get("NO_PROXY", "").split(","))
    os.environ["no_proxy"] = os.environ["NO_PROXY"] = ",".join(
        sorted(_bypass | current - {""}))

    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=57988,
                        help='Port to run the server on')
    args = parser.parse_args()
    import uvicorn
    print("🌟Starting server, UI_DIST_DIR:", os.environ.get('UI_DIST_DIR'))

    uvicorn.run(socket_app, host="127.0.0.1", port=args.port)