// 文件节点类型
export type FileType = 'markdown' | 'database' | 'canvas' | 'html' | 'code';

export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  fileType: FileType;
  path: string;
  parentPath: string;
  content?: string;
  unlinkedMentions?: number;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  path: string;
  parentPath: string;
  isExpanded?: boolean;
  childCount?: number;
}

export type TreeNode = FileNode | FolderNode;

// 笔记类型
export interface Note {
  id: string;
  title: string;
  content: string;
  links: string[];
  backlinks: string[];
  createdAt: Date;
  updatedAt: Date;
  fileType?: FileType;
  folder?: string;
}

// 标签类型
export interface Tag {
  name: string;
  count: number;
  noteIds: string[];
}

// 拖拽数据类型
export interface DragData {
  node: TreeNode;
  type: 'move' | 'link';
}

// ===== 文件树事件 =====

export type FileNodeCreatedEvent = {
  type: 'file.node.created';
  node: FileNode;
};

export type FileNodeUpdatedEvent = {
  type: 'file.node.updated';
  nodeId: string;
  updates: Partial<FileNode>;
};

export type FileNodeDeletedEvent = {
  type: 'file.node.deleted';
  nodeId: string;
  node: FileNode;
};

export type FileNodeRenamedEvent = {
  type: 'file.node.renamed';
  nodeId: string;
  oldName: string;
  newName: string;
  oldPath: string;
  newPath: string;
};

export type FileNodeMovedEvent = {
  type: 'file.node.moved';
  nodeId: string;
  oldParentPath: string;
  newParentPath: string;
  oldPath: string;
  newPath: string;
};

export type FolderNodeCreatedEvent = {
  type: 'folder.node.created';
  node: FolderNode;
};

export type FolderNodeUpdatedEvent = {
  type: 'folder.node.updated';
  nodeId: string;
  updates: Partial<FolderNode>;
};

export type FolderNodeDeletedEvent = {
  type: 'folder.node.deleted';
  nodeId: string;
  node: FolderNode;
};

export type FolderNodeRenamedEvent = {
  type: 'folder.node.renamed';
  nodeId: string;
  oldName: string;
  newName: string;
  oldPath: string;
  newPath: string;
};

export type FolderNodeMovedEvent = {
  type: 'folder.node.moved';
  nodeId: string;
  oldParentPath: string;
  newParentPath: string;
  oldPath: string;
  newPath: string;
};

export type FolderExpandedEvent = {
  type: 'folder.expanded';
  folderPath: string;
};

export type FolderCollapsedEvent = {
  type: 'folder.collapsed';
  folderPath: string;
};

export type NodeSelectedEvent = {
  type: 'node.selected';
  nodeId: string | null;
  previousNodeId: string | null;
};

export type DragStartedEvent = {
  type: 'drag.started';
  node: TreeNode;
};

export type DragEndedEvent = {
  type: 'drag.ended';
  node: TreeNode;
};

export type DragOverEvent = {
  type: 'drag.over';
  nodeId: string;
};

export type DragLeaveEvent = {
  type: 'drag.leave';
  nodeId: string;
};

export type DropEvent = {
  type: 'drop';
  targetNodeId: string;
  dragData: DragData;
};

export type FileTreeSearchQueryChangedEvent = {
  type: 'file.tree.search.query.changed';
  query: string;
  previousQuery: string;
};

export type UnlinkedMentionsUpdatedEvent = {
  type: 'unlinked.mentions.updated';
  counts: Record<string, number>;
};

// ===== 笔记事件 =====

export type NoteCreatedEvent = {
  type: 'note.created';
  note: Note;
};

export type NoteUpdatedEvent = {
  type: 'note.updated';
  noteId: string;
  updates: Partial<Note>;
  previousContent?: string;
};

export type NoteDeletedEvent = {
  type: 'note.deleted';
  noteId: string;
  note: Note;
};

export type NoteRenamedEvent = {
  type: 'note.renamed';
  noteId: string;
  oldTitle: string;
  newTitle: string;
};

export type NoteDuplicatedEvent = {
  type: 'note.duplicated';
  originalNoteId: string;
  duplicatedNoteId: string;
  duplicatedNote: Note;
};

export type NoteMovedEvent = {
  type: 'note.moved';
  noteId: string;
  oldFolder: string;
  newFolder: string;
};

export type NoteContentChangedEvent = {
  type: 'note.content.changed';
  noteId: string;
  oldContent: string;
  newContent: string;
};

export type NoteLinksUpdatedEvent = {
  type: 'note.links.updated';
  noteId: string;
  links: string[];
  backlinks: string[];
};

// ===== 标签事件 =====

export type TagCreatedEvent = {
  type: 'tag.created';
  tagName: string;
  noteId: string;
};

export type TagDeletedEvent = {
  type: 'tag.deleted';
  tagName: string;
  noteId: string;
};

