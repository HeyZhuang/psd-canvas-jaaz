#!/usr/bin/env python3
"""
验证 API Key 和项目关联
"""

import sys
import os
sys.path.insert(0, 'server')

def verify_api_key():
    """验证 API key 信息"""
    print("=" * 60)
    print("🔑 验证 API Key 信息")
    print("=" * 60)
    
    # 读取 API key
    api_key = None
    with open('config.env', 'r') as f:
        for line in f:
            if 'GEMINI_API_KEY=' in line and not line.startswith('#'):
                api_key = line.split('=')[1].strip()
                break
    
    if not api_key:
        print("❌ 未找到 API Key")
        return False
    
    print(f"\n✅ API Key: {api_key}")
    print(f"   长度: {len(api_key)} 字符")
    print(f"   格式: {'正确 (以 AIza 开头)' if api_key.startswith('AIza') else '❌ 格式可能不正确'}")
    
    # 尝试使用 API key 获取项目信息
    print("\n" + "=" * 60)
    print("🔍 检查 API Key 关联的项目")
    print("=" * 60)
    
    try:
        import requests
        
        # 尝试列出可用的模型（这会使用 API key）
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        
        print(f"\n📡 发送请求到: {url[:80]}...")
        response = requests.get(url, timeout=10)
        
        print(f"📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ API Key 有效且可以访问 API")
            data = response.json()
            
            if 'models' in data:
                print(f"\n📋 可用的模型数量: {len(data['models'])}")
                print("\n可用模型列表:")
                for model in data['models'][:5]:  # 只显示前5个
                    model_name = model.get('name', 'Unknown')
                    print(f"  • {model_name}")
                
                # 检查是否有 gemini-2.5-pro
                model_names = [m.get('name', '') for m in data['models']]
                
                if any('gemini-2.5-pro' in name for name in model_names):
                    print("\n✅ 找到 gemini-2.5-pro 模型")
                else:
                    print("\n⚠️  未找到 gemini-2.5-pro 模型")
                    print("   可用的 Gemini 模型:")
                    gemini_models = [n for n in model_names if 'gemini' in n.lower()]
                    for name in gemini_models[:5]:
                        print(f"     • {name}")
                        
        elif response.status_code == 403:
            print("❌ API Key 无效或权限不足")
            print(f"   响应: {response.text[:200]}")
        elif response.status_code == 429:
            print("⚠️  配额已用尽（但 API Key 是有效的）")
            print(f"   响应: {response.text[:200]}")
        else:
            print(f"⚠️  未预期的响应: {response.status_code}")
            print(f"   响应: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 检查使用的模型名称
    print("\n" + "=" * 60)
    print("🤖 检查代码中使用的模型")
    print("=" * 60)
    
    from services.gemini_psd_resize_service import GeminiPSDResizeService
    import logging
    logging.basicConfig(level=logging.WARNING)
    
    try:
        service = GeminiPSDResizeService()
        print(f"\n当前使用的模型: {service.model_name}")
        print(f"使用的 SDK: {'新版 (google-genai)' if service.use_new_sdk else '旧版 (google-generativeai)'}")
    except Exception as e:
        print(f"❌ 初始化服务失败: {e}")
    
    return True

def check_project_association():
    """检查项目关联信息"""
    print("\n" + "=" * 60)
    print("📊 项目关联说明")
    print("=" * 60)
    
    print("""
API Key 和项目的关系：

1. 🔑 每个 API Key 都关联到一个 Google Cloud 项目
2. 📊 使用数据会显示在该项目的 Usage & Billing 页面
3. ⏰ 配额限制也是基于项目级别的

可能的情况：

A. 数据同步延迟 ⏰
   - Google AI Studio 的使用数据不是实时的
   - 可能需要 15-60 分钟才能显示
   - 建议：等待一段时间后刷新页面

B. 查看错误的项目 📋
   - 您的 API Key 可能关联到不同的项目
   - 当前显示的项目是: pi3resize
   - 建议：检查是否有其他项目

C. 时间范围选择问题 📅
   - 当前选择的是 "28 Days"
   - 如果刚刚开始使用，尝试选择 "Last 7 Days" 或 "Last 24 Hours"

D. 配额错误来自其他来源 🔄
   - 429 错误可能来自全局限制，而不是项目限制
   - 这种情况下不会显示在项目使用数据中

如何验证：

1. 访问所有项目列表
   https://console.cloud.google.com/projectselector2/home/dashboard

2. 检查每个项目的 API 使用情况
   在项目中进入: APIs & Services → Dashboard

3. 查看 Generative Language API 的使用情况
   APIs & Services → Generative Language API → Metrics
    """)

def provide_next_steps():
    """提供下一步操作建议"""
    print("\n" + "=" * 60)
    print("🎯 下一步操作建议")
    print("=" * 60)
    
    print("""
基于当前情况，建议按以下顺序尝试：

1. ⏰ 等待数据同步（最可能）
   操作：等待 30-60 分钟，然后刷新 Google AI Studio 页面
   原因：使用数据可能有延迟

2. 🔍 检查其他项目
   操作：访问 https://console.cloud.google.com/projectselector2
   原因：API Key 可能关联到其他项目

3. 📅 更改时间范围
   操作：在 Google AI Studio 中选择 "Last 24 Hours"
   原因：如果刚开始使用，数据可能在较短的时间范围内

4. 🔑 验证 API Key 来源
   操作：在 Google AI Studio → API keys 中查看此 Key 的项目
   原因：确认 Key 属于哪个项目

5. 🧪 使用正确的模型
   操作：确认代码中使用的模型名称是否正确
   当前使用：gemini-2.5-pro
   
6. 💳 检查计费状态
   操作：访问 Google Cloud Console → Billing
   原因：某些情况下需要启用计费才能显示详细使用数据

测试命令：
  python3 verify_api_key.py
  python3 检查配额状态.py
  python3 test_gemini_connection.py
    """)

if __name__ == "__main__":
    print("\n🔍 API Key 验证工具\n")
    
    if verify_api_key():
        check_project_association()
        provide_next_steps()
        
        print("\n" + "=" * 60)
        print("✅ 验证完成")
        print("=" * 60)
    else:
        print("\n❌ 验证失败")
        sys.exit(1)

