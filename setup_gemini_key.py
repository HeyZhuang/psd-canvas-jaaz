#!/usr/bin/env python3
"""
Gemini API密钥快速配置工具
"""

import os
from pathlib import Path

def setup_api_key():
    """配置API密钥"""
    print("=" * 60)
    print("Gemini API密钥配置工具")
    print("=" * 60)
    print()
    
    # 检查config.env文件
    config_path = Path(__file__).parent / "config.env"
    
    if config_path.exists():
        print(f"✅ 找到配置文件: {config_path}")
        
        # 读取现有内容
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否已配置
        if 'GEMINI_API_KEY=YOUR_GEMINI_API_KEY' in content or 'GEMINI_API_KEY=' not in content:
            print("\n⚠️  API密钥尚未配置")
        else:
            lines = content.split('\n')
            for line in lines:
                if line.strip().startswith('GEMINI_API_KEY=') and not line.strip().startswith('#'):
                    key_value = line.split('=', 1)[1].strip()
                    if key_value and key_value != "YOUR_GEMINI_API_KEY":
                        print(f"\n✅ API密钥已配置 (长度: {len(key_value)})")
                        print(f"   密钥前缀: {key_value[:20]}...")
                        
                        response = input("\n是否要更新密钥？(y/N): ").strip().lower()
                        if response != 'y':
                            print("\n保持现有配置。")
                            return
    else:
        print(f"⚠️  配置文件不存在: {config_path}")
        print("   将创建新的配置文件")
    
    print("\n" + "=" * 60)
    print("获取API密钥步骤:")
    print("=" * 60)
    print("1. 访问: https://aistudio.google.com/")
    print("2. 登录您的Google账户")
    print("3. 点击 'Get API Key' 按钮")
    print("4. 创建新的API密钥")
    print("5. 复制生成的密钥")
    print("=" * 60)
    print()
    
    # 获取用户输入
    api_key = input("请粘贴您的Gemini API密钥（或按Enter跳过）: ").strip()
    
    if not api_key:
        print("\n⚠️  未输入API密钥，配置取消。")
        print("   您可以稍后手动编辑 config.env 文件。")
        return
    
    # 验证密钥格式（Gemini密钥通常以AIza开头）
    if not api_key.startswith('AIza'):
        print("\n⚠️  警告: API密钥格式可能不正确")
        print("   Gemini API密钥通常以 'AIza' 开头")
        response = input("   是否仍要继续？(y/N): ").strip().lower()
        if response != 'y':
            print("\n配置取消。")
            return
    
    # 写入配置文件
    config_content = f"""# Gemini API配置文件
# 此文件已添加到.gitignore，不会被提交到版本控制

# Gemini API密钥 (从 https://aistudio.google.com/ 获取)
GEMINI_API_KEY={api_key}

# 使用说明:
# 1. 此密钥用于调用Gemini 2.5 Pro模型
# 2. 请妥善保管，不要分享给他人
# 3. 如果密钥泄露，请立即在Google AI Studio中重新生成
"""
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        print("\n✅ 配置成功！")
        print(f"   配置文件: {config_path}")
        print(f"   密钥长度: {len(api_key)}")
        print(f"   密钥前缀: {api_key[:20]}...")
        
        # 同时设置环境变量
        os.environ["GEMINI_API_KEY"] = api_key
        print("\n✅ 已设置当前会话的环境变量")
        
        # 测试配置
        print("\n" + "=" * 60)
        response = input("是否要立即测试配置？(Y/n): ").strip().lower()
        
        if response != 'n':
            print("\n正在运行测试...")
            import subprocess
            result = subprocess.run(
                ["python", "test_gemini_api.py"],
                cwd=Path(__file__).parent,
                capture_output=False
            )
            
            if result.returncode == 0:
                print("\n🎉 测试成功！您现在可以使用PSD智能缩放功能了。")
            else:
                print("\n⚠️  测试未完全通过，请检查错误信息。")
        
    except Exception as e:
        print(f"\n❌ 写入配置文件失败: {e}")
        return
    
    print("\n" + "=" * 60)
    print("后续步骤:")
    print("=" * 60)
    print("1. 启动后端服务: cd server && python main.py")
    print("2. 启动前端服务: cd react && npm run dev")
    print("3. 在浏览器中使用'智能缩放'功能")
    print("=" * 60)


if __name__ == "__main__":
    try:
        setup_api_key()
    except KeyboardInterrupt:
        print("\n\n配置已取消。")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
