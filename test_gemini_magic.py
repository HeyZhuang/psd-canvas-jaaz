#!/usr/bin/env python3
"""
测试 Gemini 魔法生成功能
"""

import sys
import os
import asyncio
import base64
from io import BytesIO
from PIL import Image

# 添加 server 目录到路径
sys.path.insert(0, 'server')

from services.gemini_magic_service import GeminiMagicService
import logging

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_magic_analysis():
    """测试魔法分析功能"""
    try:
        print("=" * 80)
        print("🧪 测试 Gemini 魔法生成功能")
        print("=" * 80)
        
        # 1. 初始化服务
        print("\n📝 步骤 1: 初始化 Gemini 魔法服务...")
        try:
            service = GeminiMagicService()
            print("✅ 服务初始化成功")
            print(f"   - 模型: {service.model_name}")
            print(f"   - SDK: {'新版 (google-genai)' if service.use_new_sdk else '旧版 (google-generativeai)'}")
        except ValueError as e:
            print(f"❌ 服务初始化失败: {e}")
            print("\n💡 请确保已配置 GEMINI_API_KEY:")
            print("   - 在 config.env 文件中添加: GEMINI_API_KEY=your_api_key_here")
            print("   - 或设置环境变量: export GEMINI_API_KEY=your_api_key_here")
            return False
        
        # 2. 创建测试图像
        print("\n📝 步骤 2: 创建测试图像...")
        
        # 创建一个简单的设计图（模拟海报）
        img = Image.new('RGB', (800, 600), color='#F0F0F0')
        
        # 添加一些彩色矩形模拟设计元素
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        # 背景
        draw.rectangle([0, 0, 800, 600], fill='#E8F4F8')
        
        # 标题区域（蓝色）
        draw.rectangle([50, 50, 750, 150], fill='#2196F3')
        
        # 内容区域（白色）
        draw.rectangle([50, 180, 750, 450], fill='#FFFFFF')
        
        # 按钮（绿色）
        draw.rectangle([300, 480, 500, 540], fill='#4CAF50')
        
        # 装饰元素（橙色圆圈）
        draw.ellipse([650, 200, 730, 280], fill='#FF9800')
        
        # 转换为 base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        print(f"✅ 测试图像创建成功 (尺寸: 800x600)")
        
        # 3. 调用魔法分析
        print("\n📝 步骤 3: 调用 Gemini API 进行魔法分析...")
        print("⏳ 请稍候，这可能需要 10-30 秒...")
        
        result = await service.generate_magic_analysis(
            image_base64=image_base64,
            canvas_width=800,
            canvas_height=600,
            layer_info=None,
            user_request="这是一个简单的应用程序界面设计，请分析并给出改进建议"
        )
        
        # 4. 显示结果
        print("\n" + "=" * 80)
        if result.get('success'):
            print("✅ 魔法分析成功！")
            print("=" * 80)
            
            data = result.get('data', {})
            
            # 设计分析
            design_analysis = data.get('design_analysis', {})
            if design_analysis:
                print("\n📊 设计分析:")
                print(f"   - 设计类型: {design_analysis.get('design_type', 'N/A')}")
                print(f"   - 设计风格: {design_analysis.get('design_style', 'N/A')}")
                print(f"   - 主要元素: {', '.join(design_analysis.get('main_elements', []))}")
                
                color_scheme = design_analysis.get('color_scheme', {})
                if isinstance(color_scheme, dict):
                    primary = color_scheme.get('primary_colors', [])
                    if primary:
                        print(f"   - 主色调: {', '.join(primary)}")
            
            # 评估
            evaluation = data.get('evaluation', {})
            if evaluation:
                print("\n📈 设计评估:")
                
                strengths = evaluation.get('strengths', [])
                if strengths:
                    print("   ✅ 优点:")
                    for i, s in enumerate(strengths[:3], 1):
                        print(f"      {i}. {s}")
                
                weaknesses = evaluation.get('weaknesses', [])
                if weaknesses:
                    print("   ⚠️ 可改进:")
                    for i, w in enumerate(weaknesses[:3], 1):
                        print(f"      {i}. {w}")
            
            # 建议
            suggestions = data.get('magic_suggestions', [])
            if suggestions:
                print(f"\n🚀 改进建议 (共 {len(suggestions)} 条):")
                for i, suggestion in enumerate(suggestions[:3], 1):
                    print(f"   {i}. {suggestion.get('title', 'N/A')}")
                    print(f"      {suggestion.get('description', '')[:100]}...")
            
            # 图像生成提示词
            prompt = data.get('image_generation_prompt', '')
            if prompt:
                print(f"\n🎨 AI 图像生成提示词:")
                print(f"   {prompt[:150]}...")
            
            # 总结
            summary = data.get('summary', '')
            if summary:
                print(f"\n📝 总结:")
                print(f"   {summary}")
            
            print("\n" + "=" * 80)
            print("🎉 测试通过！Gemini 魔法分析功能正常工作")
            print("=" * 80)
            
            # 保存完整结果
            import json
            with open('test_magic_result.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print("\n💾 完整结果已保存到: test_magic_result.json")
            
            return True
            
        else:
            print("❌ 魔法分析失败")
            print("=" * 80)
            error = result.get('error', '未知错误')
            raw_response = result.get('raw_response', '')
            
            print(f"\n错误信息: {error}")
            if raw_response:
                print(f"\n原始响应（前 500 字符）:")
                print(raw_response[:500])
            
            return False
            
    except Exception as e:
        print(f"\n❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """主函数"""
    print("\n🔧 开始测试...")
    
    # 检查配置
    print("\n🔍 检查配置...")
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or api_key in ['', 'YOUR_GEMINI_API_KEY', 'your_api_key_here']:
        # 尝试从 config.env 读取
        config_path = 'config.env'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
    
    if not api_key or api_key in ['', 'YOUR_GEMINI_API_KEY', 'your_api_key_here']:
        print("⚠️  未检测到有效的 GEMINI_API_KEY")
        print("\n💡 请按以下步骤配置:")
        print("   1. 在项目根目录创建或编辑 config.env 文件")
        print("   2. 添加一行: GEMINI_API_KEY=your_actual_api_key_here")
        print("   3. 从 https://aistudio.google.com/ 获取 API 密钥")
        print("\n⏭️  继续测试（可能会失败）...\n")
    else:
        print(f"✅ 检测到 API Key: {api_key[:10]}...")
    
    # 运行测试
    success = await test_magic_analysis()
    
    if success:
        print("\n✨ 所有测试通过！")
        print("\n📚 使用提示:")
        print("   - 在前端画布上选择元素后按 Ctrl+B (或 ⌘+B)")
        print("   - 系统会自动调用 Gemini 分析设计")
        print("   - 您将收到详细的设计分析和改进建议")
        return 0
    else:
        print("\n❌ 测试失败，请检查配置和错误信息")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)





