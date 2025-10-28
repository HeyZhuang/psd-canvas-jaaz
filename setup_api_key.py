#!/usr/bin/env python3
"""
API密钥快速设置脚本
"""

import os
import sys

def setup_api_key():
    """交互式设置API密钥"""
    print("🔑 Gemini API密钥设置工具")
    print("=" * 40)
    
    # 检查是否已有API密钥
    config_path = "config.env"
    existing_key = None
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
                        existing_key = line.split('=', 1)[1].strip()
                        break
        except Exception as e:
            print(f"⚠️ 读取配置文件失败: {e}")
    
    if existing_key and existing_key != "":
        print(f"✅ 检测到现有API密钥: {existing_key[:10]}...")
        choice = input("是否要更新API密钥? (y/N): ").strip().lower()
        if choice != 'y':
            print("✅ 保持现有配置")
            return True
    
    print("\n📋 请按以下步骤获取API密钥:")
    print("1. 访问 https://aistudio.google.com/")
    print("2. 登录您的Google账户")
    print("3. 点击 'Get API Key' 按钮")
    print("4. 创建新的API密钥")
    print("5. 复制密钥")
    
    print("\n" + "=" * 40)
    api_key = input("请输入您的Gemini API密钥: ").strip()
    
    if not api_key:
        print("❌ 未输入API密钥")
        return False
    
    if api_key == "AIzaSyBi***************":
        print("❌ 请使用实际的API密钥，而不是占位符")
        return False
    
    # 更新配置文件
    try:
        # 读取现有配置
        config_lines = []
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config_lines = f.readlines()
        
        # 更新或添加API密钥
        updated = False
        for i, line in enumerate(config_lines):
            if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
                config_lines[i] = f"GEMINI_API_KEY={api_key}\n"
                updated = True
                break
        
        if not updated:
            config_lines.append(f"GEMINI_API_KEY={api_key}\n")
        
        # 写入配置文件
        with open(config_path, 'w', encoding='utf-8') as f:
            f.writelines(config_lines)
        
        print(f"✅ API密钥已保存到 {config_path}")
        print(f"🔑 密钥: {api_key[:10]}...")
        
        # 测试配置
        print("\n🧪 测试配置...")
        try:
            sys.path.append(os.path.join(os.path.dirname(__file__), 'server'))
            from services.gemini_psd_resize_service import GeminiPSDResizeService
            
            service = GeminiPSDResizeService()
            print("✅ 配置测试成功!")
            print(f"🤖 使用模型: {service.model}")
            
        except Exception as e:
            print(f"⚠️ 配置测试失败: {e}")
            print("💡 请检查API密钥是否正确")
        
        return True
        
    except Exception as e:
        print(f"❌ 保存配置失败: {e}")
        return False

if __name__ == "__main__":
    success = setup_api_key()
    if success:
        print("\n🎉 设置完成! 现在可以使用PSD智能缩放功能了。")
        print("📖 详细使用说明请查看 API_KEY_SETUP.md 文件")
    else:
        print("\n❌ 设置失败，请重试")
