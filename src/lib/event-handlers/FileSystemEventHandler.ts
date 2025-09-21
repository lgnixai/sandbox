import { 
  Event,
  FileNodeCreatedEvent,
  FileNodeDeletedEvent,
  FileNodeRenamedEvent,
  FileNodeMovedEvent,
  FolderNodeCreatedEvent,
  FolderNodeDeletedEvent,
  FolderExpandedEvent,
  FolderCollapsedEvent,
  NodeSelectedEvent,
  DropEvent,
  NoteCreatedEvent,
  NoteDeletedEvent,
  NoteRenamedEvent
} from '@/types/events';
import { eventBus } from '@/lib/event-bus';
import { documentApi } from '@/lib/api/documentApi';
import type { AppState, AppActions } from '@/stores';

/**
 * 文件系统事件处理器
 * 处理文件和文件夹相关的所有事件
 */
export class FileSystemEventHandler {
  private subscriptionIds: string[] = [];
  private getStore: () => AppState & AppActions;

  constructor(getStore: () => AppState & AppActions) {
    this.getStore = getStore;
    this.initialize();
  }

  private initialize() {
    // 注册所有文件系统相关事件的处理器
    this.registerEventHandlers();
  }

  private registerEventHandlers() {
    // 文件节点事件处理
    this.subscriptionIds.push(
      eventBus.subscribe(this.handleEvent.bind(this))
    );
  }

  private async handleEvent(event: Event) {
    try {
      switch (event.type) {
        // 文件节点事件
        case 'file.node.created':
          await this.handleFileNodeCreated(event as FileNodeCreatedEvent);
          break;
        case 'file.node.deleted':
          await this.handleFileNodeDeleted(event as FileNodeDeletedEvent);
          break;
        case 'file.node.renamed':
          await this.handleFileNodeRenamed(event as FileNodeRenamedEvent);
          break;
        case 'file.node.moved':
          await this.handleFileNodeMoved(event as FileNodeMovedEvent);
          break;
          
        // 文件夹节点事件
        case 'folder.node.created':
          await this.handleFolderNodeCreated(event as FolderNodeCreatedEvent);
          break;
        case 'folder.node.deleted':
          await this.handleFolderNodeDeleted(event as FolderNodeDeletedEvent);
          break;
          
        // 文件夹展开/折叠事件
        case 'folder.expanded':
          await this.handleFolderExpanded(event as FolderExpandedEvent);
          break;
        case 'folder.collapsed':
          await this.handleFolderCollapsed(event as FolderCollapsedEvent);
          break;
          
        // 节点选择事件
        case 'node.selected':
          await this.handleNodeSelected(event as NodeSelectedEvent);
          break;
          
        // 拖拽事件
        case 'drop':
          await this.handleDrop(event as DropEvent);
          break;
      }
    } catch (error) {
      console.error(`[FileSystemEventHandler] Error handling ${event.type}:`, error);
      // 发布错误事件
      eventBus.publish({
        type: 'error.occurred',
        error: error as Error,
        context: `FileSystemEventHandler.${event.type}`,
        component: 'FileSystemEventHandler'
      });
    }
  }

  /**
   * 处理文件节点创建事件
   */
  private async handleFileNodeCreated(event: FileNodeCreatedEvent) {
    const store = this.getStore();
    
    try {
      // 1. 调用后端API创建文档
      const response = await documentApi.createDocument({
        title: event.node.name,
        type: event.node.fileType === 'markdown' ? 'markdown' : 'text',
        content: event.node.content || '',
        parent_path: event.node.parentPath || '',
        is_directory: false
      });

      if (response.code === 0 && response.data) {
        // 2. 更新前端store中的节点ID为后端返回的ID
        const updatedNode = {
          ...event.node,
          id: `doc-${response.data.id}`, // 使用后端文档ID
          backendId: response.data.id // 保存后端ID引用
        };
        
        // 3. 更新文件树状态
        store.addNode(updatedNode);
        
        // 4. 创建对应的笔记数据
        const note = {
          id: updatedNode.id,
          title: updatedNode.name,
          content: updatedNode.content || '',
          links: [],
          backlinks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          fileType: updatedNode.fileType || 'markdown',
          folder: updatedNode.parentPath
        };
        
        // 5. 发布笔记创建事件
        eventBus.publish({
          type: 'note.created',
          note
        } as NoteCreatedEvent);
        
        console.log(`[FileSystemEventHandler] File node created: ${event.node.name}`);
      } else {
        console.error(`[FileSystemEventHandler] Failed to create document: ${response.message}`);
      }
    } catch (error) {
      console.error(`[FileSystemEventHandler] Error creating document:`, error);
      // 发布错误事件
      eventBus.publish({
        type: 'error.occurred',
        error: error as Error,
        context: 'FileSystemEventHandler.handleFileNodeCreated',
        component: 'FileSystemEventHandler'
      });
    }
  }

