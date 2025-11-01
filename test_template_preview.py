#!/usr/bin/env python3
"""
模板预览图测试脚本
用于测试模板上传和预览图显示功能
"""

import requests
import os
from PIL import Image
import io

def create_test_image():
    """创建一个测试图片"""
    # 创建一个简单的测试图片
    img = Image.new('RGB', (200, 200), color='lightblue')
    
    # 添加一些文字或图案
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    
    # 尝试使用默认字体
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 90), "Test Template", fill='darkblue', font=font)
    
    # 保存到内存
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes

def test_template_upload():
    """测试模板上传功能"""
    base_url = "http://localhost:3004"
    
    # 创建测试图片
    test_image = create_test_image()
    
    # 准备上传数据
    files = {
        'thumbnail': ('test_template.png', test_image, 'image/png'),
        'preview': ('test_template.png', test_image, 'image/png')
    }
    
    data = {
        'name': '测试模板',
        'description': '这是一个测试模板',
        'category_id': 'default',  # 假设有一个默认分类
        'type': 'image',
        'template_metadata': '{}',
        'tags': '["test", "demo"]',
        'is_public': 'false'
    }
    
    try:
        # 上传模板
        response = requests.post(f"{base_url}/api/templates/items", files=files, data=data)
        
        if response.status_code == 200:
            template_data = response.json()
            print(f"✅ 模板上传成功!")
            print(f"   模板ID: {template_data['id']}")
            print(f"   缩略图URL: {template_data['thumbnail_url']}")
            print(f"   预览图URL: {template_data['preview_url']}")
            
            # 测试图片访问
            if template_data['thumbnail_url']:
                img_response = requests.get(template_data['thumbnail_url'])
                if img_response.status_code == 200:
                    print(f"✅ 缩略图访问成功!")
                else:
                    print(f"❌ 缩略图访问失败: {img_response.status_code}")
            
            if template_data['preview_url']:
                img_response = requests.get(template_data['preview_url'])
                if img_response.status_code == 200:
                    print(f"✅ 预览图访问成功!")
                else:
                    print(f"❌ 预览图访问失败: {img_response.status_code}")
            
            return template_data
        else:
            print(f"❌ 模板上传失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保服务器正在运行")
        return None
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        return None

def test_file_service():
    """测试文件服务"""
    base_url = "http://localhost:3004"
    
    # 测试一个已知的文件路径
    test_url = f"{base_url}/api/templates/uploads/thumbnails/test.png"
    
    try:
        response = requests.get(test_url)
        if response.status_code == 404:
            print("✅ 文件服务正常 (返回404是预期的，因为测试文件不存在)")
        else:
            print(f"文件服务响应: {response.status_code}")
    except Exception as e:
        print(f"❌ 文件服务测试失败: {e}")

if __name__ == "__main__":
    print("🧪 开始测试模板预览图功能...")
    print("=" * 50)
    
    # 测试文件服务
    print("1. 测试文件服务...")
    test_file_service()
    print()
    
    # 测试模板上传
    print("2. 测试模板上传...")
    template_data = test_template_upload()
    print()
    
    if template_data:
        print("🎉 模板预览图功能测试完成!")
        print("现在可以在前端界面中查看模板预览图了。")
    else:
        print("❌ 模板预览图功能测试失败!")
        print("请检查服务器是否正在运行，以及数据库连接是否正常。")


