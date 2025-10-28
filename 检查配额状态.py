#!/usr/bin/env python3
"""
检查 Gemini API 配额状态
"""

import os
import sys
import time
sys.path.insert(0, 'server')

def check_config():
    """检查配置文件"""
    print("=" * 60)
    print("🔍 检查配置状态")
    print("=" * 60)
    
    # 检查 config.env
    config_path = "config.env"
    if os.path.exists(config_path):
        print(f"✅ 配置文件存在: {config_path}")
        with open(config_path, 'r') as f:
            for line in f:
                if 'GEMINI_API_KEY=' in line and not line.startswith('#'):
                    key = line.split('=')[1].strip()
                    if key and key not in ['', 'YOUR_GEMINI_API_KEY']:
                        print(f"✅ API Key 已配置: {key[:10]}...{key[-4:]}")
                    else:
                        print("❌ API Key 未配置或为空")
                        return False
    else:
        print(f"❌ 配置文件不存在: {config_path}")
        return False
    
    # 检查环境变量
    env_key = os.environ.get('GEMINI_API_KEY')
    if env_key:
        print(f"✅ 环境变量 GEMINI_API_KEY 已设置: {env_key[:10]}...")
    else:
        print("ℹ️  环境变量 GEMINI_API_KEY 未设置（使用配置文件）")
    
    return True

def check_api_status():
    """检查 API 服务状态"""
    print("\n" + "=" * 60)
    print("🌐 检查 API 服务状态")
    print("=" * 60)
    
    try:
        import requests
        url = "https://generativelanguage.googleapis.com/v1beta/models"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Gemini API 服务正常运行")
        elif response.status_code == 403:
            print("⚠️  API 服务需要认证（正常，需要 API key）")
        else:
            print(f"⚠️  API 服务响应异常: {response.status_code}")
    except Exception as e:
        print(f"❌ 无法连接到 API 服务: {e}")

def check_quota_info():
    """显示配额信息"""
    print("\n" + "=" * 60)
    print("📊 配额限制信息")
    print("=" * 60)
    
    print("""
免费版配额：
  📍 每分钟请求数（RPM）：15 次
  📍 每天请求数（RPD）：1,500 次
  📍 每分钟 Token 数（TPM）：1,000,000 tokens

付费版配额：
  📍 每分钟请求数（RPM）：1,000 次
  📍 每天请求数（RPD）：无限制
  📍 每分钟 Token 数（TPM）：4,000,000 tokens

配额重置时间：
  ⏰ 每分钟配额：每分钟的第 0 秒重置
  ⏰ 每天配额：UTC 时区凌晨 0 点重置
    """)

def provide_solutions():
    """提供解决方案"""
    print("=" * 60)
    print("💡 解决方案")
    print("=" * 60)
    
    print("""
如果遇到 429 配额错误：

1. ⏰ 等待配额恢复（最简单）
   - 每分钟配额：等待 1-2 分钟
   - 每天配额：等到明天（UTC 时间）

2. 🔑 重新生成 API Key
   访问: https://aistudio.google.com/
   
3. 💳 升级到付费计划
   访问: https://aistudio.google.com/ → Billing

4. 📊 查看配额使用情况
   访问: https://ai.dev/usage?tab=rate-limit

5. 🔍 检查项目配额
   访问: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
    """)

def main():
    """主函数"""
    print("\n🔍 Gemini API 配额状态检查工具\n")
    
    # 检查配置
    if not check_config():
        print("\n❌ 配置检查失败！请先配置 API Key")
        print("运行命令: python3 setup_api_key.py")
        return
    
    # 检查 API 服务状态
    check_api_status()
    
    # 显示配额信息
    check_quota_info()
    
    # 提供解决方案
    provide_solutions()
    
    print("\n" + "=" * 60)
    print("✅ 检查完成")
    print("=" * 60)
    
    # 提示
    print("\n💡 提示:")
    print("  - 如果您刚刚使用了 API，可能需要等待几分钟")
    print("  - Google AI Studio 的使用数据可能有延迟（15-60分钟）")
    print("  - 配额限制是实时的，即使使用数据没显示")
    print("\n📞 需要测试连接？运行: python3 test_gemini_connection.py")
    print()

if __name__ == "__main__":
    main()

