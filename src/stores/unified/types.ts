// 统一的类型定义

// 文件系统节点
export interface FileSystemNode {
  // 基础属性
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  
  // 文件特定属性
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  size?: number;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  
  // 关系
  parentPath: string;
  
  // 状态
  isDeleted?: boolean;
}

// 树形节点（用于显示）
export interface TreeNode extends FileSystemNode {
  children?: TreeNode[];
}

// 笔记模型
export interface Note extends FileSystemNode {
  type: 'file';
  fileType: 'markdown';
  
  // 笔记特定属性
  content: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  
  // 元数据
  metadata?: Record<string, any>;
}

// 标签模型
export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 标签-文件关联
export interface TagFileRelation {
  tagId: string;
  fileId: string;
  positions: number[];
}

// 编辑器标签页
export interface EditorTab {
  id: string;
  fileId: string;
  title: string;
  isDirty: boolean;
  content?: string; // 未保存的内容
}

// 编辑器面板
export interface EditorPane {
  id: string;
  tabs: EditorTab[];
  activeTabId: string | null;
}

// 搜索结果
export interface SearchResult {
  node: FileSystemNode;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  context: string;
}

// WebSocket 事件
export enum WSEventType {
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

export interface WSEvent {
  type: WSEventType;
  payload: any;
  timestamp: Date;
}