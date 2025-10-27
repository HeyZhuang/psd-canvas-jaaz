#!/usr/bin/env python3
"""
PSD API测试脚本 - 用于诊断400错误
"""

import requests
import sys

def test_psd_api():
    """测试PSD API端点"""
    print("=" * 60)
    print("PSD API端点测试")
    print("=" * 60)
    
    # 测试不同的端口
    ports = [8000, 3000, 5000, 57988, 8080]
    file_id = "im_HRmLZeX7"
    
    print(f"\n测试文件ID: {file_id}")
    print(f"测试端口: {ports}\n")
    
    for port in ports:
        url = f"http://localhost:{port}/api/psd/file/{file_id}"
        print(f"\n{'='*60}")
        print(f"测试端口: {port}")
        print(f"URL: {url}")
        print(f"{'-'*60}")
        
        try:
            response = requests.get(url, timeout=3)
            
            print(f"✅ 连接成功")
            print(f"   状态码: {response.status_code}")
            print(f"   响应头: Content-Type = {response.headers.get('Content-Type')}")
            print(f"   响应头: Content-Length = {response.headers.get('Content-Length')}")
            
            if response.status_code == 200:
                print(f"   ✅ 成功! 文件大小: {len(response.content)} bytes")
                print(f"\n🎉 找到正确的端口: {port}")
                print(f"   正确的URL: {url}")
                return port, url
            elif response.status_code == 404:
                print(f"   ❌ 404: 文件未找到")
                try:
                    print(f"   错误详情: {response.json()}")
                except:
                    print(f"   错误详情: {response.text[:200]}")
            elif response.status_code == 400:
                print(f"   ❌ 400: 请求错误")
                try:
                    print(f"   错误详情: {response.json()}")
                except:
                    print(f"   错误详情: {response.text[:200]}")
            else:
                print(f"   ⚠️  意外的状态码")
                try:
                    print(f"   错误详情: {response.json()}")
                except:
                    print(f"   响应文本: {response.text[:200]}")
                    
        except requests.exceptions.ConnectionError:
            print(f"❌ 连接被拒绝 - 服务器未在此端口运行")
        except requests.exceptions.Timeout:
            print(f"❌ 请求超时")
        except Exception as e:
            print(f"❌ 错误: {type(e).__name__}: {e}")
    
    print(f"\n{'='*60}")
    print("⚠️  未找到可用的端口")
    print("请检查：")
    print("1. 后端服务器是否正在运行")
    print("2. 查看服务器启动日志中的端口号")
    print("3. 确认防火墙没有阻止连接")
    print("=" * 60)
    return None, None


def check_file_exists():
    """检查PSD文件是否存在"""
    import os
    import sys
    
    print("\n" + "=" * 60)
    print("检查PSD文件是否存在")
    print("=" * 60)
    
    try:
        # 添加server目录到路径
        server_path = os.path.join(os.path.dirname(__file__), 'server')
        sys.path.insert(0, server_path)
        
        from services.config_service import FILES_DIR
        
        psd_dir = os.path.join(FILES_DIR, 'psd')
        file_id = "im_HRmLZeX7"
        psd_file = os.path.join(psd_dir, f'{file_id}.psd')
        
        print(f"\nFILES_DIR: {FILES_DIR}")
        print(f"PSD_DIR: {psd_dir}")
        print(f"目标文件: {psd_file}")
        
        print(f"\n检查结果:")
        print(f"  FILES_DIR exists: {os.path.exists(FILES_DIR)}")
        print(f"  PSD_DIR exists: {os.path.exists(psd_dir)}")
        print(f"  PSD file exists: {os.path.exists(psd_file)}")
        
        if os.path.exists(psd_file):
            size = os.path.getsize(psd_file)
            print(f"  ✅ 文件找到!")
            print(f"  文件大小: {size} bytes ({size/1024:.2f} KB)")
        else:
            print(f"  ❌ 文件不存在!")
            if os.path.exists(psd_dir):
                files = [f for f in os.listdir(psd_dir) if file_id in f]
                if files:
                    print(f"  但找到相关文件: {files[:5]}")
                else:
                    print(f"  未找到任何包含 '{file_id}' 的文件")
                    all_psd = [f for f in os.listdir(psd_dir) if f.endswith('.psd')]
                    print(f"  PSD_DIR中的PSD文件总数: {len(all_psd)}")
                    if all_psd:
                        print(f"  示例文件: {all_psd[:3]}")
        
        return os.path.exists(psd_file)
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("\n🔍 PSD 400错误诊断工具\n")
    
    # 1. 检查文件是否存在
    file_exists = check_file_exists()
    
    # 2. 测试API端点
    port, url = test_psd_api()
    
    # 3. 总结
    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)
    
    if file_exists:
        print("✅ PSD文件存在于服务器")
    else:
        print("❌ PSD文件不存在 - 请重新上传")
    
    if port:
        print(f"✅ API端点可访问 - 端口: {port}")
        print(f"   正确的URL: {url}")
        print("\n💡 修复建议:")
        print(f"   前端应该使用端口 {port} 而不是 57988")
        print(f"   或在vite.config.ts中配置proxy指向端口 {port}")
    else:
        print("❌ 无法访问API端点")
        print("\n💡 修复建议:")
        print("   1. 启动后端服务: cd server && python main.py")
        print("   2. 查看启动日志中的端口号")
        print("   3. 确认防火墙设置")
    
    print("=" * 60)
    
    return file_exists and port is not None


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试已取消")
        sys.exit(1)
