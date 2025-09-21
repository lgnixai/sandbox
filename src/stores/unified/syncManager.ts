import { useFileSystemStore } from './fileSystemStore';
import { useNoteStore } from './noteStore';
import { useTagStore } from './tagStore';
import { useEditorStore } from './editorStore';
import { wsManager } from './index';
import { WSEventType } from './types';
import { debounce } from 'lodash-es';

class SyncManager {
  private initialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private pendingUpdates = new Map<string, any>();

  // 初始化同步管理器
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing sync manager...');

    // 连接 WebSocket
    wsManager.connect();

    // 加载初始数据
    await this.loadInitialData();

    // 设置自动保存
    this.setupAutoSave();

    // 设置定期同步
    this.setupPeriodicSync();

    this.initialized = true;
    console.log('Sync manager initialized');
  }

  // 加载初始数据
  private async loadInitialData() {
    try {
      // 并行加载所有数据
      await Promise.all([
        useFileSystemStore.getState().loadTree(),
        useTagStore.getState().loadTags()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  // 设置自动保存
  private setupAutoSave() {
    // 监听编辑器内容变化
    const debouncedSave = debounce(async (tabId: string, content: string) => {
      const editorStore = useEditorStore.getState();
      const tab = editorStore.panes
        .flatMap(p => p.tabs)
        .find(t => t.id === tabId);

      if (!tab) return;

      try {
        // 保存到后端
        await useNoteStore.getState().saveNoteContent(tab.fileId, content);
        
        // 标记标签页为已保存
        editorStore.markTabClean(tabId);

        // 同步标签
        await useTagStore.getState().syncFileTags(tab.fileId, content);
      } catch (error) {
        console.error('Failed to save content:', error);
      }
    }, 1000); // 1秒防抖

    // 订阅编辑器状态变化
    useEditorStore.subscribe((state, prevState) => {
      // 检查是否有内容变化
      state.panes.forEach(pane => {
        pane.tabs.forEach(tab => {
          if (tab.isDirty && tab.content !== undefined) {
            debouncedSave(tab.id, tab.content);
          }
        });
      });
    });
  }

  // 设置定期同步
  private setupPeriodicSync() {
    // 每5分钟同步一次
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, 5 * 60 * 1000);
  }

  // 执行同步
  private async performSync() {
    console.log('Performing sync...');

    try {
      // 刷新文件树
      await useFileSystemStore.getState().loadTree();

      // 刷新标签
      await useTagStore.getState().loadTags();

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // 处理文件变化
  async handleFileChange(path: string, changeType: 'created' | 'updated' | 'deleted') {
    const fileSystemStore = useFileSystemStore.getState();
    const noteStore = useNoteStore.getState();
    const editorStore = useEditorStore.getState();

    switch (changeType) {
      case 'created':
      case 'updated':
        // 刷新文件节点
        await fileSystemStore.refreshNode(path);
        
        // 如果是打开的笔记，重新加载内容
        const node = fileSystemStore.getNodeByPath(path);
        if (node && node.fileType === 'markdown') {
          const openTab = editorStore.getTabByFileId(node.id);
          if (openTab && !openTab.isDirty) {
            await noteStore.loadNote(path);
          }
        }
        break;

      case 'deleted':
        // 刷新文件树
        await fileSystemStore.loadTree();
        
        // 关闭相关标签页
        const deletedNode = fileSystemStore.getNodeByPath(path);
        if (deletedNode) {
          editorStore.panes.forEach(pane => {
            const tab = pane.tabs.find(t => t.fileId === deletedNode.id);
            if (tab) {
              editorStore.closeTab(tab.id, pane.id);
            }
          });
        }
        break;
    }
  }

  // 处理标签变化
  async handleTagChange(tagId: string, changeType: 'created' | 'updated' | 'deleted') {
    // 简单地重新加载标签列表
    await useTagStore.getState().loadTags();
  }

  // 批量更新
  queueUpdate(type: string, id: string, data: any) {
    const key = `${type}:${id}`;
    this.pendingUpdates.set(key, data);

    // 延迟批量处理
    this.scheduleBatchUpdate();
  }

  private scheduleBatchUpdate = debounce(async () => {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    // 按类型分组
    const grouped = updates.reduce((acc, [key, data]) => {
      const [type] = key.split(':');
      if (!acc[type]) acc[type] = [];
      acc[type].push(data);
      return acc;
    }, {} as Record<string, any[]>);

    // 批量处理
    for (const [type, items] of Object.entries(grouped)) {
      try {
        switch (type) {
          case 'note':
            // TODO: 实现批量更新笔记
            break;
          case 'tag':
            // TODO: 实现批量更新标签
            break;
        }
      } catch (error) {
        console.error(`Failed to batch update ${type}:`, error);
      }
    }
  }, 500);

  // 清理
  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    wsManager.disconnect();
    this.initialized = false;
  }
}

export const syncManager = new SyncManager();