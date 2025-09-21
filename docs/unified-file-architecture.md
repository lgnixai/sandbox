# 统一文件管理架构设计

## 1. 核心概念统一

### 1.1 文件模型 (File Model)

```typescript
// 统一的文件/文件夹模型
interface FileSystemNode {
  // 基础属性
  id: string;              // 唯一标识符
  name: string;            // 文件/文件夹名称
  path: string;            // 完整路径 (如: /workspace/notes/example.md)
  type: 'file' | 'folder'; // 节点类型
  
  // 文件特定属性
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  size?: number;           // 文件大小（字节）
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  
  // 关系
  parentPath: string;      // 父文件夹路径
  
  // 状态
  isDeleted?: boolean;     // 软删除标记
}

// 笔记模型（扩展文件模型）
interface Note extends FileSystemNode {
  type: 'file';
  fileType: 'markdown';
  
  // 笔记特定属性
  content: string;         // 笔记内容
  tags: string[];          // 标签数组
  links: string[];         // 出链
  backlinks: string[];     // 入链
  
  // 元数据
  metadata?: {
    [key: string]: any;    // 自定义元数据
  };
}
```

### 1.2 标签模型 (Tag Model)

```typescript
// 标签模型
interface Tag {
  id: string;              // 唯一标识符
  name: string;            // 标签名称（不含#）
  color?: string;          // 标签颜色
  description?: string;    // 标签描述
  
  // 统计
  usageCount: number;      // 使用次数
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

// 标签-文件关联
interface TagFileRelation {
  tagId: string;
  fileId: string;
  positions: number[];     // 标签在文件中的位置
}
```

## 2. 后端架构设计

### 2.1 服务层设计

```go
// 文件系统服务接口
type FileSystemService interface {
    // 文件操作
    GetNode(path string) (*FileSystemNode, error)
    ListNodes(parentPath string) ([]*FileSystemNode, error)
    CreateFile(path string, content string, fileType string) error
    UpdateFile(path string, content string) error
    DeleteNode(path string) error
    MoveNode(oldPath string, newPath string) error
    
    // 搜索
    SearchFiles(query string) ([]*FileSystemNode, error)
}

// 标签服务接口
type TagService interface {
    // 标签操作
    GetTag(id string) (*Tag, error)
    ListTags() ([]*Tag, error)
    CreateTag(tag *Tag) error
    UpdateTag(id string, updates map[string]interface{}) error
    DeleteTag(id string) error
    
    // 关联操作
    GetFileTags(fileId string) ([]*Tag, error)
    GetTagFiles(tagId string) ([]*FileSystemNode, error)
    AddTagToFile(tagId string, fileId string) error
    RemoveTagFromFile(tagId string, fileId string) error
    
    // 标签提取
    ExtractTagsFromContent(content string) ([]string, error)
}

// 笔记服务接口
type NoteService interface {
    // 笔记操作
    GetNote(id string) (*Note, error)
    CreateNote(note *Note) error
    UpdateNote(id string, updates map[string]interface{}) error
    
    // 链接管理
    UpdateLinks(noteId string) error
    GetBacklinks(noteId string) ([]*Note, error)
    
    // 批量操作
    BatchUpdateNotes(updates []NoteUpdate) error
}
```

### 2.2 数据存储设计

```yaml
# 文件系统存储
/workspace/
  ├── notes/           # 笔记文件夹
  ├── attachments/     # 附件文件夹
  ├── .obsidian/       # 配置文件夹
  │   ├── workspace    # 工作区配置
  │   ├── tags.json    # 标签数据
  │   └── graph.json   # 图谱数据
  └── .trash/          # 回收站
```

## 3. API 设计

### 3.1 RESTful API 端点

