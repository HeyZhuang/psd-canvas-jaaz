#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🧹 Jaaz 磁盘空间清理工具                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 显示当前磁盘使用情况
echo "📊 当前磁盘使用情况："
df -h | grep "/dev/root"
echo ""

# 询问用户确认
read -p "是否继续清理？(y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消清理"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🧹 开始清理..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 清理APT缓存
echo "1️⃣  清理APT缓存..."
sudo apt-get clean > /dev/null 2>&1
echo "  ✅ APT缓存已清理"

# 2. 清理旧日志（保留7天）
echo "2️⃣  清理系统日志（保留7天）..."
sudo journalctl --vacuum-time=7d > /dev/null 2>&1
echo "  ✅ 系统日志已清理"

# 3. 清理npm缓存
echo "3️⃣  清理npm缓存..."
npm cache clean --force > /dev/null 2>&1
echo "  ✅ npm缓存已清理"

# 4. 清理Python缓存
echo "4️⃣  清理Python缓存..."
find /home/ubuntu -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find /home/ubuntu -type f -name "*.pyc" -delete 2>/dev/null
echo "  ✅ Python缓存已清理"

# 5. 清理旧PSD文件（保留最新5个）
echo "5️⃣  清理旧PSD文件（保留最新5个）..."
PSD_DIR="/home/ubuntu/jaaz/server/user_data/files/psd"
if [ -d "$PSD_DIR" ]; then
    cd "$PSD_DIR"
    # 获取当前PSD文件数量
    PSD_COUNT=$(ls -1 *.psd 2>/dev/null | wc -l)
    
    if [ "$PSD_COUNT" -gt 5 ]; then
        # 删除旧文件
        OLD_FILES=$(ls -t *.psd 2>/dev/null | tail -n +6)
        for f in $OLD_FILES; do
            file_id="${f%.psd}"
            # 删除PSD文件及其相关文件
            rm -f "${file_id}"*
            echo "    删除: $f 及其相关文件"
        done
        echo "  ✅ 旧PSD文件已清理 (删除 $((PSD_COUNT - 5)) 个)"
    else
        echo "  ✅ PSD文件数量在限制内 (${PSD_COUNT}/5)"
    fi
fi

# 6. 清理临时文件
echo "6️⃣  清理临时文件..."
rm -rf /tmp/* 2>/dev/null
sudo rm -rf /var/tmp/* 2>/dev/null
echo "  ✅ 临时文件已清理"

# 7. 清理Docker（如果安装了）
if command -v docker &> /dev/null; then
    echo "7️⃣  清理Docker..."
    docker system prune -af > /dev/null 2>&1
    echo "  ✅ Docker已清理"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 清理完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示清理后的磁盘使用情况
echo "📊 清理后的磁盘使用情况："
df -h | grep "/dev/root"
echo ""

echo "💡 提示："
echo "  • 如需清理更多空间，可手动删除不需要的项目目录"
echo "  • 主要占用空间的目录："
echo "    - /home/ubuntu/miniconda3 (17GB)"
echo "    - /home/ubuntu/ckz (9.2GB)"
echo "    - /home/ubuntu/zza (7.9GB)"
echo ""



