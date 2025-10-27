# PSD文件400错误修复指南

## 🐛 问题描述

用户点击"开始智能缩放"按钮后，前端发出请求：
```
http://localhost:57988/api/psd/file/im_HRmLZeX7
```

返回**400状态码**，前端报错："下载PSD文件失败"。

## 🔍 问题分析

经过检查发现：

### ✅ 文件确实存在
```
d:\project-three\jaaz-psd-main\jaaz-psd-main\server\user_data\files\psd\im_HRmLZeX7.psd
```
文件已成功上传并保存在正确的位置。

### ⚠️ 可能的原因

1. **端口不匹配**
   - 前端请求：`localhost:57988`
   - 后端服务器可能运行在其他端口（如8000、3000等）
   
2. **路由问题**
   - API路径可能不正确
   - 需要检查完整路径是否为 `/api/psd/file/{file_id}`

3. **CORS问题**
   - 跨域请求被阻止

4. **PSD_DIR路径问题**
   - 虽然文件存在，但代码中的PSD_DIR可能指向错误的目录

## ✅ 修复方案

### 修复1: 后端路由改进（已实施）

**文件**: `server/routers/psd_router.py`

已添加了详细的错误处理和日志：

```python
@router.get("/file/{file_id}")
async def get_psd_file(file_id: str):
    """获取原始PSD文件"""
    try:
        # 首先检查PSD目录是否存在
        if not os.path.exists(PSD_DIR):
            print(f'⚠️ PSD目录不存在，正在创建: {PSD_DIR}')
            os.makedirs(PSD_DIR, exist_ok=True)
        
        file_path = os.path.join(PSD_DIR, f'{file_id}.psd')
        
        # 详细的错误信息
        if not os.path.exists(file_path):
            print(f'❌ PSD文件未找到: {file_path}')
            print(f'   当前PSD_DIR: {PSD_DIR}')
            print(f'   PSD_DIR存在: {os.path.exists(PSD_DIR)}')
            if os.path.exists(PSD_DIR):
                files = os.listdir(PSD_DIR)
                print(f'   PSD_DIR中的文件: {files[:10]}')
            raise HTTPException(
                status_code=404, 
                detail=f"PSD file not found: {file_id}.psd"
            )
        
        print(f'✅ 找到PSD文件: {file_path}')
        
        return FileResponse(
            file_path,
            media_type='application/octet-stream',
            headers={
                'Accept-Ranges': 'none',
                'Content-Disposition': f'inline; filename="{file_id}.psd"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f'❌ 获取PSD文件失败: {e}')
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving PSD file: {str(e)}"
        )
```

### 修复2: 检查后端服务器端口

**检查方法**:
```bash
# 查看服务器日志，找到实际运行的端口
# 应该会看到类似：
# INFO:     Uvicorn running on http://127.0.0.1:8000
```

**如果端口不是57988，需要修改前端请求的URL或配置代理。**

### 修复3: 前端URL修复

检查前端中PSD URL的生成逻辑。

**可能的位置**:
- `react/src/api/upload.ts` 
- PSD上传成功后返回的URL

**示例修复** (如果需要):
```typescript
// 确保URL使用正确的端口
const psdUrl = psdData.url.replace('localhost:57988', 'localhost:8000')
```

### 修复4: 配置代理（推荐）

在 `react/vite.config.ts` 中配置代理：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // 后端实际端口
        changeOrigin: true,
      }
    }
  }
})
```

## 🧪 诊断步骤

### 步骤1: 检查后端服务器状态

```bash
# 查看后端服务器日志
cd server
python main.py

# 查找输出中的端口号，例如：
# INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 步骤2: 手动测试API端点

```bash
# 使用curl测试（替换端口号）
curl -I http://localhost:8000/api/psd/file/im_HRmLZeX7

# 或在浏览器中直接访问
http://localhost:8000/api/psd/file/im_HRmLZeX7
```

**预期结果**:
- 状态码：200
- 开始下载PSD文件

**如果返回404**:
- 检查PSD_DIR路径
- 检查文件是否真的存在

**如果返回400**:
- 可能是路径格式问题
- 检查file_id是否包含特殊字符

### 步骤3: 检查前端网络请求

打开浏览器开发者工具（F12）→ Network标签：

1. 点击"开始智能缩放"
2. 查找失败的请求
3. 检查：
   - **Request URL**: 是否正确
   - **Status Code**: 具体是什么错误
   - **Response**: 错误详情

### 步骤4: 检查服务器日志

查看后端终端输出，应该会看到详细的错误信息：

```
❌ PSD文件未找到: xxxxx
   当前PSD_DIR: xxxxx
   PSD_DIR存在: True/False
   PSD_DIR中的文件: [...]
```

## 🔧 快速修复脚本

创建一个测试脚本 `test_psd_api.py`:

```python
import requests
import os

# 测试API端点
ports = [8000, 3000, 5000, 57988]  # 可能的端口
file_id = "im_HRmLZeX7"

for port in ports:
    url = f"http://localhost:{port}/api/psd/file/{file_id}"
    try:
        response = requests.get(url, timeout=2)
        print(f"Port {port}: Status {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Success! URL: {url}")
            print(f"   File size: {len(response.content)} bytes")
            break
    except requests.exceptions.ConnectionError:
        print(f"Port {port}: Connection refused")
    except requests.exceptions.Timeout:
        print(f"Port {port}: Timeout")
    except Exception as e:
        print(f"Port {port}: Error - {e}")
```

运行：
```bash
cd server
python test_psd_api.py
```

## 📊 完整流程检查

1. ✅ **PSD文件已上传**: `im_HRmLZeX7.psd` 存在
2. ⚠️ **端口号匹配**: 需要确认
3. ⚠️ **API路径正确**: 需要测试
4. ⚠️ **网络可达**: 需要验证

## 🎯 解决方案总结

### 最可能的问题：端口不匹配

**检查**:
```bash
# 查看后端实际运行端口
# 在server目录下运行main.py时的输出
```

**修复**:
```typescript
// 方法1: 修改前端URL生成逻辑
const correctPort = 8000; // 使用实际端口
const psdUrl = psdData.url.replace(/localhost:\d+/, `localhost:${correctPort}`)

// 方法2: 配置vite代理（推荐）
// 在vite.config.ts中配置proxy
```

### 次要可能：路径问题

如果PSD_DIR配置错误，虽然文件存在于实际位置，但代码可能在错误的位置查找。

**验证**:
```python
# 在server目录下运行
python -c "from services.config_service import FILES_DIR; import os; print('FILES_DIR:', FILES_DIR); print('PSD_DIR:', os.path.join(FILES_DIR, 'psd')); print('Exists:', os.path.exists(os.path.join(FILES_DIR, 'psd', 'im_HRmLZeX7.psd')))"
```

## ✨ 修复后的预期行为

正确配置后：

```
点击"开始智能缩放"
↓
前端请求: http://localhost:8000/api/psd/file/im_HRmLZeX7
↓
后端日志: ✅ 找到PSD文件: xxx/im_HRmLZeX7.psd
↓
返回: 200 OK
↓
前端: "正在准备缩放请求..." (20%)
↓
继续后续流程...
```

## 📞 如仍未解决

请提供以下信息：

1. 后端服务器启动时的完整输出（特别是端口号）
2. 浏览器Network标签中失败请求的详细信息
3. 后端服务器日志中的错误信息
4. `test_psd_api.py` 的运行结果

---

**修复日期**: 2025-10-24  
**状态**: 已添加详细错误处理和日志，等待端口确认
