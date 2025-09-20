import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { type UIState, type UIActions } from './uiStore';
import { type NotesState, type NotesActions } from './notesStore';
import { type EditorState, type EditorActions, type EditorFile } from './editorStore';
import { type FileTreeState, type FileTreeActions, type FileNode, type FolderNode } from './fileTreeStore';
import { storage } from '@/lib/storage';
import { UnlinkedMentionsCalculator } from '@/lib/unlinkedMentions';

// 启用 Immer 的 MapSet 插件
enableMapSet();

// 组合所有 store 的状态和 actions
export type AppState = UIState & NotesState & EditorState & FileTreeState;
export type AppActions = UIActions & NotesActions & EditorActions & FileTreeActions & {
  // 跨 store 的便捷方法
  selectFileInEditor: (noteId: string, options?: { openMode?: 'preview' | 'pinned' }) => void;
  createFileInEditor: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
  openNoteInTabWithTitle: (noteId: string, paneId?: string) => void;
  renameNoteAndUpdateTabs: (noteId: string, newTitle: string) => void;
  deleteNoteAndCloseTabs: (noteId: string) => void;
  revealInExplorer: (noteId: string) => void;
  
  // 文件树与笔记同步方法
  syncFileTreeWithNotes: () => void;
  loadStateFromStorage: () => void;
  saveStateToStorage: () => void;
  
  // 未链接提及计算
  calculateAndUpdateUnlinkedMentions: () => void;
};

// 创建未链接提及计算器实例
const unlinkedMentionsCalculator = new UnlinkedMentionsCalculator();

