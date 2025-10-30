#!/bin/bash

echo "=========================================="
echo "  智能縮放功能連接測試"
echo "=========================================="
echo ""

# 檢測服務狀態
echo "1. 檢查服務狀態..."
echo "---"

# 檢查後端
BACKEND_PID=$(ps aux | grep "python.*main.py" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    echo "✅ 後端運行中 (PID: $BACKEND_PID)"
    
    # 檢查後端端口
    if lsof -i :58000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 後端監聽端口: 58000"
    else
        echo "❌ 後端未監聽 58000 端口"
    fi
else
    echo "❌ 後端未運行"
fi

# 檢查前端
FRONTEND_PID=$(pgrep -f "jaaz/react.*vite")
if [ -n "$FRONTEND_PID" ]; then
    echo "✅ 前端運行中 (PID: $FRONTEND_PID)"
    
    # 檢查前端端口
    if lsof -i :3100 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 前端監聽端口: 3100"
    else
        echo "❌ 前端未監聽 3100 端口"
    fi
else
    echo "❌ 前端未運行"
fi

echo ""
echo "2. 測試API連接..."
echo "---"

# 測試後端直接訪問
echo -n "後端直接訪問 (58000): "
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:58000/api/config 2>/dev/null)
if [ "$BACKEND_CODE" = "200" ]; then
    echo "✅ 成功 ($BACKEND_CODE)"
else
    echo "❌ 失敗 ($BACKEND_CODE)"
fi

# 測試前端頁面訪問
echo -n "前端頁面訪問 (3100): "
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/ 2>/dev/null)
if [ "$FRONTEND_CODE" = "200" ]; then
    echo "✅ 成功 ($FRONTEND_CODE)"
else
    echo "❌ 失敗 ($FRONTEND_CODE)"
fi

# 測試前端API代理
echo -n "前端API代理 (3100->58000): "
PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/api/config 2>/dev/null)
if [ "$PROXY_CODE" = "200" ]; then
    echo "✅ 成功 ($PROXY_CODE)"
else
    echo "❌ 失敗 ($PROXY_CODE)"
fi

echo ""
echo "3. 測試PSD縮放API端點..."
echo "---"

# 測試標準縮放端點（OPTIONS請求）
echo -n "標準縮放端點: "
STD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://127.0.0.1:58000/api/psd/resize/resize-by-id 2>/dev/null)
if [ "$STD_CODE" = "200" ] || [ "$STD_CODE" = "405" ]; then
    echo "✅ 端點存在 ($STD_CODE)"
else
    echo "❌ 端點不存在 ($STD_CODE)"
fi

# 測試分層縮放端點（OPTIONS請求）
echo -n "分層縮放端點: "
LAYER_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://127.0.0.1:58000/api/psd/resize/resize-by-id-layered 2>/dev/null)
if [ "$LAYER_CODE" = "200" ] || [ "$LAYER_CODE" = "405" ]; then
    echo "✅ 端點存在 ($LAYER_CODE)"
else
    echo "❌ 端點不存在 ($LAYER_CODE)"
fi

# 通過前端代理測試
echo -n "前端代理訪問縮放端點: "
PROXY_PSD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://127.0.0.1:3100/api/psd/resize/resize-by-id 2>/dev/null)
if [ "$PROXY_PSD_CODE" = "200" ] || [ "$PROXY_PSD_CODE" = "405" ]; then
    echo "✅ 可訪問 ($PROXY_PSD_CODE)"
else
    echo "❌ 不可訪問 ($PROXY_PSD_CODE)"
fi

echo ""
echo "4. 檢查Gemini API密鑰..."
echo "---"

if [ -f "/home/ubuntu/jaaz/config.env" ]; then
    if grep -q "GEMINI_API_KEY=" /home/ubuntu/jaaz/config.env; then
        KEY=$(grep "GEMINI_API_KEY=" /home/ubuntu/jaaz/config.env | cut -d'=' -f2)
        if [ -n "$KEY" ] && [ "$KEY" != "" ]; then
            echo "✅ Gemini API密鑰已配置"
        else
            echo "⚠️  Gemini API密鑰為空"
        fi
    else
        echo "❌ config.env中未找到GEMINI_API_KEY"
    fi
else
    echo "❌ config.env文件不存在"
fi

echo ""
echo "=========================================="
echo "  診斷完成"
echo "=========================================="
echo ""

# 總結
echo "📋 診斷總結："
echo ""

ALL_OK=true

if [ -z "$BACKEND_PID" ] || [ "$BACKEND_CODE" != "200" ]; then
    echo "❌ 後端服務問題："
    echo "   • 運行: cd /home/ubuntu/jaaz && ./restart_backend.sh"
    ALL_OK=false
fi

if [ -z "$FRONTEND_PID" ] || [ "$FRONTEND_CODE" != "200" ]; then
    echo "❌ 前端服務問題："
    echo "   • 運行: cd /home/ubuntu/jaaz && ./restart_frontend.sh"
    ALL_OK=false
fi

if [ "$PROXY_CODE" != "200" ]; then
    echo "❌ API代理問題："
    echo "   • 重啟前端: cd /home/ubuntu/jaaz && ./restart_frontend.sh"
    echo "   • 檢查vite.config.ts中的代理配置"
    ALL_OK=false
fi

if [ "$LAYER_CODE" != "200" ] && [ "$LAYER_CODE" != "405" ]; then
    echo "❌ PSD縮放API端點問題："
    echo "   • 檢查後端日誌: tail -50 /home/ubuntu/jaaz/server/backend.log"
    echo "   • 重啟後端: cd /home/ubuntu/jaaz && ./restart_backend.sh"
    ALL_OK=false
fi

if $ALL_OK; then
    echo "✅ 所有檢查通過！智能縮放功能應該可以正常使用。"
    echo ""
    echo "📝 使用步驟："
    echo "   1. 訪問: http://localhost:3100/canvas/default"
    echo "   2. 上傳PSD文件"
    echo "   3. 點擊「智能縮放」按鈕"
    echo "   4. 選擇縮放模式和輸出模式"
    echo "   5. 如果需要，輸入Gemini API密鑰"
    echo "   6. 點擊「開始智能縮放」"
fi

echo ""