```yaml
# 文件系统 API
GET    /api/fs/tree              # 获取文件树
GET    /api/fs/node?path=        # 获取单个节点
POST   /api/fs/file              # 创建文件
PUT    /api/fs/file              # 更新文件
DELETE /api/fs/node?path=        # 删除节点
POST   /api/fs/move              # 移动/重命名

# 笔记 API
GET    /api/notes/:id            # 获取笔记
POST   /api/notes                # 创建笔记
PUT    /api/notes/:id            # 更新笔记
GET    /api/notes/:id/backlinks  # 获取反向链接

# 标签 API
GET    /api/tags                 # 获取所有标签
POST   /api/tags                 # 创建标签
PUT    /api/tags/:id             # 更新标签
DELETE /api/tags/:id             # 删除标签
GET    /api/tags/:id/files       # 获取标签关联的文件
POST   /api/tags/:id/files       # 关联文件到标签

# 搜索 API
GET    /api/search?q=            # 全文搜索
GET    /api/search/tags?q=       # 标签搜索
```

### 3.2 WebSocket 事件

```typescript
// WebSocket 事件类型
enum WSEventType {
  // 文件系统事件
  FILE_CREATED = 'file:created',
  FILE_UPDATED = 'file:updated',
  FILE_DELETED = 'file:deleted',
  FILE_MOVED = 'file:moved',
  
  // 标签事件
  TAG_CREATED = 'tag:created',
  TAG_UPDATED = 'tag:updated',
  TAG_DELETED = 'tag:deleted',
  
  // 同步事件
  SYNC_START = 'sync:start',
  SYNC_COMPLETE = 'sync:complete',
  SYNC_ERROR = 'sync:error'
}
```

## 4. 前端状态管理设计

### 4.1 统一的 Store 结构

```typescript
// 主 Store
interface UnifiedStore {
  // 文件系统
  fileSystem: {
    nodes: Map<string, FileSystemNode>;
    tree: TreeNode;
    loading: boolean;
  };
  
  // 笔记
  notes: {
    items: Map<string, Note>;
    activeNoteId: string | null;
    loading: boolean;
  };
  
  // 标签
  tags: {
    items: Map<string, Tag>;
    fileTagMap: Map<string, Set<string>>;
    tagFileMap: Map<string, Set<string>>;
  };
  
  // 编辑器
  editor: {
    panes: Pane[];
    activePaneId: string | null;
  };
  
  // UI
  ui: {
    leftSidebar: SidebarState;
    rightSidebar: SidebarState;
    commandPalette: CommandPaletteState;
  };
}
```

### 4.2 数据同步策略

```typescript
class DataSyncManager {
  // 前后端同步
  async syncFileSystem() {
    // 1. 获取后端文件树
    const serverTree = await api.getFileTree();
    
    // 2. 对比本地缓存
    const diff = this.compareTree(localTree, serverTree);
    
    // 3. 应用差异
    await this.applyDiff(diff);
    
    // 4. 更新本地状态
    store.updateFileSystem(serverTree);
  }
  
  // 实时同步
  setupWebSocket() {
    ws.on(WSEventType.FILE_UPDATED, (event) => {
      store.updateNode(event.path, event.data);
    });
  }
  
  // 批量更新优化
  batchUpdate = debounce((updates: Update[]) => {
    api.batchUpdate(updates);
  }, 500);
}
```

## 5. 迁移计划

### 5.1 阶段一：后端重构
1. 创建新的文件系统服务
2. 实现标签服务
3. 更新 API 端点
4. 添加 WebSocket 支持

### 5.2 阶段二：前端重构
1. 创建统一的 Store
2. 迁移现有组件到新 Store
3. 实现数据同步机制
4. 优化性能

### 5.3 阶段三：功能增强
1. 实现高级搜索
2. 添加批量操作
3. 优化缓存策略
4. 完善错误处理

## 6. 性能优化策略

### 6.1 前端优化
- 虚拟滚动文件树
- 懒加载文件内容
- 缓存常用数据
- 批量更新 DOM

### 6.2 后端优化
- 文件索引缓存
- 标签计数缓存
- 并发控制
- 数据库连接池

### 6.3 网络优化
- 请求合并
- 增量同步
- 压缩传输
- CDN 静态资源