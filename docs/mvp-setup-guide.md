# MVP 文档管理系统设置指南

## 概述

这是一个无需用户认证的MVP版本文档管理系统，类似Obsidian的文件管理方式，将文档存储在本地文件系统中。

## 主要变更

### 移除用户认证系统
- ✅ 移除了所有JWT认证中间件
- ✅ 移除了用户登录验证
- ✅ 使用固定用户ID (1) 进行所有操作
- ✅ 简化了API调用流程

### 核心功能保持不变
- ✅ 文档CRUD操作
- ✅ 文件树管理
- ✅ 目录结构支持
- ✅ 文件系统同步
- ✅ 多种文档类型支持

## 快速启动

### 1. 启动后端服务

```bash
cd greenserver

# 安装依赖
go mod download

# 运行数据库迁移（会自动创建默认用户）
go run cmd/migrate/main.go

# 启动服务器
go run cmd/server/main.go
```

服务器将在 `http://localhost:6066` 启动

### 2. 启动前端

```bash
# 在项目根目录
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动

## API 端点

所有API端点都无需认证，可以直接访问：

### 文档管理
- `POST /v1/documents` - 创建文档
- `GET /v1/documents` - 获取文档列表
- `GET /v1/documents/{id}` - 获取文档信息
- `GET /v1/documents/{id}/content` - 获取文档内容
- `PUT /v1/documents/{id}` - 更新文档
- `DELETE /v1/documents/{id}` - 删除文档

### 文件系统操作
- `GET /v1/documents/tree` - 获取文件树
- `POST /v1/documents/directories` - 创建目录
- `POST /v1/documents/{id}/move` - 移动文档
- `POST /v1/documents/{id}/rename` - 重命名文档
- `POST /v1/documents/sync` - 同步文件系统

## 文件存储

文档存储在 `greenserver/documents/user_1/` 目录下：

```
greenserver/
└── documents/
    └── user_1/          # 默认用户的文档目录
        ├── 文档1.md
        ├── 文档2.txt
        └── 子目录/
            └── 子文档.md
```

## 使用示例

### 创建文档

```bash
curl -X POST http://localhost:6066/v1/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一个文档",
    "type": "markdown",
    "content": "# 我的第一个文档\n\n这是内容...",
    "parent_path": ""
  }'
```

### 获取文件树

```bash
curl http://localhost:6066/v1/documents/tree
```

### 获取文档内容

```bash
curl http://localhost:6066/v1/documents/1/content
```

## 前端界面

访问 `http://localhost:3000` 可以看到：

1. **左侧**: 原有的测试布局和文件浏览器
2. **右侧**: 新的文档管理器界面
   - 文件树显示
   - 创建文档按钮
   - 同步文件系统按钮
   - 文档编辑器

## 功能演示

1. **创建文档**: 点击"新建文档"按钮，输入标题即可创建
2. **编辑文档**: 点击文件树中的文档名，右侧显示编辑器
3. **保存文档**: 修改内容后点击"保存文档"
4. **删除文档**: 点击文档旁边的"删除"按钮
5. **同步文件系统**: 点击"同步文件系统"扫描外部文件变更

## 目录结构

```
/
├── greenserver/          # Go后端
│   ├── app/document/     # 文档管理模块
│   ├── documents/        # 文档存储目录
│   └── cmd/server/       # 服务器入口
├── src/                  # React前端
│   ├── lib/api/          # API客户端
│   └── components/       # UI组件
└── docs/                 # 文档
```

## 注意事项

1. **数据持久化**: 文档直接存储在文件系统中，重启服务不会丢失数据
2. **并发安全**: 当前版本未处理并发写入，适合单用户使用
3. **文件权限**: 确保应用有权限读写 `documents` 目录
4. **端口配置**: 默认后端端口6066，前端端口3000

## 扩展建议

1. **版本控制**: 可集成Git进行文件版本管理
2. **全文搜索**: 可添加文档内容搜索功能
3. **文件监控**: 可添加文件系统监控实时同步
4. **导入导出**: 可支持批量导入导出功能
5. **主题支持**: 可添加编辑器主题切换

## 故障排除

### 后端无法启动
- 检查端口6066是否被占用
- 确保数据库配置正确
- 查看 `server.log` 日志文件

### 前端无法连接后端
- 确认后端服务已启动
- 检查CORS配置
- 确认API地址配置正确

### 文档无法保存
- 检查 `documents` 目录权限
- 确认磁盘空间充足
- 查看后端日志错误信息

这个MVP版本提供了完整的文档管理功能，无需复杂的用户认证系统，适合快速演示和原型开发。