export type TagUpdatedEvent = {
  type: 'tag.updated';
  tagName: string;
  noteIds: string[];
  previousNoteIds: string[];
};

export type TagClickedEvent = {
  type: 'tag.clicked';
  tagName: string;
};

export type TagNoteClickedEvent = {
  type: 'tag.note.clicked';
  tagName: string;
  noteId: string;
};

// ===== 编辑器事件 =====

export type EditorTabOpenedEvent = {
  type: 'editor.tab.opened';
  noteId: string;
  openMode: 'preview' | 'pinned';
};

export type EditorTabClosedEvent = {
  type: 'editor.tab.closed';
  noteId: string;
};

export type EditorTabPinnedEvent = {
  type: 'editor.tab.pinned';
  noteId: string;
};

export type EditorTabUnpinnedEvent = {
  type: 'editor.tab.unpinned';
  noteId: string;
};

export type EditorTabRenamedEvent = {
  type: 'editor.tab.renamed';
  noteId: string;
  oldTitle: string;
  newTitle: string;
};

export type EditorActiveTabChangedEvent = {
  type: 'editor.active.tab.changed';
  activeTabId: string | null;
  previousActiveTabId: string | null;
};

export type EditorModeChangedEvent = {
  type: 'editor.mode.changed';
  noteId: string;
  mode: 'edit' | 'preview';
};

// ===== 搜索事件 =====

export type SearchQueryChangedEvent = {
  type: 'search.query.changed';
  query: string;
  searchType: 'global' | 'file' | 'tag' | 'content';
};

export type SearchResultsUpdatedEvent = {
  type: 'search.results.updated';
  query: string;
  results: string[];
  resultType: 'notes' | 'files' | 'tags';
};

// ===== 系统事件 =====

export type AppInitializedEvent = {
  type: 'app.initialized';
};

export type AppThemeChangedEvent = {
  type: 'app.theme.changed';
  theme: 'light' | 'dark';
};

export type AppLayoutChangedEvent = {
  type: 'app.layout.changed';
  layout: 'default' | 'compact' | 'wide';
};

export type PanelVisibilityChangedEvent = {
  type: 'panel.visibility.changed';
  panelId: string;
  isVisible: boolean;
};

export type CommandPaletteOpenedEvent = {
  type: 'command.palette.opened';
};

export type CommandPaletteClosedEvent = {
  type: 'command.palette.closed';
};

export type CommandExecutedEvent = {
  type: 'command.executed';
  command: string;
  args?: Record<string, any>;
};

// ===== 错误事件 =====

export type ErrorOccurredEvent = {
  type: 'error.occurred';
  error: Error;
  context?: string;
  component?: string;
};

export type WarningOccurredEvent = {
  type: 'warning.occurred';
  message: string;
  context?: string;
  component?: string;
};

// 统一事件类型
export type Event =
  // 文件树事件
  | FileNodeCreatedEvent
  | FileNodeUpdatedEvent
  | FileNodeDeletedEvent
  | FileNodeRenamedEvent
  | FileNodeMovedEvent
  | FolderNodeCreatedEvent
  | FolderNodeUpdatedEvent
  | FolderNodeDeletedEvent
  | FolderNodeRenamedEvent
  | FolderNodeMovedEvent
  | FolderExpandedEvent
  | FolderCollapsedEvent
  | NodeSelectedEvent
  | DragStartedEvent
  | DragEndedEvent
  | DragOverEvent
  | DragLeaveEvent
  | DropEvent
  | FileTreeSearchQueryChangedEvent
  | UnlinkedMentionsUpdatedEvent
  // 笔记事件
  | NoteCreatedEvent
  | NoteUpdatedEvent
  | NoteDeletedEvent
  | NoteRenamedEvent
  | NoteDuplicatedEvent
  | NoteMovedEvent
  | NoteContentChangedEvent
  | NoteLinksUpdatedEvent
  // 标签事件
  | TagCreatedEvent
  | TagDeletedEvent
  | TagUpdatedEvent
  | TagClickedEvent
  | TagNoteClickedEvent
  // 编辑器事件
  | EditorTabOpenedEvent
  | EditorTabClosedEvent
  | EditorTabPinnedEvent
  | EditorTabUnpinnedEvent
  | EditorTabRenamedEvent
  | EditorActiveTabChangedEvent
  | EditorModeChangedEvent
  // 搜索事件
  | SearchQueryChangedEvent
  | SearchResultsUpdatedEvent
  // 系统事件
  | AppInitializedEvent
  | AppThemeChangedEvent
  | AppLayoutChangedEvent
  | PanelVisibilityChangedEvent
  | CommandPaletteOpenedEvent
  | CommandPaletteClosedEvent
  | CommandExecutedEvent
  // 错误事件
  | ErrorOccurredEvent
  | WarningOccurredEvent;
