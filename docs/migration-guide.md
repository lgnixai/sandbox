# 文件管理系统重构迁移指南

## 概述

本次重构统一了前后端的文件管理和标签系统，实现了类似 Obsidian 的笔记管理功能。主要改进包括：

1. **统一的数据模型**：前后端使用一致的数据结构
2. **完整的标签系统**：支持标签的增删查改和文件关联
3. **实时同步**：通过 WebSocket 实现前后端数据同步
4. **性能优化**：缓存、批量更新、虚拟滚动等

## 主要变更

### 1. 后端变更

#### 新增服务
- `FileSystemService`：统一的文件系统服务
- `TagService`：标签管理服务
- `NoteService`：笔记专用服务

#### API 端点变更

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| GET /api/tree | GET /api/fs/tree | 获取文件树 |
| GET /api/file | GET /api/fs/node | 获取文件信息 |
| POST /api/file | POST /api/fs/file | 创建文件 |
| PUT /api/file | PUT /api/fs/file | 更新文件 |
| DELETE /api/path | DELETE /api/fs/node | 删除节点 |
| POST /api/move | POST /api/fs/move | 移动/重命名 |
| - | GET /api/tags | 获取所有标签 |
| - | POST /api/tags | 创建标签 |
| - | GET /api/notes/:id | 获取笔记详情 |

### 2. 前端变更

#### Store 重构
```typescript
// 旧的分散 Store
- useAppStore
- useNotesStore  
- useFileTreeStore
- useEditorStore (旧)

// 新的统一 Store
+ useFileSystemStore  // 文件系统管理
+ useNoteStore       // 笔记管理
+ useTagStore        // 标签管理
+ useEditorStore     // 编辑器管理（重构版）
```

#### 组件更新
- `FileExplorer`：使用新的 useFileSystemStore
- `TagsPanel`：全新实现，支持完整的标签管理
- `FileTree`：优化渲染性能，支持搜索高亮

### 3. 数据模型统一

```typescript
// 统一的文件节点模型
interface FileSystemNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  size?: number;
  createdAt: Date;
  updatedAt: Date;
  parentPath: string;
}

// 笔记模型（扩展文件节点）
interface Note extends FileSystemNode {
  content: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  metadata?: Record<string, any>;
}

// 标签模型
interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 迁移步骤

### 1. 更新依赖

```bash
npm install uuid lodash-es lru-cache
npm install @types/uuid @types/lodash-es
```

### 2. 更新导入

```typescript
// 旧导入
import { useAppStore } from '@/stores';

// 新导入
import { 
  useFileSystemStore, 
  useNoteStore, 
  useTagStore, 
  useEditorStore 
} from '@/stores/unified';
```

### 3. 更新组件

#### 文件操作
```typescript
// 旧代码
const { createFileInFolder, createFolder } = useAppStore();
createFileInFolder('/workspace/笔记', '新文件.md', 'markdown');

// 新代码
const { createFile, createFolder } = useFileSystemStore();
await createFile('/workspace/notes', '新文件.md', 'markdown');
```

#### 笔记操作
```typescript
// 旧代码
const { addNote, updateNote } = useAppStore();
addNote({ id, title, content, ... });

// 新代码
const { createNote, updateNote } = useNoteStore();
await createNote('/workspace/notes/新笔记.md', '新笔记', content);
```

#### 标签操作
```typescript
// 新增功能
const { createTag, addTagToFile, getFileTags } = useTagStore();
await createTag('重要');
await addTagToFile('重要', fileId);
const tags = getFileTags(fileId);
```

### 4. 初始化应用

在主组件中添加：

```typescript
import { useAppInitialize } from '@/hooks/useAppInitialize';

function App() {
  // 初始化同步管理器
  useAppInitialize();
  
  return (
    // ... 应用内容
  );
}
```

## 新功能使用

### 1. 标签管理

- 在笔记中使用 `#标签名` 创建标签
- 标签会自动提取和索引
- 支持按标签筛选文件
- 支持标签的颜色和描述

### 2. 实时同步

- WebSocket 自动连接和重连
- 文件变更实时推送
- 支持离线操作队列

### 3. 性能优化

- LRU 缓存文件内容
- 防抖搜索
- 批量更新
- 虚拟滚动（大文件树）

## 注意事项

1. **数据迁移**：旧的笔记数据需要手动迁移到新格式
2. **API 兼容**：保留了旧 API 的兼容层，但建议尽快迁移到新 API
3. **缓存清理**：首次使用可能需要清理浏览器缓存
4. **标签初始化**：需要手动触发一次标签提取来建立索引

## 故障排除

### 问题：文件树不显示
- 检查后端服务是否正常启动
- 确认工作区路径配置正确
- 查看浏览器控制台错误

### 问题：标签不更新
- 确认标签服务已启动
- 检查 `.obsidian/tags.json` 文件权限
- 手动刷新标签列表

### 问题：WebSocket 连接失败
- 检查防火墙设置
- 确认 WebSocket 端口（8787）可访问
- 查看服务器日志

## 性能调优

1. **大文件树优化**
   - 启用虚拟滚动
   - 限制展开深度
   - 使用懒加载

2. **搜索优化**
   - 调整防抖延迟
   - 限制搜索结果数量
   - 使用索引加速

3. **内存优化**
   - 定期清理缓存
   - 限制打开标签数
   - 启用内存监控

## 后续计划

1. **功能增强**
   - 全文搜索索引
   - 标签层级结构
   - 文件版本历史

2. **性能提升**
   - 服务端渲染
   - 增量同步
   - 智能预加载

3. **用户体验**
   - 快捷键优化
   - 主题定制
   - 插件系统