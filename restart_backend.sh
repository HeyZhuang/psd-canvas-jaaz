#!/bin/bash

echo "🔄 重启后端服务..."

# 停止当前后端进程
PID=$(ps aux | grep "python.*main.py" | grep -v grep | awk '{print $2}')
if [ -n "$PID" ]; then
    echo "停止进程 $PID..."
    kill $PID
    sleep 2
    
    # 如果进程还在运行，强制终止
    if ps -p $PID > /dev/null 2>&1; then
        echo "强制终止进程..."
        kill -9 $PID
        sleep 1
    fi
    echo "✓ 后端已停止"
else
    echo "未找到运行中的后端进程"
fi

# 重新启动后端
echo ""
echo "启动后端服务..."
cd /home/ubuntu/jaaz/server

# 检查虚拟环境
if [ -d "venv" ]; then
    echo "激活虚拟环境..."
    source venv/bin/activate
fi

# 启动后端
echo "启动 main.py..."
nohup python main.py > backend.log 2>&1 &
NEW_PID=$!

sleep 3

# 检查是否启动成功
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo ""
    echo "✅ 后端启动成功！"
    echo "   进程ID: $NEW_PID"
    echo "   端口: 58000"
    echo "   日志: /home/ubuntu/jaaz/server/backend.log"
    echo ""
    echo "查看日志: tail -f /home/ubuntu/jaaz/server/backend.log"
    echo "测试API: curl http://127.0.0.1:58000/api/config"
else
    echo ""
    echo "❌ 后端启动失败"
    echo "查看日志: cat /home/ubuntu/jaaz/server/backend.log"
fi


 


