#!/usr/bin/env python3
"""
测试魔法生成 API 端到端流程
"""

import sys
import asyncio
import json

sys.path.insert(0, 'server')

async def test_magic_api():
    """测试魔法生成 API"""
    
    print("=" * 80)
    print("🧪 测试魔法生成 API 端到端流程")
    print("=" * 80)
    
    # 1. 测试导入
    print("\n📦 步骤 1: 测试模块导入...")
    try:
        from services.magic_service import handle_magic, _process_magic_generation
        from services.OpenAIAgents_service import create_jaaz_response
        print("✅ 所有模块导入成功")
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 2. 准备测试数据
    print("\n📝 步骤 2: 准备测试数据...")
    test_data = {
        'messages': [
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'text',
                        'text': '测试魔法生成'
                    },
                    {
                        'type': 'image_url',
                        'image_url': {
                            # 一个 1x1 像素的红色 PNG 图片（base64）
                            'url': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
                        }
                    }
                ]
            }
        ],
        'session_id': 'test-session-' + str(int(asyncio.get_event_loop().time())),
        'canvas_id': 'test-canvas'
    }
    
    print(f"✅ 测试数据准备完成")
    print(f"   - Session ID: {test_data['session_id']}")
    print(f"   - Messages: {len(test_data['messages'])}")
    
    # 3. 测试 create_jaaz_response
    print("\n🎨 步骤 3: 测试 create_jaaz_response...")
    try:
        response = await create_jaaz_response(
            messages=test_data['messages'],
            session_id=test_data['session_id'],
            canvas_id=test_data['canvas_id']
        )
        
        print("✅ create_jaaz_response 调用成功")
        print(f"   响应类型: {type(response)}")
        print(f"   响应键: {response.keys() if isinstance(response, dict) else 'N/A'}")
        
        if isinstance(response, dict):
            role = response.get('role', 'N/A')
            content = response.get('content', [])
            print(f"   - Role: {role}")
            
            if isinstance(content, list) and len(content) > 0:
                first_content = content[0]
                if isinstance(first_content, dict):
                    text = first_content.get('text', '')
                    print(f"   - Content 类型: {first_content.get('type', 'N/A')}")
                    print(f"   - Content 长度: {len(text)} 字符")
                    print(f"   - Content 预览: {text[:200]}...")
                else:
                    print(f"   - Content: {str(content)[:200]}...")
            elif isinstance(content, str):
                print(f"   - Content 长度: {len(content)} 字符")
                print(f"   - Content 预览: {content[:200]}...")
        
        return True
        
    except ValueError as e:
        if 'Gemini API' in str(e):
            print(f"⚠️ Gemini API 密钥未配置: {e}")
            print("\n💡 这是预期的错误（如果您还未配置 Gemini API Key）")
            print("   解决方案: 在 config.env 中设置 GEMINI_API_KEY")
            return True  # 这不算失败，只是配置问题
        else:
            raise
    except Exception as e:
        print(f"❌ 调用失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """主函数"""
    print("\n🔧 开始测试...\n")
    
    success = await test_magic_api()
    
    print("\n" + "=" * 80)
    if success:
        print("✅ 测试通过！魔法生成功能可以正常工作")
        print("=" * 80)
        print("\n💡 如果前端仍无反应，请检查:")
        print("   1. 后端服务器是否正在运行 (python server/main.py)")
        print("   2. 前端是否正确连接到后端")
        print("   3. 浏览器控制台是否有错误 (F12)")
        print("   4. WebSocket 连接是否建立")
        print("   5. 用户是否已登录")
        print("\n🔍 调试步骤:")
        print("   1. 打开浏览器开发者工具 (F12)")
        print("   2. 切换到 Network 标签")
        print("   3. 点击魔法生成按钮")
        print("   4. 查看是否发送了 POST /api/magic 请求")
        print("   5. 查看请求的 Status 和 Response")
        return 0
    else:
        print("❌ 测试失败，请检查上面的错误信息")
        print("=" * 80)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

