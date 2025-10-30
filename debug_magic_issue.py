#!/usr/bin/env python3
"""
魔法生成功能调试工具
检查所有可能导致"没有反应"的问题
"""

import sys
import os

sys.path.insert(0, 'server')

print("=" * 80)
print("🔍 魔法生成功能诊断工具")
print("=" * 80)

# 1. 检查导入
print("\n📦 步骤 1: 检查模块导入...")
try:
    from services.OpenAIAgents_service import create_jaaz_response
    print("✅ services.OpenAIAgents_service.create_jaaz_response")
except Exception as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)

try:
    from services.gemini_magic_service import GeminiMagicService
    print("✅ services.gemini_magic_service.GeminiMagicService")
except Exception as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)

try:
    from services.magic_service import handle_magic
    print("✅ services.magic_service.handle_magic")
except Exception as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)

# 2. 检查 Gemini API 配置
print("\n🔑 步骤 2: 检查 Gemini API 配置...")
try:
    service = GeminiMagicService()
    api_key = service.api_key
    if api_key and api_key not in ['', 'YOUR_GEMINI_API_KEY', 'your_api_key_here']:
        print(f"✅ Gemini API Key: {api_key[:10]}...")
        print(f"✅ 模型: {service.model_name}")
        print(f"✅ SDK: {'新版 (google-genai)' if service.use_new_sdk else '旧版 (google-generativeai)'}")
    else:
        print("❌ Gemini API Key 未配置或无效")
        print("\n💡 解决方案:")
        print("   1. 编辑 config.env 文件")
        print("   2. 设置: GEMINI_API_KEY=your_actual_api_key_here")
except Exception as e:
    print(f"❌ Gemini 服务初始化失败: {e}")
    print("\n💡 可能的原因:")
    print("   - API Key 未配置")
    print("   - google-genai 或 google-generativeai 未安装")

# 3. 检查路由注册
print("\n🛤️  步骤 3: 检查路由注册...")
try:
    from routers.chat_router import router
    routes = [route.path for route in router.routes]
    
    expected_routes = ['/api/magic', '/api/magic/cancel/{session_id}']
    for route in expected_routes:
        if any(route in r for r in routes):
            print(f"✅ 路由已注册: {route}")
        else:
            print(f"❌ 路由未找到: {route}")
except Exception as e:
    print(f"❌ 路由检查失败: {e}")

# 4. 检查数据库服务
print("\n🗄️  步骤 4: 检查数据库服务...")
try:
    from services.db_service import db_service
    print("✅ 数据库服务已导入")
except Exception as e:
    print(f"❌ 数据库服务导入失败: {e}")

# 5. 检查 WebSocket 服务
print("\n🔌 步骤 5: 检查 WebSocket 服务...")
try:
    from services.websocket_service import send_to_websocket
    print("✅ WebSocket 服务已导入")
except Exception as e:
    print(f"❌ WebSocket 服务导入失败: {e}")

# 6. 检查主应用配置
print("\n⚙️  步骤 6: 检查主应用配置...")
try:
    from main import app
    print("✅ FastAPI 应用已导入")
    
    # 检查路由是否包含在主应用中
    routes = [route.path for route in app.routes]
    if any('/api/magic' in r for r in routes):
        print("✅ /api/magic 路由已注册到主应用")
    else:
        print("❌ /api/magic 路由未在主应用中找到")
        print("\n💡 可能需要在 main.py 中包含 chat_router:")
        print("   from routers.chat_router import router as chat_router")
        print("   app.include_router(chat_router)")
except Exception as e:
    print(f"⚠️ 主应用检查: {e}")

# 7. 模拟 API 调用测试
print("\n🧪 步骤 7: 模拟 API 调用...")
import asyncio

async def test_magic_flow():
    """测试魔法生成流程"""
    try:
        # 模拟请求数据
        test_data = {
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'text',
                            'text': 'test'
                        },
                        {
                            'type': 'image_url',
                            'image_url': {
                                'url': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                            }
                        }
                    ]
                }
            ],
            'session_id': 'test-session',
            'canvas_id': 'test-canvas'
        }
        
        print("   测试数据准备完成")
        print(f"   - Messages: {len(test_data['messages'])}")
        print(f"   - Session ID: {test_data['session_id']}")
        print(f"   - Canvas ID: {test_data['canvas_id']}")
        
        # 注意：这里不实际调用 handle_magic，因为它需要数据库连接
        print("   ⏭️  跳过实际 API 调用（需要运行中的服务器）")
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_magic_flow())

# 8. 检查日志文件
print("\n📋 步骤 8: 检查日志文件...")
log_files = [
    'server/backend.log',
    'server/app.log',
]

for log_file in log_files:
    if os.path.exists(log_file):
        print(f"✅ 找到日志文件: {log_file}")
        # 读取最后几行
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                if lines:
                    print(f"   最后 3 行日志:")
                    for line in lines[-3:]:
                        print(f"   {line.rstrip()}")
        except Exception as e:
            print(f"   ⚠️ 无法读取日志: {e}")
    else:
        print(f"⚠️ 日志文件不存在: {log_file}")

# 9. 总结和建议
print("\n" + "=" * 80)
print("📊 诊断总结")
print("=" * 80)

print("\n✅ 如果所有检查都通过，但界面仍无反应，请检查:")
print("   1. 后端服务器是否正在运行")
print("   2. 前端是否正确连接到后端")
print("   3. 浏览器控制台是否有错误")
print("   4. WebSocket 连接是否建立")
print("   5. 用户是否已登录（前端会检查登录状态）")

print("\n🔧 排查步骤:")
print("   1. 启动后端: cd server && python main.py")
print("   2. 检查后端日志: tail -f server/backend.log")
print("   3. 打开浏览器开发者工具 (F12)")
print("   4. 查看 Network 标签，点击魔法生成")
print("   5. 检查是否发送了 POST /api/magic 请求")
print("   6. 查看 Console 标签，检查 JavaScript 错误")

print("\n💡 常见问题:")
print("   - 如果请求未发送: 检查前端事件总线是否正常")
print("   - 如果请求失败 (4xx/5xx): 检查后端日志")
print("   - 如果请求成功但无响应: 检查 WebSocket 连接")
print("   - 如果超时: 检查 Gemini API 配额和网络")

print("\n" + "=" * 80)
print("✨ 诊断完成")
print("=" * 80)

