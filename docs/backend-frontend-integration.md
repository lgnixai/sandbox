# 前后端文件系统集成实现

## 概述

我们成功实现了一个类似Obsidian的文件系统，将前端的文件操作与后端的文档管理系统连动起来。后端将文档保存到本地文件系统而不是数据库中，实现了真正的文件管理。

## 架构设计

### 后端架构

```
greenserver/
├── app/document/           # 文档管理模块
│   ├── model.go           # 数据模型定义
│   ├── dto.go             # 数据传输对象
│   ├── repository.go      # 数据访问层
│   ├── service.go         # 业务逻辑层
│   └── handler.go         # HTTP处理器
├── routes/v1/document.go  # 路由配置
└── documents/             # 文档存储目录
    └── user_{id}/         # 按用户分组的文档目录
```

### 前端架构

```
src/
├── lib/
│   ├── api/documentApi.ts              # 后端API客户端
│   └── event-handlers/
│       └── FileSystemEventHandler.ts  # 文件系统事件处理器
├── components/
│   ├── DocumentManager/               # 文档管理器组件
│   └── FileExplorer/                 # 文件浏览器组件
└── stores/                           # 状态管理
```

## 核心功能

### 1. 文档管理API

- **创建文档**: `POST /v1/documents`
- **获取文档**: `GET /v1/documents/{id}`
- **获取文档内容**: `GET /v1/documents/{id}/content`
- **更新文档**: `PUT /v1/documents/{id}`
- **删除文档**: `DELETE /v1/documents/{id}`
- **获取文件树**: `GET /v1/documents/tree`
- **创建目录**: `POST /v1/documents/directories`
- **移动文档**: `POST /v1/documents/{id}/move`
- **重命名文档**: `POST /v1/documents/{id}/rename`
- **同步文件系统**: `POST /v1/documents/sync`

### 2. 文档数据模型

```go
type Document struct {
    ID          uint           `json:"id"`
    Title       string         `json:"title"`
    Type        DocumentType   `json:"type"`
    Status      DocumentStatus `json:"status"`
    FilePath    string         `json:"file_path"`    // 本地文件路径
    FileName    string         `json:"file_name"`
    FileSize    int64          `json:"file_size"`
    ParentPath  string         `json:"parent_path"`
    IsDirectory bool           `json:"is_directory"`
    UserID      uint           `json:"user_id"`
    // ... 其他字段
}
```

### 3. 文件系统存储

- 文档按用户分组存储在 `documents/user_{id}/` 目录下
- 支持多种文档类型：Markdown、Text、Code、JSON、YAML、HTML
- 数据库只存储元数据，实际内容存储在文件系统中
- 支持目录结构和文件层级管理

### 4. 前端事件系统

前端使用事件驱动架构处理文件操作：

- `FileNodeCreatedEvent`: 文件创建事件
- `FileNodeDeletedEvent`: 文件删除事件  
- `FileNodeRenamedEvent`: 文件重命名事件
- `FileNodeMovedEvent`: 文件移动事件

事件处理器会自动调用后端API同步操作。

## 使用示例

### 创建文档

```typescript
// 前端代码
const response = await documentApi.createDocument({
  title: '新文档',
  type: 'markdown',
  content: '# 新文档\n\n这是内容',
  parent_path: '/folder1'
});
```

### 获取文档内容

```typescript
// 前端代码
const response = await documentApi.getDocumentContent(documentId);
console.log(response.data.content); // 文档内容
```

### 文件树操作

```typescript
// 获取完整文件树
const treeResponse = await documentApi.getFileTree();
const fileTree = treeResponse.data.nodes;
```

## 特性

1. **类Obsidian体验**: 文件直接存储在文件系统中，支持外部编辑器修改
2. **用户隔离**: 每个用户有独立的文档目录
3. **实时同步**: 前端操作立即同步到后端文件系统
4. **文件树管理**: 支持目录结构和文件层级
5. **多种文档类型**: 支持Markdown、文本、代码等多种格式
6. **元数据管理**: 数据库存储文档元信息，便于搜索和管理
7. **错误处理**: 完善的错误处理和用户反馈机制

## 部署说明

### 后端部署

1. 确保Go环境 (1.21+)
2. 配置数据库连接
3. 设置文档存储目录权限
4. 运行数据库迁移
5. 启动服务器

```bash
cd greenserver
go mod download
make migrate
make run
```

### 前端部署

1. 确保Node.js环境
2. 安装依赖
3. 配置API端点
4. 启动开发服务器

```bash
npm install
npm run dev
```

## 安全考虑

1. **用户认证**: 所有API需要JWT认证
2. **路径验证**: 防止目录遍历攻击
3. **文件大小限制**: 限制上传文件大小
4. **权限检查**: 用户只能访问自己的文档
5. **输入验证**: 严格验证用户输入

## 扩展性

1. **插件系统**: 可扩展不同文档类型处理器
2. **版本控制**: 可集成Git进行版本管理
3. **协作功能**: 可添加多用户协作编辑
4. **全文搜索**: 可集成Elasticsearch等搜索引擎
5. **云存储**: 可扩展到云存储服务

## 总结

我们成功实现了一个完整的前后端文件系统集成方案，提供了类似Obsidian的文档管理体验。系统具有良好的架构设计、完整的功能实现和良好的扩展性。