// 创建组合 store
export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // 直接定义初始状态，而不是从子 stores 获取
    // UI 状态
    isDarkMode: false,
    theme: 'obsidian' as 'obsidian' | 'nord' | 'solarized',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    leftSidebarWidth: 280,
    rightSidebarWidth: 280,
    leftActivePanel: 'files' as const,
    rightActivePanel: 'outline' as const,
    commandPaletteVisible: false,
    editorMode: 'split' as const,

    // Notes 状态
    notes: {
      'new-tab-page': {
        id: 'new-tab-page',
        title: '新标签页',
        content: '', // 空内容，将使用 WelcomeScreen 组件渲染
        links: [],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'welcome' as any, // 特殊类型，用于标识这是欢迎页面
        folder: '/system'
      },
      'welcome': {
        id: 'welcome',
        title: '欢迎',
        content: `# 欢迎使用 ReNote

这是一个模仿 Obsidian 的笔记应用。

## 功能特性

- [[Markdown编辑]]
- [[双向链接]]
- 图谱视图
- 多标签页
- 分屏功能
- 拖拽功能：从文件树拖拽文件到编辑器生成链接
- 未链接提及：自动检测文本中提到但未链接的笔记

## 快捷键

- \`Ctrl/Cmd + P\`: 打开命令面板
- \`Ctrl/Cmd + N\`: 新建笔记
- \`Ctrl/Cmd + O\`: 打开笔记
- \`Ctrl/Cmd + S\`: 保存当前笔记

在文本中提到 Markdown编辑 但没有创建链接时，会在文件树中显示未链接提及计数。

尝试点击链接或使用快捷键开始使用吧！`,
        links: ['Markdown编辑', '双向链接'],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      },
      'markdown编辑': {
        id: 'markdown编辑',
        title: 'Markdown编辑',
        content: `# Markdown 编辑

这是一个支持实时预览的 Markdown 编辑器。

## 基础语法

### 标题
使用 # 来创建标题

### 列表
- 项目一
- 项目二
- 项目三

### 链接
可以使用 [[双向链接]] 语法来链接其他笔记。

### 代码
\`\`\`javascript
console.log('Hello, ReNote!');
\`\`\`

返回 [[欢迎]] 页面。`,
        links: ['双向链接', '欢迎'],
        backlinks: ['欢迎'],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      },
      '双向链接': {
        id: '双向链接',
        title: '双向链接',
        content: `# 双向链接

双向链接是知识管理的核心功能。

## 使用方法

使用 \`[[笔记名]]\` 语法来创建链接。

例如：
- [[欢迎]]
- [[Markdown编辑]]

## 反向链接

在右侧面板可以看到指向当前笔记的所有链接。

这有助于发现知识之间的联系。

## 未链接提及

系统会自动检测文本中提到的其他笔记。比如这里提到了 欢迎 页面（没有使用链接语法），
系统会在文件树中显示计数，提醒你可能需要创建链接。`,
        links: ['欢迎', 'Markdown编辑'],
        backlinks: ['欢迎', 'Markdown编辑'],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      }
    },
    selectedFileId: null,

    // Editor 状态
    panes: [
      {
        id: 'main-pane',
        tabs: [
          {
            id: 'new-tab-page',
            noteId: 'new-tab-page',
            title: '新标签页',
            isDirty: false
          }
        ],
        activeTabId: 'new-tab-page'
      }
    ],
    activePaneId: 'main-pane',
    editorCallbacks: {},

    // FileTree 状态
    nodes: {},
    expandedFolders: new Set(['/workspace', '/workspace/笔记']),
    selectedNodeId: null,
    draggedNode: null,
    dragOverNodeId: null,
    renamingNodeId: null,
    searchQuery: '',
    filteredNodeIds: new Set(),

    // 直接实现所有 actions
    // UI Actions
    toggleTheme: () => set((state) => {
      state.isDarkMode = !state.isDarkMode;
    }),
    setTheme: (theme: 'obsidian' | 'nord' | 'solarized') => set((state) => {
      state.theme = theme;
    }),
    toggleLeftSidebar: () => set((state) => {
      state.leftSidebarVisible = !state.leftSidebarVisible;
    }),
    toggleRightSidebar: () => set((state) => {
      state.rightSidebarVisible = !state.rightSidebarVisible;
    }),
    setLeftSidebarWidth: (width: number) => set((state) => {
      state.leftSidebarWidth = Math.max(200, Math.min(500, width));
    }),
    setRightSidebarWidth: (width: number) => set((state) => {
      state.rightSidebarWidth = Math.max(200, Math.min(500, width));
    }),
    setLeftPanel: (panel) => set((state) => {
      state.leftActivePanel = panel;
    }),
    setRightPanel: (panel) => set((state) => {
      state.rightActivePanel = panel;
    }),
    toggleCommandPalette: () => set((state) => {
      state.commandPaletteVisible = !state.commandPaletteVisible;
    }),
    setEditorMode: (mode) => set((state) => {
      state.editorMode = mode;
    }),

    // Notes Actions
    addNote: (note) => {
      set((state) => {
        state.notes[note.id] = note;
      });
      // 计算未链接提及
      setTimeout(() => get().calculateAndUpdateUnlinkedMentions(), 100);
    },
    updateNote: (noteId, updates) => {
      set((state) => {
        if (state.notes[noteId]) {
          Object.assign(state.notes[noteId], updates, { updatedAt: new Date() });
        }
      });
      // 延迟计算未链接提及，避免频繁更新
      setTimeout(() => get().calculateAndUpdateUnlinkedMentions(), 500);
    },
    duplicateNote: (noteId) => set((state) => {
      const originalNote = state.notes[noteId];
      if (originalNote) {
        const duplicatedId = `note-${Date.now()}-copy`;
        const duplicatedNote = {
          ...originalNote,
          id: duplicatedId,
          title: `${originalNote.title} - 副本`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.notes[duplicatedId] = duplicatedNote;
      }
    }),
    moveNote: (noteId, _targetFolder) => set((state) => {
      if (state.notes[noteId]) {
        state.notes[noteId].updatedAt = new Date();
      }
    }),
    renameFolder: (_oldPath, _newName) => set((_state) => {
      // 文件夹重命名逻辑
    }),
    setSelectedFile: (fileId) => set((state) => {
      state.selectedFileId = fileId;
    }),

    // Editor Actions
    setEditorCallbacks: (callbacks) => set((state) => {
      state.editorCallbacks = callbacks;
    }),
    closeTab: (tabId, paneId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (!pane) return;

      pane.tabs = pane.tabs.filter(tab => tab.id !== tabId);
      if (pane.activeTabId === tabId) {
        pane.activeTabId = pane.tabs[0]?.id || null;
      }

      if (pane.tabs.length === 0) {
        state.panes = state.panes.filter(p => p.id !== paneId);
      }
    }),
    setActiveTab: (tabId, paneId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (pane) {
        pane.activeTabId = tabId;
      }
    }),
    createPane: (pane, _direction) => set((state) => {
      state.panes.push(pane);
    }),
    closePane: (paneId) => set((state) => {
      state.panes = state.panes.filter(p => p.id !== paneId);
    }),
    setActivePane: (paneId) => set((state) => {
      state.activePaneId = paneId;
    }),
    splitTab: (tabId, paneId, _direction) => set((state) => {
      const sourcePane = state.panes.find(p => p.id === paneId);
      const sourceTab = sourcePane?.tabs.find(t => t.id === tabId);

      if (!sourcePane || !sourceTab) return;

      const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newPane = {
        id: newPaneId,
        tabs: [{ ...sourceTab, id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }],
        activeTabId: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      newPane.activeTabId = newPane.tabs[0].id;
      state.panes.push(newPane);
      state.activePaneId = newPaneId;
    }),

    // 跨 store 协作的核心方法
    openNoteInTabWithTitle: (noteId: string, paneId?: string) => {
      const state = get();
      const note = state.notes[noteId];
      if (!note) return;

      set((state) => {
        // 确保 panes 数组不为空
        if (state.panes.length === 0) {
          state.panes = [{
            id: 'main-pane',
            tabs: [{
              id: 'new-tab-page',
              noteId: 'new-tab-page',
              title: '新标签页',
              isDirty: false
            }],
            activeTabId: 'new-tab-page'
          }];
          state.activePaneId = 'main-pane';
        }

        const targetPaneId = paneId || state.activePaneId || 'main-pane';
        const targetPane = state.panes.find(p => p.id === targetPaneId);
        if (!targetPane) return;

        // 检查是否已经打开了这个笔记
        const existingTab = targetPane.tabs.find(tab => tab.noteId === noteId);
        if (existingTab) {
          targetPane.activeTabId = existingTab.id;
          return;
        }

        // 创建新标签页，使用正确的标题
        const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        targetPane.tabs.push({
          id: newTabId,
          noteId: noteId,
          title: note.title, // 使用正确的笔记标题
          isDirty: false
        });
        targetPane.activeTabId = newTabId;
      });
    },

    // 重写需要跨 store 协作的 actions
    selectFileInEditor: (noteId: string, options?: { openMode?: 'preview' | 'pinned' }) => {
      const state = get();
      const note = state.notes[noteId];
      if (note) {
        // 直接调用 openNoteInTabWithTitle 来打开文件
        get().openNoteInTabWithTitle(noteId, state.activePaneId || undefined);
      }
    },

    createFileInEditor: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => {
      const state = get();
      if (state.editorCallbacks.onCreateFile) {
        state.editorCallbacks.onCreateFile(type, folder);
      }
    },

    renameNoteAndUpdateTabs: (noteId: string, newTitle: string) => {
      set((state) => {
        // 更新笔记标题
        if (state.notes[noteId]) {
          state.notes[noteId].title = newTitle;
          state.notes[noteId].updatedAt = new Date();
        }

        // 更新所有相关标签页的标题
        state.panes.forEach(pane => {
          pane.tabs.forEach(tab => {
            if (tab.noteId === noteId) {
              tab.title = newTitle;
            }
          });
        });
      });
    },

    deleteNoteAndCloseTabs: (noteId: string) => {
      set((state) => {
        // 删除笔记
        delete state.notes[noteId];

        // 关闭所有相关标签页
        state.panes.forEach(pane => {
          pane.tabs = pane.tabs.filter(tab => tab.noteId !== noteId);
          if (pane.tabs.some(tab => tab.id === pane.activeTabId && tab.noteId === noteId)) {
            pane.activeTabId = pane.tabs[0]?.id || null;
          }
        });
        state.panes = state.panes.filter(pane => pane.tabs.length > 0);
      });
    },

    // 文件树定位（暂时仅更新选中项；如需滚动到视图，由组件侧处理）
    revealInExplorer: (noteId: string) => {
      set((state) => {
        if (state.notes[noteId]) {
          state.selectedFileId = noteId;
          // 可在此扩展：根据 note.folder 展开父级文件夹
        }
      });
    },

    // 重写 openNoteInTab 使用正确的标题
    openNoteInTab: (noteId: string, paneId?: string) => {
      get().openNoteInTabWithTitle(noteId, paneId);
    },

    // 重写 renameNote 同时更新标签页
    renameNote: (noteId: string, newTitle: string) => {
      get().renameNoteAndUpdateTabs(noteId, newTitle);
      // 重命名会影响未链接提及
      setTimeout(() => get().calculateAndUpdateUnlinkedMentions(), 100);
    },

    // 重写 deleteNote 同时关闭标签页
    deleteNote: (noteId: string) => {
      get().deleteNoteAndCloseTabs(noteId);
      // 删除笔记会影响未链接提及
      setTimeout(() => get().calculateAndUpdateUnlinkedMentions(), 100);
    },

    // FileTree Actions 实现
    addNode: (node) => set((state) => {
      state.nodes[node.id] = node;
      
      // 更新父文件夹的子节点数
      if (node.parentPath) {
        const parentId = Object.keys(state.nodes).find(id => state.nodes[id].path === node.parentPath);
        if (parentId && state.nodes[parentId].type === 'folder') {
          const parent = state.nodes[parentId] as FolderNode;
          parent.childCount = (parent.childCount || 0) + 1;
        }
      }
    }),

    updateNode: (nodeId, updates) => set((state) => {
      if (state.nodes[nodeId]) {
        Object.assign(state.nodes[nodeId], updates);
      }
    }),

    deleteNode: (nodeId) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      
      // 如果是文件夹，递归删除所有子节点
      if (node.type === 'folder') {
        const childNodes = Object.values(state.nodes).filter(n => n.parentPath === node.path);
        childNodes.forEach(child => {
          delete state.nodes[child.id];
        });
      }
      
      // 删除节点
      delete state.nodes[nodeId];
      
      // 清理相关状态
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null;
      }
    }),

    moveNode: (nodeId, newParentPath) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      
      const oldPath = node.path;
      const newPath = `${newParentPath}/${node.name}`;
      
      node.parentPath = newParentPath;
      node.path = newPath;
      
      // 如果是文件夹，递归更新所有子节点路径
      if (node.type === 'folder') {
        const updateChildPaths = (parentPath: string, newParentPath: string) => {
          Object.values(state.nodes).forEach(child => {
            if (child.parentPath === parentPath) {
              child.parentPath = newParentPath;
              child.path = `${newParentPath}/${child.name}`;
              
              if (child.type === 'folder') {
                updateChildPaths(parentPath + '/' + child.name, child.path);
              }
            }
          });
        };
        updateChildPaths(oldPath, newPath);
      }
    }),

    // 文件夹操作
    toggleFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        const folderNode = folder as FolderNode;
        if (state.expandedFolders.has(folder.path)) {
          state.expandedFolders.delete(folder.path);
          folderNode.isExpanded = false;
        } else {
          state.expandedFolders.add(folder.path);
          folderNode.isExpanded = true;
        }
      }
    }),

    expandFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        state.expandedFolders.add(folder.path);
        (folder as FolderNode).isExpanded = true;
      }
    }),

    collapseFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        state.expandedFolders.delete(folder.path);
        (folder as FolderNode).isExpanded = false;
      }
    }),

    expandAllFolders: () => set((state) => {
      Object.values(state.nodes).forEach(node => {
        if (node.type === 'folder') {
          state.expandedFolders.add(node.path);
          (node as FolderNode).isExpanded = true;
        }
      });
    }),

    collapseAllFolders: () => set((state) => {
      state.expandedFolders.clear();
      Object.values(state.nodes).forEach(node => {
        if (node.type === 'folder') {
          (node as FolderNode).isExpanded = false;
        }
      });
    }),

    // 选择操作
    selectNode: (nodeId) => set((state) => {
      // 清除之前的选中状态
      if (state.selectedNodeId && state.nodes[state.selectedNodeId]) {
        state.nodes[state.selectedNodeId].isSelected = false;
      }
      
      // 设置新的选中状态
      state.selectedNodeId = nodeId;
      if (nodeId && state.nodes[nodeId]) {
        state.nodes[nodeId].isSelected = true;
      }
    }),

    // 拖拽操作
    startDrag: (node) => set((state) => {
      state.draggedNode = node;
      if (node.type === 'file') {
        (node as FileNode).isDragging = true;
      }
    }),

    endDrag: () => set((state) => {
      if (state.draggedNode?.type === 'file') {
        (state.draggedNode as FileNode).isDragging = false;
      }
      state.draggedNode = null;
      state.dragOverNodeId = null;
      
      // 清除所有拖拽悬停状态
      Object.values(state.nodes).forEach(node => {
        if (node.type === 'folder') {
          (node as FolderNode).isDragOver = false;
        }
      });
    }),

    setDragOver: (nodeId) => set((state) => {
      // 清除之前的拖拽悬停状态
      if (state.dragOverNodeId && state.nodes[state.dragOverNodeId]) {
        const prevNode = state.nodes[state.dragOverNodeId];
        if (prevNode.type === 'folder') {
          (prevNode as FolderNode).isDragOver = false;
        }
      }
      
      // 设置新的拖拽悬停状态
      state.dragOverNodeId = nodeId;
      if (nodeId && state.nodes[nodeId]) {
        const node = state.nodes[nodeId];
        if (node.type === 'folder') {
          (node as FolderNode).isDragOver = true;
        }
      }
    }),

    handleDrop: (targetNodeId, dragData) => {
      const state = get();
      const targetNode = state.nodes[targetNodeId];
      
      if (!targetNode || !dragData.node) return;
      
      if (dragData.type === 'move') {
        // 移动节点
        if (targetNode.type === 'folder') {
          state.moveNode(dragData.node.id, targetNode.path);
        }
      }
      
      state.endDrag();
    },

    // 重命名操作
    startRename: (nodeId) => set((state) => {
      state.renamingNodeId = nodeId;
    }),

    endRename: () => set((state) => {
      state.renamingNodeId = null;
    }),

    commitRename: (nodeId, newName) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node || !newName.trim()) return;
      
      const oldPath = node.path;
      
      // 更新节点名称和路径
      node.name = newName.trim();
      node.path = `${node.parentPath}/${newName.trim()}`;
      
      // 如果是文件夹，更新所有子节点的路径
      if (node.type === 'folder') {
        const updateChildPaths = (oldParentPath: string, newParentPath: string) => {
          Object.values(state.nodes).forEach(child => {
            if (child.parentPath === oldParentPath) {
              child.parentPath = newParentPath;
              child.path = `${newParentPath}/${child.name}`;
              
              if (child.type === 'folder') {
                updateChildPaths(oldParentPath + '/' + child.name, child.path);
              }
            }
          });
        };
        updateChildPaths(oldPath, node.path);
        
        // 更新展开状态
        if (state.expandedFolders.has(oldPath)) {
          state.expandedFolders.delete(oldPath);
          state.expandedFolders.add(node.path);
        }
      }
      
      state.renamingNodeId = null;
    }),

    // 搜索操作
    setSearchQuery: (query) => set((state) => {
      state.searchQuery = query;
      get().updateFilteredNodes();
    }),

    updateFilteredNodes: () => set((state) => {
      state.filteredNodeIds.clear();
      
      if (!state.searchQuery.trim()) return;
      
      const query = state.searchQuery.toLowerCase();
      Object.values(state.nodes).forEach(node => {
        if (node.name.toLowerCase().includes(query)) {
          state.filteredNodeIds.add(node.id);
          
          // 确保父文件夹也被包含
          let parentPath = node.parentPath;
          while (parentPath) {
            const parentNode = Object.values(state.nodes).find(n => n.path === parentPath);
            if (parentNode) {
              state.filteredNodeIds.add(parentNode.id);
              parentPath = parentNode.parentPath;
            } else {
              break;
            }
          }
        }
      });
    }),

    // 批量操作
    createFileInFolder: (parentPath, fileName, fileType = 'markdown') => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile: FileNode = {
        id: fileId,
        name: fileName,
        type: 'file',
        fileType,
        path: `${parentPath}/${fileName}`,
        parentPath,
        content: ''
      };
      
      get().addNode(newFile);
      return fileId;
    },

    createFolder: (parentPath, folderName) => {
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFolder: FolderNode = {
        id: folderId,
        name: folderName,
        type: 'folder',
        path: `${parentPath}/${folderName}`,
        parentPath,
        isExpanded: false,
        childCount: 0
      };
      
      get().addNode(newFolder);
      return folderId;
    },

    deleteFolder: (folderPath) => {
      const folder = Object.values(get().nodes).find(n => n.path === folderPath && n.type === 'folder');
      if (folder) {
        get().deleteNode(folder.id);
      }
    },

    // 未链接提及更新
    updateUnlinkedMentions: (counts) => set((state) => {
      Object.entries(counts).forEach(([fileId, count]) => {
        const node = state.nodes[fileId];
        if (node && node.type === 'file') {
          (node as FileNode).unlinkedMentions = count;
        }
      });
    }),

    // 工具方法
    getNodeByPath: (path) => {
      return Object.values(get().nodes).find(n => n.path === path);
    },

    getChildNodes: (parentPath) => {
      return Object.values(get().nodes)
        .filter(n => n.parentPath === parentPath)
        .sort((a, b) => {
          // 文件夹在前，文件在后
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          // 同类型按名称排序
          return a.name.localeCompare(b.name);
        });
    },

    getAncestorPaths: (path) => {
      const ancestors: string[] = [];
      let currentPath = path;
      
      while (currentPath && currentPath !== '/') {
        const node = get().getNodeByPath(currentPath);
        if (node?.parentPath) {
          ancestors.unshift(node.parentPath);
          currentPath = node.parentPath;
        } else {
          break;
        }
      }
      
      return ancestors;
    },

    isPathVisible: (path) => {
      const state = get();
      const ancestors = state.getAncestorPaths(path);
      
      // 检查所有祖先文件夹是否都展开
      return ancestors.every(ancestorPath => state.expandedFolders.has(ancestorPath));
    },

    // 文件树与笔记同步方法
    syncFileTreeWithNotes: () => {
      // 先计算未链接提及
      const counts = unlinkedMentionsCalculator.calculate(get().notes);
      
      set((state) => {
        // 清空现有节点
        state.nodes = {};
        
        // 创建根文件夹
        const workspaceFolder: FolderNode = {
          id: 'folder-workspace',
          name: '工作区',
          type: 'folder',
          path: '/workspace',
          parentPath: '/',
          isExpanded: state.expandedFolders.has('/workspace'),
          childCount: 0
        };
        state.nodes[workspaceFolder.id] = workspaceFolder;
        
        // 创建子文件夹
        const notesFolder: FolderNode = {
          id: 'folder-notes',
          name: '笔记',
          type: 'folder',
          path: '/workspace/笔记',
          parentPath: '/workspace',
          isExpanded: state.expandedFolders.has('/workspace/笔记'),
          childCount: 0
        };
        state.nodes[notesFolder.id] = notesFolder;
        
        const draftFolder: FolderNode = {
          id: 'folder-drafts',
          name: '草稿',
          type: 'folder',
          path: '/workspace/草稿',
          parentPath: '/workspace',
          isExpanded: state.expandedFolders.has('/workspace/草稿'),
          childCount: 0
        };
        state.nodes[draftFolder.id] = draftFolder;
        
        // 更新工作区文件夹的子节点数
        workspaceFolder.childCount = 2;
        
        // 将笔记转换为文件节点
        Object.values(state.notes).forEach(note => {
          const fileNode: FileNode = {
            id: note.id,
            name: note.title,
            type: 'file',
            fileType: note.fileType || 'markdown',
            path: `${note.folder || '/workspace/笔记'}/${note.title}`,
            parentPath: note.folder || '/workspace/笔记',
            content: note.content,
            unlinkedMentions: counts[note.id] || 0
          };
          
          state.nodes[fileNode.id] = fileNode;
          
          // 更新父文件夹的子节点数
          if (fileNode.parentPath === '/workspace/笔记') {
            notesFolder.childCount!++;
          } else if (fileNode.parentPath === '/workspace/草稿') {
            draftFolder.childCount!++;
          }
        });
      });
    },

    // 从存储加载状态
    loadStateFromStorage: () => {
      const notes = storage.loadNotes();
      const editorState = storage.loadEditorState();
      const fileTreeState = storage.loadFileTreeState();
      
      if (notes) {
        set((state) => {
          state.notes = notes;
        });
      }
      
      if (editorState) {
        set((state) => {
          state.panes = editorState.panes;
          state.activePaneId = editorState.activePaneId;
        });
      }
      
      if (fileTreeState) {
        set((state) => {
          state.expandedFolders = new Set(fileTreeState.expandedFolders);
          state.selectedNodeId = fileTreeState.selectedFileId;
        });
      }
      
      // 同步文件树
      get().syncFileTreeWithNotes();
    },

    // 保存状态到存储
    saveStateToStorage: () => {
      const state = get();
      
      storage.saveNotes(state.notes);
      storage.saveEditorState({
        panes: state.panes,
        activePaneId: state.activePaneId,
        openFiles: state.panes.flatMap(p => p.tabs.map(t => t.noteId)),
        recentFiles: [],
        filePositions: {}
      });
      storage.saveFileTreeState({
        expandedFolders: Array.from(state.expandedFolders),
        selectedFileId: state.selectedNodeId,
        folderStructure: []
      });
    },

    // 计算并更新未链接提及
    calculateAndUpdateUnlinkedMentions: () => {
      const state = get();
      const counts = unlinkedMentionsCalculator.calculate(state.notes);
      state.updateUnlinkedMentions(counts);
    }
  }))
);