  /**
   * 处理文件节点删除事件
   */
  private async handleFileNodeDeleted(event: FileNodeDeletedEvent) {
    const store = this.getStore();
    
    try {
      // 获取节点信息以获取后端ID
      const node = store.nodes[event.nodeId];
      if (node && (node as any).backendId) {
        // 1. 调用后端API删除文档
        await documentApi.deleteDocument((node as any).backendId);
      }

      // 2. 删除文件树节点
      store.deleteNode(event.nodeId);
      
      // 3. 发布笔记删除事件
      eventBus.publish({
        type: 'note.deleted',
        noteId: event.nodeId,
        note: store.notes[event.nodeId]
      } as NoteDeletedEvent);
      
      // 4. 关闭相关的编辑器标签页
      store.panes.forEach(pane => {
        const tabsToClose = pane.tabs.filter(tab => tab.noteId === event.nodeId);
        tabsToClose.forEach(tab => {
          eventBus.publish({
            type: 'editor.tab.closed',
            noteId: event.nodeId
          });
        });
      });
      
      console.log(`[FileSystemEventHandler] File node deleted: ${event.nodeId}`);
    } catch (error) {
      console.error(`[FileSystemEventHandler] Error deleting document:`, error);
      // 发布错误事件
      eventBus.publish({
        type: 'error.occurred',
        error: error as Error,
        context: 'FileSystemEventHandler.handleFileNodeDeleted',
        component: 'FileSystemEventHandler'
      });
    }
  }

  /**
   * 处理文件节点重命名事件
   */
  private async handleFileNodeRenamed(event: FileNodeRenamedEvent) {
    const store = this.getStore();
    
    try {
      // 获取节点信息以获取后端ID
      const node = store.nodes[event.nodeId];
      if (node && (node as any).backendId) {
        // 1. 调用后端API重命名文档
        await documentApi.renameDocument((node as any).backendId, event.newName);
      }

      // 2. 更新文件树节点
      store.updateNode(event.nodeId, {
        name: event.newName,
        path: event.newPath
      });
      
      // 3. 发布笔记重命名事件
      eventBus.publish({
        type: 'note.renamed',
        noteId: event.nodeId,
        oldTitle: event.oldName,
        newTitle: event.newName
      } as NoteRenamedEvent);
      
      // 4. 更新相关编辑器标签页标题
      store.panes.forEach(pane => {
        pane.tabs.forEach(tab => {
          if (tab.noteId === event.nodeId) {
            eventBus.publish({
              type: 'editor.tab.renamed',
              noteId: event.nodeId,
              oldTitle: event.oldName,
              newTitle: event.newName
            });
          }
        });
      });
      
      console.log(`[FileSystemEventHandler] File node renamed: ${event.oldName} → ${event.newName}`);
    } catch (error) {
      console.error(`[FileSystemEventHandler] Error renaming document:`, error);
      // 发布错误事件
      eventBus.publish({
        type: 'error.occurred',
        error: error as Error,
        context: 'FileSystemEventHandler.handleFileNodeRenamed',
        component: 'FileSystemEventHandler'
      });
    }
  }

