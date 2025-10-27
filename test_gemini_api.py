#!/usr/bin/env python3
"""
测试Gemini API配置和连接
"""

import os
import sys
from pathlib import Path

# 添加server目录到Python路径
server_path = Path(__file__).parent / "server"
sys.path.insert(0, str(server_path))

def test_api_key_loading():
    """测试API密钥加载"""
    print("=" * 60)
    print("测试1: API密钥加载")
    print("=" * 60)
    
    # 测试从环境变量读取
    env_key = os.environ.get("GEMINI_API_KEY")
    print(f"环境变量 GEMINI_API_KEY: {'已设置' if env_key else '未设置'}")
    
    # 测试从config.env读取
    config_path = Path(__file__).parent / "config.env"
    if config_path.exists():
        print(f"config.env文件: 存在 ({config_path})")
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('GEMINI_API_KEY=') and not line.strip().startswith('#'):
                    key_value = line.split('=', 1)[1].strip()
                    if key_value and key_value != "YOUR_GEMINI_API_KEY":
                        print(f"config.env中的密钥: 已配置 (长度: {len(key_value)})")
                        return True
                    else:
                        print(f"config.env中的密钥: 未配置或使用默认值")
                        return False
    else:
        print(f"config.env文件: 不存在")
    
    return bool(env_key)


def test_gemini_import():
    """测试Gemini库导入"""
    print("\n" + "=" * 60)
    print("测试2: Gemini库导入")
    print("=" * 60)
    
    try:
        from google import genai
        print("✅ 成功导入 google.genai")
        print(f"   模块路径: {genai.__file__}")
        
        # 检查Client是否存在
        if hasattr(genai, 'Client'):
            print("✅ genai.Client 可用 (新版SDK)")
            return "new"
        else:
            print("⚠️  genai.Client 不可用，将使用旧版API")
            return "fallback"
    except ImportError as e:
        print(f"❌ 导入 google.genai 失败: {e}")
        
        # 尝试旧版
        try:
            import google.generativeai as genai
            print("✅ 成功导入 google.generativeai (旧版)")
            print(f"   模块路径: {genai.__file__}")
            return "old"
        except ImportError as e2:
            print(f"❌ 导入 google.generativeai 也失败: {e2}")
            return None


def test_gemini_service():
    """测试Gemini服务初始化"""
    print("\n" + "=" * 60)
    print("测试3: Gemini服务初始化")
    print("=" * 60)
    
    try:
        from services.gemini_psd_resize_service import GeminiPSDResizeService
        
        service = GeminiPSDResizeService()
        print(f"✅ 服务初始化成功")
        print(f"   使用模型: {service.model_name}")
        print(f"   使用新版SDK: {service.use_new_sdk}")
        print(f"   API密钥长度: {len(service.api_key)}")
        return True
    except ValueError as e:
        print(f"❌ 服务初始化失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 服务初始化异常: {type(e).__name__}: {e}")
        return False


def test_simple_api_call():
    """测试简单的API调用"""
    print("\n" + "=" * 60)
    print("测试4: 简单API调用测试")
    print("=" * 60)
    
    try:
        from services.gemini_psd_resize_service import GeminiPSDResizeService
        from PIL import Image
        import base64
        from io import BytesIO
        import asyncio
        
        # 创建服务
        service = GeminiPSDResizeService()
        
        # 创建一个简单的测试图像
        img = Image.new('RGB', (100, 100), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        # 简单的测试提示
        prompt = "Describe this image in one sentence."
        
        print("正在调用Gemini API...")
        
        async def test_call():
            response = await service.call_gemini_api(
                prompt=prompt,
                image_base64=image_base64,
                temperature=0.1,
                max_tokens=100
            )
            return response
        
        response = asyncio.run(test_call())
        print(f"✅ API调用成功!")
        print(f"   响应内容: {response[:100]}..." if len(response) > 100 else f"   响应内容: {response}")
        return True
        
    except Exception as e:
        print(f"❌ API调用失败: {type(e).__name__}: {e}")
        import traceback
        print("\n详细错误信息:")
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("\n🔍 Gemini API配置测试工具\n")
    
    results = {
        "api_key": False,
        "import": False,
        "service": False,
        "api_call": False
    }
    
    # 测试1: API密钥
    results["api_key"] = test_api_key_loading()
    
    # 测试2: 导入
    sdk_type = test_gemini_import()
    results["import"] = sdk_type is not None
    
    # 只有前面的测试通过才继续
    if results["api_key"] and results["import"]:
        # 测试3: 服务初始化
        results["service"] = test_gemini_service()
        
        # 测试4: API调用
        if results["service"]:
            results["api_call"] = test_simple_api_call()
    
    # 输出总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{test_name.ljust(15)}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有测试通过！Gemini API配置正确。")
    else:
        print("⚠️  部分测试失败，请检查配置：")
        if not results["api_key"]:
            print("   1. 确保设置了GEMINI_API_KEY环境变量或config.env文件")
        if not results["import"]:
            print("   2. 确保安装了google-genai包：pip install google-genai")
        if not results["service"]:
            print("   3. 检查服务初始化代码")
        if not results["api_call"]:
            print("   4. 检查API密钥是否有效，网络是否正常")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
