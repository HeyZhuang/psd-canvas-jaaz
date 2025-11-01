# PSD智能縮放功能使用指南

## 功能概述

PSD智能縮放功能使用Gemini 2.5 Pro AI自動分析PSD文件並智能調整圖層位置和大小，實現從原始尺寸到目標尺寸的自適應縮放，保持設計的視覺平衡和專業性。

## 核心特性

### 🎯 智能縮放策略
- **等比例縮放**: 所有圖層保持原始比例，避免變形
- **邊界限制**: 確保調整後的圖層不超出目標畫布範圍
- **視覺層次**: 保持圖層間的視覺層次關係
- **內容完整性**: 確保重要內容（文字、產品、標誌）完整可見
- **重疊避免**: 智能檢測並避免元素重疊
- **美學平衡**: 保持整體設計的美觀和專業性

### 📊 圖層類型處理
- **背景圖層**: 居中裁切或等比縮放
- **文字圖層**: 最高優先級，確保完全可見和可讀性
- **產品圖像**: 保持完整性，避免裁切
- **裝飾元素**: 在保證主要內容的前提下調整
- **形狀圖層**: 保持幾何特性和比例

## 技術架構

### 後端服務
```
server/
├── services/
│   └── gemini_psd_resize_service.py    # Gemini API服務
├── routers/
│   └── psd_resize_router.py            # API路由
├── utils/
│   ├── psd_layer_info.py              # PSD圖層信息提取
│   └── resize_psd.py                   # PSD重建和渲染
└── main.py                             # 主服務器配置
```

### 前端組件
```
react/src/components/
└── PSDAutoResizeTool.tsx              # PSD縮放工具界面
```

## API接口

### 1. 自動縮放
```http
POST /api/psd/resize/auto-resize
Content-Type: multipart/form-data

參數:
- psd_file: PSD文件 (必需)
- target_width: 目標寬度 (必需)
- target_height: 目標高度 (必需)
- api_key: Gemini API密鑰 (可選)
```

### 2. 預覽縮放
```http
POST /api/psd/resize/preview-resize
Content-Type: multipart/form-data

參數:
- psd_file: PSD文件 (必需)
- target_width: 目標寬度 (必需)
- target_height: 目標高度 (必需)
- api_key: Gemini API密鑰 (可選)
```

### 3. 獲取輸出
```http
GET /api/psd/resize/output/{file_id}
```

### 4. 獲取元數據
```http
GET /api/psd/resize/metadata/{file_id}
```

## Gemini提示詞核心內容

### 任務目標
將PSD文件從原始尺寸智能縮放至目標尺寸，保持設計的視覺平衡、專業性和可讀性。

### 核心原則
1. **等比例縮放**: 所有圖層必須保持原始比例
2. **邊界限制**: 調整後的圖層不得超出目標畫布範圍
3. **視覺層次**: 保持圖層間的視覺層次關係
4. **內容完整性**: 確保所有重要內容完整可見
5. **避免重疊**: 特別注意文字與產品/圖像之間的重疊問題
6. **美學平衡**: 保持整體設計的美觀和專業性

### 輸出格式
```json
[
  {
    "id": 圖層ID,
    "name": "圖層名稱",
    "type": "圖層類型",
    "level": 圖層層級,
    "visible": true/false,
    "original_coords": {
      "left": 原始左邊界,
      "top": 原始上邊界,
      "right": 原始右邊界,
      "bottom": 原始下邊界
    },
    "new_coords": {
      "left": 新左邊界,
      "top": 新上邊界,
      "right": 新右邊界,
      "bottom": 新下邊界
    },
    "scale_factor": 縮放比例,
    "adjustment_reason": "調整原因說明",
    "quality_check": "質量檢查結果",
    "warnings": ["潛在問題警告"]
  }
]
```

## 使用步驟

### 1. 環境配置
```bash
# 安裝依賴
pip install -r server/requirements.txt

# 設置Gemini API密鑰
export GEMINI_API_KEY="your_api_key_here"
```

### 2. 啟動服務
```bash
# 啟動後端服務
cd server
python main.py

# 啟動前端服務
cd react
npm run dev
```

### 3. 使用界面
1. 打開瀏覽器訪問 `http://localhost:3004`
2. 導航到PSD縮放工具頁面
3. 上傳PSD文件
4. 設置目標尺寸
5. 選擇預覽或直接執行縮放
6. 下載結果文件

### 4. 編程使用
```python
from server.services.gemini_psd_resize_service import GeminiPSDResizeService

# 初始化服務
service = GeminiPSDResizeService(api_key="your_api_key")

# 執行縮放
new_positions = await service.resize_psd_layers(
    layers_info=layers_info,
    detection_image_path="detection.png",
    original_width=1200,
    original_height=800,
    target_width=800,
    target_height=600
)
```

## 配置選項

### Gemini API參數
- **溫度**: 0.1 (低溫度確保一致性)
- **最大輸出**: 32000 tokens
- **模型**: gemini-2.5-pro

### 圖像處理參數
- **插值方法**: LANCZOS (高質量縮放)
- **DPI**: 300 (高分辨率輸出)
- **格式**: PNG (支持透明度)

## 錯誤處理

### 常見錯誤
1. **API密鑰錯誤**: 檢查Gemini API密鑰是否有效
2. **文件格式錯誤**: 確保上傳的是PSD文件
3. **尺寸超出範圍**: 目標尺寸應在合理範圍內
4. **網絡錯誤**: 檢查網絡連接和API可用性

### 調試方法
1. 查看服務器日誌
2. 使用預覽功能檢查調整方案
3. 檢查元數據文件了解詳細信息

## 性能優化

### 建議配置
- **文件大小**: 建議PSD文件小於50MB
- **圖層數量**: 建議少於100個圖層
- **目標尺寸**: 建議在1000x1000像素以內

### 最佳實踐
1. 使用預覽功能先檢查調整方案
2. 合理設置目標尺寸比例
3. 定期清理臨時文件
4. 監控API使用量

## 擴展功能

### 未來計劃
- 批量處理多個PSD文件
- 自定義縮放策略
- 更多輸出格式支持
- 實時預覽功能

### 自定義開發
可以通過修改以下文件來擴展功能：
- `gemini_psd_resize_service.py`: 修改AI提示詞和處理邏輯
- `psd_resize_router.py`: 添加新的API端點
- `PSDAutoResizeTool.tsx`: 修改前端界面

## 技術支持

如有問題或建議，請聯繫開發團隊或查看項目文檔。

