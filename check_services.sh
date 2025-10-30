#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📊 Jaaz 服务状态检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查后端
echo "🔍 检查后端服务..."
BACKEND_PID=$(pgrep -f "python.*main.py")
if [ -n "$BACKEND_PID" ]; then
    echo "✅ 后端运行中 (PID: $BACKEND_PID)"
    netstat -tlnp 2>/dev/null | grep 58000 | head -1
else
    echo "❌ 后端未运行"
fi
echo ""

# 检查前端
echo "🔍 检查前端服务..."
FRONTEND_PID=$(pgrep -f "jaaz/react.*vite")
if [ -n "$FRONTEND_PID" ]; then
    echo "✅ 前端运行中 (PID: $FRONTEND_PID)"
    netstat -tlnp 2>/dev/null | grep 3100 | head -1
else
    echo "❌ 前端未运行"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🎯 访问地址"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   前端: http://localhost:3100/canvas/default"
echo "   后端: http://localhost:58000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

