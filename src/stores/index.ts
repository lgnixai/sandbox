import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { type UIState, type UIActions } from './uiStore';
import { type NotesState, type NotesActions } from './notesStore';
import { type EditorState, type EditorActions, type EditorFile } from './editorStore';

// 启用 Immer 的 MapSet 插件
enableMapSet();

// 组合所有 store 的状态和 actions
export type AppState = UIState & NotesState & EditorState;
export type AppActions = UIActions & NotesActions & EditorActions & {
  // 跨 store 的便捷方法
  selectFileInEditor: (noteId: string, options?: { openMode?: 'preview' | 'pinned' }) => void;
  createFileInEditor: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
  openNoteInTabWithTitle: (noteId: string, paneId?: string) => void;
  renameNoteAndUpdateTabs: (noteId: string, newTitle: string) => void;
  deleteNoteAndCloseTabs: (noteId: string) => void;
  revealInExplorer: (noteId: string) => void;
};

// 创建组合 store
export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // 直接定义初始状态，而不是从子 stores 获取
    // UI 状态
    isDarkMode: false,
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

## 快捷键

- \`Ctrl/Cmd + P\`: 打开命令面板
- \`Ctrl/Cmd + N\`: 新建笔记
- \`Ctrl/Cmd + O\`: 打开笔记

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

这有助于发现知识之间的联系。`,
        links: ['欢迎', 'Markdown编辑'],
        backlinks: ['欢迎', 'Markdown编辑'],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      }
    },
    expandedFolders: new Set(['/workspace', '/workspace/笔记']),
    selectedFileId: null,

    // Editor 状态
    panes: [
      {
        id: 'main-pane',
        tabs: [
          {
            id: 'welcome-tab',
            noteId: 'welcome',
            title: '欢迎',
            isDirty: false
          }
        ],
        activeTabId: 'welcome-tab'
      }
    ],
    activePaneId: 'main-pane',
    editorCallbacks: {},

    // 直接实现所有 actions
    // UI Actions
    toggleTheme: () => set((state) => {
      state.isDarkMode = !state.isDarkMode;
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
    addNote: (note) => set((state) => {
      state.notes[note.id] = note;
    }),
    updateNote: (noteId, updates) => set((state) => {
      if (state.notes[noteId]) {
        Object.assign(state.notes[noteId], updates, { updatedAt: new Date() });
      }
    }),
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
    createFolder: (_path, _name) => set((_state) => {
      // 文件夹创建逻辑
    }),
    renameFolder: (_oldPath, _newName) => set((_state) => {
      // 文件夹重命名逻辑
    }),
    deleteFolder: (_path) => set((_state) => {
      // 文件夹删除逻辑
    }),
    toggleFolder: (path) => set((state) => {
      if (state.expandedFolders.has(path)) {
        state.expandedFolders.delete(path);
      } else {
        state.expandedFolders.add(path);
      }
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
      if (note && state.editorCallbacks.onFileSelect) {
        const editorFile: EditorFile = {
          id: note.id,
          name: note.title,
          type: 'file',
          fileType: note.fileType || 'markdown',
          path: `/${note.title}`,
          content: note.content
        };
        state.editorCallbacks.onFileSelect(editorFile, options);
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
    },

    // 重写 deleteNote 同时关闭标签页
    deleteNote: (noteId: string) => {
      get().deleteNoteAndCloseTabs(noteId);
    }
  }))
);

// 主题切换时更新 HTML class
useAppStore.subscribe((state) => {
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});

// 导出类型
export type { Note } from './notesStore';
export type { Tab, Pane, EditorFile } from './editorStore';
export type { UIState, UIActions } from './uiStore';
export type { NotesState, NotesActions } from './notesStore';
export type { EditorState, EditorActions } from './editorStore';
