#!/bin/bash

# ============ 配置区 ============
PROJECT_DIR="$HOME/ckz/psd-canvas-jaaz/server"
VENV_DIR="$PROJECT_DIR/server/venv"
REQUIREMENTS_FILE="$PROJECT_DIR/requirements.txt"
MAIN_SCRIPT="$PROJECT_DIR/server/main.py"
# ================================

# 进入项目目录
cd "$PROJECT_DIR" || { echo "错误：无法进入目录 $PROJECT_DIR"; exit 1; }

echo "当前目录: $(pwd)"

# 创建虚拟环境（如果不存在）
if [ ! -d "$VENV_DIR" ]; then
    echo "创建虚拟环境..."
    python -m venv "$VENV_DIR" || { echo "创建虚拟环境失败"; exit 1; }
else
    echo "虚拟环境已存在"
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source "$VENV_DIR/bin/activate" || { echo "激活失败"; exit 1; }

# 升级 pip
echo "升级 pip..."
pip install --upgrade pip

# 安装依赖（如果 requirements.txt 存在）
if [ -f "$REQUIREMENTS_FILE" ]; then
    echo "安装依赖: $REQUIREMENTS_FILE"
    pip install -r "$REQUIREMENTS_FILE"
else
    echo "警告：未找到 requirements.txt，跳过安装依赖"
fi

# 检查主脚本是否存在
if [ ! -f "$MAIN_SCRIPT" ]; then
    echo "错误：找不到主脚本 $MAIN_SCRIPT"
    echo "当前目录内容："
    ls -la
    deactivate
    exit 1
fi

# 启动程序
echo "启动程序：python $MAIN_SCRIPT"
python "$MAIN_SCRIPT"

# 程序结束后退出虚拟环境
deactivate
echo "程序已退出"
