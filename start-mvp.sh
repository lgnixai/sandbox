#!/bin/bash

echo "🚀 启动 MVP 文档管理系统"
echo "=========================="

# 检查是否在正确的目录
if [ ! -d "greenserver" ] || [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 启动后端
echo "📦 启动后端服务..."
cd greenserver

# 检查Go环境
if ! command -v go &> /dev/null; then
    echo "❌ Go 未安装，请先安装 Go 1.21+"
    exit 1
fi

# 安装依赖
echo "📥 安装Go依赖..."
go mod download

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
if [ -f "cmd/migrate/main.go" ]; then
    go run cmd/migrate/main.go
else
    echo "⚠️  迁移文件不存在，跳过数据库迁移"
fi

# 启动后端服务（后台运行）
echo "🌐 启动后端服务 (端口 6066)..."
go run cmd/server/main.go &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:6066/ping > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 返回项目根目录
cd ..

# 启动前端
echo "🎨 启动前端服务..."

# 检查Node.js环境
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm 未安装，请先安装 Node.js"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 安装前端依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
echo "🌐 启动前端服务 (端口 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 系统启动完成！"
echo "=========================="
echo "📖 后端API: http://localhost:6066"
echo "🌐 前端界面: http://localhost:3000"
echo ""
echo "💡 使用说明:"
echo "   - 左侧: 原有的测试布局"
echo "   - 右侧: 新的文档管理器"
echo "   - 点击'新建文档'创建文档"
echo "   - 点击文档名进行编辑"
echo "   - 点击'同步文件系统'刷新"
echo ""
echo "📁 文档存储位置: greenserver/documents/user_1/"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 服务已停止'; exit 0" INT

# 保持脚本运行
wait
