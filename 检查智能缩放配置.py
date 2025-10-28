#!/usr/bin/env python3
"""
智能缩放功能诊断脚本
"""

import os
import sys
import requests

def check_backend_server():
    """检查后端服务器"""
    print("🔍 1. 检查后端服务器...")
    try:
        response = requests.get("http://127.0.0.1:57988/api/psd/resize/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ 后端服务器运行正常")
            return True
        else:
            print(f"   ❌ 后端服务器返回错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 无法连接到后端服务器: {e}")
        return False

def check_frontend_proxy():
    """检查前端代理"""
    print("\n🔍 2. 检查前端代理...")
    try:
        response = requests.get("http://localhost:3004/api/psd/resize/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ 前端代理配置正确")
            return True
        else:
            print(f"   ❌ 前端代理返回错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 前端代理连接失败: {e}")
        print("   💡 提示：请确保前端开发服务器已启动 (npm run dev)")
        return False

def check_gemini_api_key():
    """检查 Gemini API 密钥"""
    print("\n🔍 3. 检查 Gemini API 密钥...")
    
    # 检查环境变量
    api_key_env = os.environ.get("GEMINI_API_KEY")
    if api_key_env and api_key_env not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
        print(f"   ✅ 环境变量中找到 API 密钥: {api_key_env[:10]}...")
        return api_key_env
    
    # 检查 config.env 文件
    config_path = os.path.join(os.path.dirname(__file__), "config.env")
    if os.path.exists(config_path):
        print(f"   📁 找到配置文件: {config_path}")
        with open(config_path, 'r') as f:
            for line in f:
                if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
                    api_key = line.split('=', 1)[1].strip()
                    if api_key and api_key not in ["", "YOUR_GEMINI_API_KEY", "your_api_key_here"]:
                        print(f"   ✅ 配置文件中找到 API 密钥: {api_key[:10]}...")
                        return api_key
    
    print("   ❌ 未找到有效的 Gemini API 密钥")
    print("   💡 解决方案：")
    print("      1. 在浏览器中访问: https://aistudio.google.com/apikey")
    print("      2. 创建或获取您的 API 密钥")
    print("      3. 将密钥添加到 config.env 文件:")
    print("         echo 'GEMINI_API_KEY=您的密钥' > config.env")
    print("      或在智能缩放对话框中直接输入 API 密钥")
    return None

def check_psd_files():
    """检查 PSD 文件"""
    print("\n🔍 4. 检查 PSD 文件...")
    psd_dir = "/home/ubuntu/ckz/psd-canvas-jaaz/server/user_data/files/psd"
    if os.path.exists(psd_dir):
        files = [f for f in os.listdir(psd_dir) if f.endswith('.psd')]
        if files:
            print(f"   ✅ 找到 {len(files)} 个 PSD 文件")
            print(f"   📁 最新文件: {sorted(files, key=lambda x: os.path.getmtime(os.path.join(psd_dir, x)))[-1]}")
            return True
        else:
            print("   ⚠️  PSD 目录为空")
            return False
    else:
        print(f"   ❌ PSD 目录不存在: {psd_dir}")
        return False

def test_resize_api():
    """测试 resize API"""
    print("\n🔍 5. 测试智能缩放 API...")
    
    # 找到一个 PSD 文件
    psd_dir = "/home/ubuntu/ckz/psd-canvas-jaaz/server/user_data/files/psd"
    if os.path.exists(psd_dir):
        files = [f for f in os.listdir(psd_dir) if f.endswith('.psd')]
        if files:
            # 使用最新的文件
            latest_file = sorted(files, key=lambda x: os.path.getmtime(os.path.join(psd_dir, x)))[-1]
            file_id = latest_file.replace('.psd', '')
            print(f"   📄 使用文件: {file_id}")
            
            # 注意：这只是测试连接，不会真正执行缩放（因为需要 API 密钥）
            try:
                response = requests.post(
                    "http://127.0.0.1:57988/api/psd/resize/resize-by-id",
                    data={
                        "file_id": file_id,
                        "target_width": 800,
                        "target_height": 600
                    },
                    timeout=10
                )
                if response.status_code == 500:
                    # 如果是 API 密钥错误，说明端点是正常的
                    if "API key" in response.text:
                        print("   ✅ API 端点正常（需要有效的 API 密钥）")
                        return True
                    else:
                        print(f"   ⚠️  API 返回错误: {response.text[:200]}")
                        return False
                elif response.status_code == 200:
                    print("   ✅ API 测试成功")
                    return True
                else:
                    print(f"   ⚠️  API 返回状态码: {response.status_code}")
                    return False
            except Exception as e:
                print(f"   ❌ API 测试失败: {e}")
                return False
        else:
            print("   ⚠️  没有 PSD 文件可供测试")
            return False
    else:
        print("   ❌ PSD 目录不存在")
        return False

def main():
    print("=" * 60)
    print("智能缩放功能诊断工具")
    print("=" * 60)
    
    results = []
    
    # 运行所有检查
    results.append(("后端服务器", check_backend_server()))
    results.append(("前端代理", check_frontend_proxy()))
    api_key = check_gemini_api_key()
    results.append(("Gemini API 密钥", api_key is not None))
    results.append(("PSD 文件", check_psd_files()))
    results.append(("Resize API", test_resize_api()))
    
    # 总结
    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{name:20s}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有检查通过！智能缩放功能应该可以正常使用。")
        print("\n如果仍然遇到问题，请：")
        print("1. 确保在智能缩放对话框中输入了有效的 Gemini API 密钥")
        print("2. 检查浏览器控制台的错误信息")
        print("3. 确认 Gemini API 配额未用尽: https://ai.dev/usage?tab=rate-limit")
    else:
        print("⚠️  发现问题，请按照上述提示解决。")
    print("=" * 60)

if __name__ == "__main__":
    main()

