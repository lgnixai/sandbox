import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { EditorTab, EditorPane } from './types';
import { v4 as uuidv4 } from 'uuid';

interface EditorState {
  // 编辑器面板
  panes: EditorPane[];
  activePaneId: string | null;
  
  // 编辑模式
  editorMode: 'edit' | 'preview' | 'split';
  
  // 拖拽状态
  draggingTab: EditorTab | null;
  dragOverPaneId: string | null;
}

interface EditorActions {
  // 面板操作
  createPane: () => string;
  deletePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
  
  // 标签页操作
  openFile: (fileId: string, title: string, paneId?: string) => void;
  closeTab: (tabId: string, paneId: string) => void;
  setActiveTab: (tabId: string, paneId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabClean: (tabId: string) => void;
  moveTab: (tabId: string, fromPaneId: string, toPaneId: string, index?: number) => void;
  
  // 编辑模式
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void;
  
  // 拖拽操作
  startDragTab: (tab: EditorTab) => void;
  endDragTab: () => void;
  setDragOverPane: (paneId: string | null) => void;
  
  // 工具方法
  getActiveTab: () => EditorTab | null;
  getTabByFileId: (fileId: string) => EditorTab | null;
  isFileOpen: (fileId: string) => boolean;
}

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    // 初始状态
    panes: [{
      id: 'main',
      tabs: [],
      activeTabId: null
    }],
    activePaneId: 'main',
    editorMode: 'edit',
    draggingTab: null,
    dragOverPaneId: null,

    // 面板操作
    createPane: () => {
      const paneId = uuidv4();
      
      set((state) => {
        state.panes.push({
          id: paneId,
          tabs: [],
          activeTabId: null
        });
      });
      
      return paneId;
    },

    deletePane: (paneId: string) => {
      set((state) => {
        const index = state.panes.findIndex(p => p.id === paneId);
        if (index === -1 || state.panes.length === 1) return;
        
        state.panes.splice(index, 1);
        
        // 如果删除的是活跃面板，切换到第一个面板
        if (state.activePaneId === paneId) {
          state.activePaneId = state.panes[0].id;
        }
      });
    },

    setActivePane: (paneId: string) => {
      set((state) => {
        state.activePaneId = paneId;
      });
    },

    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => {
      const newPaneId = get().createPane();
      // TODO: 实现面板布局管理
      console.log('Split pane:', paneId, direction, newPaneId);
    },

    // 标签页操作
    openFile: (fileId: string, title: string, paneId?: string) => {
      const targetPaneId = paneId || get().activePaneId || 'main';
      
      // 检查文件是否已打开
      const existingTab = get().getTabByFileId(fileId);
      if (existingTab) {
        // 切换到已存在的标签
        const pane = get().panes.find(p => 
          p.tabs.some(t => t.id === existingTab.id)
        );
        if (pane) {
          get().setActiveTab(existingTab.id, pane.id);
          get().setActivePane(pane.id);
        }
        return;
      }
      
      // 创建新标签
      const tabId = uuidv4();
      const newTab: EditorTab = {
        id: tabId,
        fileId,
        title,
        isDirty: false
      };
      
      set((state) => {
        const pane = state.panes.find(p => p.id === targetPaneId);
        if (pane) {
          pane.tabs.push(newTab);
          pane.activeTabId = tabId;
          state.activePaneId = targetPaneId;
        }
      });
    },

    closeTab: (tabId: string, paneId: string) => {
      set((state) => {
        const pane = state.panes.find(p => p.id === paneId);
        if (!pane) return;
        
        const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        // 如果是活跃标签，切换到相邻标签
        if (pane.activeTabId === tabId) {
          const newIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          pane.activeTabId = pane.tabs[newIndex]?.id || null;
        }
        
        pane.tabs.splice(tabIndex, 1);
      });
    },

    setActiveTab: (tabId: string, paneId: string) => {
      set((state) => {
        const pane = state.panes.find(p => p.id === paneId);
        if (pane) {
          pane.activeTabId = tabId;
        }
      });
    },

    updateTabContent: (tabId: string, content: string) => {
      set((state) => {
        for (const pane of state.panes) {
          const tab = pane.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.content = content;
            tab.isDirty = true;
            break;
          }
        }
      });
    },

    markTabClean: (tabId: string) => {
      set((state) => {
        for (const pane of state.panes) {
          const tab = pane.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.isDirty = false;
            tab.content = undefined;
            break;
          }
        }
      });
    },

    moveTab: (tabId: string, fromPaneId: string, toPaneId: string, index?: number) => {
      set((state) => {
        const fromPane = state.panes.find(p => p.id === fromPaneId);
        const toPane = state.panes.find(p => p.id === toPaneId);
        
        if (!fromPane || !toPane) return;
        
        const tabIndex = fromPane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        // 移除标签
        const [tab] = fromPane.tabs.splice(tabIndex, 1);
        
        // 更新原面板的活跃标签
        if (fromPane.activeTabId === tabId) {
          fromPane.activeTabId = fromPane.tabs[0]?.id || null;
        }
        
        // 插入到目标面板
        if (index !== undefined && index >= 0 && index <= toPane.tabs.length) {
          toPane.tabs.splice(index, 0, tab);
        } else {
          toPane.tabs.push(tab);
        }
        
        // 设置为目标面板的活跃标签
        toPane.activeTabId = tabId;
        state.activePaneId = toPaneId;
      });
    },

    // 编辑模式
    setEditorMode: (mode: 'edit' | 'preview' | 'split') => {
      set((state) => {
        state.editorMode = mode;
      });
    },

    // 拖拽操作
    startDragTab: (tab: EditorTab) => {
      set((state) => {
        state.draggingTab = tab;
      });
    },

    endDragTab: () => {
      set((state) => {
        state.draggingTab = null;
        state.dragOverPaneId = null;
      });
    },

    setDragOverPane: (paneId: string | null) => {
      set((state) => {
        state.dragOverPaneId = paneId;
      });
    },

    // 工具方法
    getActiveTab: () => {
      const state = get();
      const activePane = state.panes.find(p => p.id === state.activePaneId);
      if (!activePane || !activePane.activeTabId) return null;
      
      return activePane.tabs.find(t => t.id === activePane.activeTabId) || null;
    },

    getTabByFileId: (fileId: string) => {
      const state = get();
      for (const pane of state.panes) {
        const tab = pane.tabs.find(t => t.fileId === fileId);
        if (tab) return tab;
      }
      return null;
    },

    isFileOpen: (fileId: string) => {
      return get().getTabByFileId(fileId) !== null;
    }
  }))
);