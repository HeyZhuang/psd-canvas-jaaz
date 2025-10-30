#!/bin/bash

echo "🔄 重启前端服务..."

# 停止现有的前端进程
echo "停止现有进程..."
pkill -f "jaaz/react.*vite" || true
sleep 2

# 进入前端目录
cd /home/ubuntu/jaaz/react || exit 1

# 启动前端服务
echo "启动前端服务..."
nohup npm run dev > /tmp/jaaz_frontend.log 2>&1 &

sleep 3

# 检查是否成功启动
if pgrep -f "jaaz/react.*vite" > /dev/null; then
    PID=$(pgrep -f "jaaz/react.*vite")
    echo "✅ 前端启动成功！"
    echo "   进程ID: $PID"
    echo "   端口: 3100"
    echo "   日志: tail -f /tmp/jaaz_frontend.log"
    echo ""
    echo "访问: http://localhost:3100/canvas/default"
else
    echo "❌ 前端启动失败"
    echo "查看日志: tail -50 /tmp/jaaz_frontend.log"
    exit 1
fi

