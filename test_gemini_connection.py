#!/usr/bin/env python3
"""
简单测试 Gemini API 连接
"""

import sys
import os
import asyncio
sys.path.insert(0, 'server')

from services.gemini_psd_resize_service import GeminiPSDResizeService
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def test_simple_api_call():
    """测试简单的 API 调用"""
    try:
        print("=" * 60)
        print("🧪 测试 Gemini API 连接")
        print("=" * 60)
        
        # 初始化服务
        print("\n1️⃣ 初始化服务...")
        service = GeminiPSDResizeService()
        print("✅ 服务初始化成功")
        
        # 创建一个简单的测试图像
        print("\n2️⃣ 创建测试图像...")
        from PIL import Image
        import base64
        from io import BytesIO
        
        # 创建一个 100x100 的红色图像
        img = Image.new('RGB', (100, 100), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        print("✅ 测试图像创建成功")
        
        # 调用 API
        print("\n3️⃣ 调用 Gemini API...")
        print("⏳ 请稍候，这可能需要几秒钟...")
        
        simple_prompt = "请用一句话描述这张图片的颜色。"
        
        response = await service.call_gemini_api(
            prompt=simple_prompt,
            image_base64=image_base64,
            temperature=0.1,
            max_tokens=100
        )
        
        print("\n✅ API 调用成功！")
        print(f"📝 响应内容: {response[:200]}")
        
        print("\n" + "=" * 60)
        print("🎉 测试通过！Gemini API 工作正常")
        print("=" * 60)
        
        # 提示查看配额
        print("\n💡 提示:")
        print("  - 此次测试会在 Google AI Studio 中显示为 1 次请求")
        print("  - 访问 https://ai.dev/usage 查看使用情况")
        print("  - 如果配额页面仍显示 'No Usage Data Available'，")
        print("    可能需要等待几分钟数据同步")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        print(f"\n错误类型: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_simple_api_call())
    sys.exit(0 if result else 1)