// 初始化时加载存储的状态
useAppStore.getState().loadStateFromStorage();

// 设置自动保存
storage.setupAutoSave(
  () => useAppStore.getState().notes,
  () => ({
    panes: useAppStore.getState().panes,
    activePaneId: useAppStore.getState().activePaneId,
    openFiles: useAppStore.getState().panes.flatMap(p => p.tabs.map(t => t.noteId)),
    recentFiles: [],
    filePositions: {}
  }),
  () => ({
    expandedFolders: Array.from(useAppStore.getState().expandedFolders),
    selectedFileId: useAppStore.getState().selectedNodeId,
    folderStructure: []
  })
);

// 主题切换时更新 HTML class
useAppStore.subscribe((state) => {
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  // 设置多主题 data 属性
  document.documentElement.setAttribute('data-theme', state.theme || 'obsidian');
  try {
    localStorage.setItem('app-theme', state.theme || 'obsidian');
    localStorage.setItem('app-dark', state.isDarkMode ? '1' : '0');
  } catch {}
});

// 导出类型
export type { Note } from './notesStore';
export type { Tab, Pane, EditorFile } from './editorStore';
export type { TreeNode, FileNode, FolderNode } from './fileTreeStore';
export type { UIState, UIActions } from './uiStore';
export type { NotesState, NotesActions } from './notesStore';
export type { EditorState, EditorActions } from './editorStore';
export type { FileTreeState, FileTreeActions } from './fileTreeStore';
