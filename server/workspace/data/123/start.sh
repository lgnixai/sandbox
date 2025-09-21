#!/bin/bash

# 钜恒产品网站启动脚本

echo "正在启动钜恒产品网站..."

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "错误: 未找到Go，请先安装Go语言环境"
    exit 1
fi

# 检查PocketBase是否已下载
if [ ! -f "pocketbase" ]; then
    echo "正在下载PocketBase..."
    # 根据操作系统下载对应的PocketBase
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.20.0_darwin_amd64.zip -o pocketbase.zip
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.20.0_linux_amd64.zip -o pocketbase.zip
    else
        echo "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    unzip pocketbase.zip
    rm pocketbase.zip
    chmod +x pocketbase
fi

# 初始化Go模块
echo "正在初始化Go模块..."
go mod tidy

# 构建应用
echo "正在构建应用..."
go build -o product-website .

# 启动PocketBase
echo "正在启动PocketBase服务器..."
./pocketbase serve --http=127.0.0.1:8090 &

# 等待PocketBase启动
sleep 3

# 导入产品数据
echo "正在导入产品数据..."
./product-website import

echo "网站已启动！"
echo "访问地址: http://localhost:8090"
echo "管理后台: http://localhost:8090/_/"
echo ""
echo "按 Ctrl+C 停止服务器"

