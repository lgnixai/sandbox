import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Tab {
  id: string;
  noteId: string;
  title: string;
  isDirty: boolean;
}

export interface Pane {
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
}

export interface EditorFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  content?: string;
  folder?: string;
}

export interface EditorState {
  panes: Pane[];
  activePaneId: string | null;
  
  // 编辑器回调函数 - 用于与其他组件通信
  editorCallbacks: {
    onFileSelect?: (file: EditorFile, options?: { openMode?: 'preview' | 'pinned' }) => void;
    onCreateFile?: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
  };
}

export interface EditorActions {
  // 标签页操作
  openNoteInTab: (noteId: string, paneId?: string) => void;
  closeTab: (tabId: string, paneId: string) => void;
  setActiveTab: (tabId: string, paneId: string) => void;
  
  // 面板操作
  createPane: (pane: Pane, direction?: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;
  splitTab: (tabId: string, paneId: string, direction: 'horizontal' | 'vertical') => void;
  
  // 编辑器回调操作
  setEditorCallbacks: (callbacks: {
    onFileSelect?: (file: EditorFile, options?: { openMode?: 'preview' | 'pinned' }) => void;
    onCreateFile?: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
  }) => void;
  
  // 便捷方法 - 需要访问 notes store
  selectFileInEditor: (noteId: string, options?: { openMode?: 'preview' | 'pinned' }) => void;
  createFileInEditor: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
}

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    // 初始状态
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

    // Actions
    openNoteInTab: (noteId, paneId) => set((state) => {
      const targetPaneId = paneId || state.activePaneId || 'main-pane';
      const targetPane = state.panes.find(p => p.id === targetPaneId);
      if (!targetPane) return;

      // 检查是否已经打开了这个笔记
      const existingTab = targetPane.tabs.find(tab => tab.noteId === noteId);
      if (existingTab) {
        targetPane.activeTabId = existingTab.id;
        return;
      }

      // 创建新标签页
      const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 这里需要从 notes store 获取笔记信息
      // 暂时使用 noteId 作为 title，实际使用时会通过组合 store 来获取
      targetPane.tabs.push({
        id: newTabId,
        noteId: noteId,
        title: noteId, // 这里会在组合 store 中正确设置
        isDirty: false
      });
      targetPane.activeTabId = newTabId;
    }),

    closeTab: (tabId, paneId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (!pane) return;

      // 如果只有一个标签页，创建一个新的"新标签页"而不是完全关闭
      if (pane.tabs.length === 1) {
        const newTabId = `new-tab-${Date.now()}`;
        pane.tabs = [{
          id: newTabId,
          noteId: 'new-tab-page',
          title: '新标签页',
          isDirty: false
        }];
        pane.activeTabId = newTabId;
        return;
      }

      pane.tabs = pane.tabs.filter(tab => tab.id !== tabId);
      if (pane.activeTabId === tabId) {
        pane.activeTabId = pane.tabs[0]?.id || null;
      }

      // 当面板中没有标签页时，创建一个新标签页
      if (pane.tabs.length === 0) {
        const newTabId = `new-tab-${Date.now()}`;
        pane.tabs = [{
          id: newTabId,
          noteId: 'new-tab-page',
          title: '新标签页',
          isDirty: false
        }];
        pane.activeTabId = newTabId;
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
      const newPane: Pane = {
        id: newPaneId,
        tabs: [{ ...sourceTab, id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }],
        activeTabId: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      newPane.activeTabId = newPane.tabs[0].id;
      state.panes.push(newPane);
      state.activePaneId = newPaneId;
    }),

    setEditorCallbacks: (callbacks) => set((state) => {
      state.editorCallbacks = callbacks;
    }),

    // 这些便捷方法会在组合 store 中重新实现
    selectFileInEditor: (noteId, options) => {
      const state = get();
      if (state.editorCallbacks.onFileSelect) {
        // 这里需要从 notes store 获取笔记信息
        // 在组合 store 中会正确实现
        console.log('selectFileInEditor:', noteId, options);
      }
    },

    createFileInEditor: (type, folder) => {
      const state = get();
      if (state.editorCallbacks.onCreateFile) {
        state.editorCallbacks.onCreateFile(type, folder);
      }
    }
  }))
);