  /**
   * 处理文件节点移动事件
   */
  private async handleFileNodeMoved(event: FileNodeMovedEvent) {
    const store = this.getStore();
    
    // 0. 如果有后端ID，先调用后端移动API
    try {
      const node = store.nodes[event.nodeId] as any;
      const backendId: number | undefined = node?.backendId || (typeof node?.id === 'string' && node.id.startsWith('backend-') ? parseInt(node.id.replace('backend-', ''), 10) : undefined);
      if (backendId) {
        const normalizedParentPath = event.newParentPath === '/workspace' ? '' : event.newParentPath.replace(/^\/workspace\//, '');
        await documentApi.moveDocument(backendId, normalizedParentPath);
      }
    } catch (err) {
      console.error('[FileSystemEventHandler] Error moving document in backend:', err);
    }

    // 1. 更新文件树节点路径
    store.moveNode(event.nodeId, event.newParentPath);
    
    // 2. 发布笔记移动事件
    eventBus.publish({
      type: 'note.moved',
      noteId: event.nodeId,
      oldFolder: event.oldParentPath,
      newFolder: event.newParentPath
    });
    
    console.log(`[FileSystemEventHandler] File node moved: ${event.oldPath} → ${event.newPath}`);
  }

  /**
   * 处理文件夹节点创建事件
   */
  private async handleFolderNodeCreated(event: FolderNodeCreatedEvent) {
    const store = this.getStore();
    
    try {
      const parentPath = event.node.parentPath === '/workspace' ? '' : event.node.parentPath.replace(/^\/workspace\//, '');
      const response = await documentApi.createDirectory({
        name: event.node.name,
        parent_path: parentPath
      });
      if (response.code === 0 && response.data) {
        const backendFolderId = `backend-${response.data.id}`;
        const backendFolder = {
          ...event.node,
          id: backendFolderId,
          backendId: response.data.id
        } as any;
        store.addNode(backendFolder);
      } else {
        // 回退到本地添加
        store.addNode(event.node);
      }
    } catch (err) {
      console.error('[FileSystemEventHandler] Error creating directory in backend:', err);
      store.addNode(event.node);
    }
    
    console.log(`[FileSystemEventHandler] Folder node created: ${event.node.name}`);
  }

  /**
   * 处理文件夹节点删除事件
   */
  private async handleFolderNodeDeleted(event: FolderNodeDeletedEvent) {
    const store = this.getStore();
    
    try {
      // 先尝试后端删除目录（如有后端ID或可从ID解析）
      const node = store.nodes[event.nodeId] as any;
      const backendId: number | undefined = node?.backendId || (typeof node?.id === 'string' && node.id.startsWith('backend-') ? parseInt(node.id.replace('backend-', ''), 10) : undefined);
      if (backendId) {
        await documentApi.deleteDocument(backendId);
      } else {
        // 后端ID未知，则逐个删除子文件和子目录（通过事件触发，以便后端删除）
        const childNodes = Object.values(store.nodes).filter(n => n.path.startsWith(event.node.path + '/') || n.parentPath === event.node.path);
        for (const child of childNodes) {
          if (child.type === 'file') {
            eventBus.publish({ type: 'file.node.deleted', nodeId: child.id, node: child } as FileNodeDeletedEvent);
          }
        }
      }
    } catch (err) {
      console.error('[FileSystemEventHandler] Error deleting directory in backend:', err);
    }

    // 最后删除前端节点
    store.deleteNode(event.nodeId);
    
    console.log(`[FileSystemEventHandler] Folder node deleted: ${event.node.name}`);
  }

  /**
   * 处理文件夹展开事件
   */
  private async handleFolderExpanded(event: FolderExpandedEvent) {
    const store = this.getStore();
    
    // 查找对应的文件夹节点
    const folderNode = Object.values(store.nodes).find(node => 
      node.path === event.folderPath && node.type === 'folder'
    );
    
    if (folderNode) {
      // 使用 store 的 action 方法来更新状态，而不是直接修改
      store.expandFolder(folderNode.id);
    }
    
    console.log(`[FileSystemEventHandler] Folder expanded: ${event.folderPath}`);
  }

  /**
   * 处理文件夹折叠事件
   */
  private async handleFolderCollapsed(event: FolderCollapsedEvent) {
    const store = this.getStore();
    
    // 查找对应的文件夹节点
    const folderNode = Object.values(store.nodes).find(node => 
      node.path === event.folderPath && node.type === 'folder'
    );
    
    if (folderNode) {
      // 使用 store 的 action 方法来更新状态，而不是直接修改
      store.collapseFolder(folderNode.id);
    }
    
    console.log(`[FileSystemEventHandler] Folder collapsed: ${event.folderPath}`);
  }

  /**
   * 处理节点选择事件
   */
  private async handleNodeSelected(event: NodeSelectedEvent) {
    const store = this.getStore();
    
    // 1. 更新文件树选中状态
    store.selectNode(event.nodeId);
    
    // 2. 如果选中的是文件节点，在编辑器中打开
    if (event.nodeId && store.nodes[event.nodeId]?.type === 'file') {
      const fileNode = store.nodes[event.nodeId];
      
      // 发布编辑器标签页打开事件
      eventBus.publish({
        type: 'editor.tab.opened',
        noteId: event.nodeId,
        openMode: 'preview'
      });
    }
    
    console.log(`[FileSystemEventHandler] Node selected: ${event.nodeId}`);
  }

  /**
   * 处理拖拽放置事件
   */
  private async handleDrop(event: DropEvent) {
    const store = this.getStore();
    const targetNode = store.nodes[event.targetNodeId];
    
    if (!targetNode || !event.dragData.node) {
      return;
    }
    
    if (event.dragData.type === 'move' && targetNode.type === 'folder') {
      // 发布文件移动事件
      eventBus.publish({
        type: 'file.node.moved',
        nodeId: event.dragData.node.id,
        oldParentPath: event.dragData.node.parentPath,
        newParentPath: targetNode.path,
        oldPath: event.dragData.node.path,
        newPath: `${targetNode.path}/${event.dragData.node.name}`
      } as FileNodeMovedEvent);
    }
    
    console.log(`[FileSystemEventHandler] Drop handled: ${event.dragData.node.name} → ${targetNode.name}`);
  }

  /**
   * 清理资源
   */
  public destroy() {
    this.subscriptionIds.forEach(id => {
      eventBus.unsubscribe(id);
    });
    this.subscriptionIds = [];
  }
}
