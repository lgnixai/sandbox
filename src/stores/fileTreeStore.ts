import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

enableMapSet();

// 文件树节点类型
export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  parentPath: string;
  content?: string;
  unlinkedMentions?: number; // 未链接提及数
  isSelected?: boolean;
  isDragging?: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  path: string;
  parentPath: string;
  isExpanded?: boolean;
  isSelected?: boolean;
  isDragOver?: boolean;
  childCount?: number;
}

export type TreeNode = FileNode | FolderNode;

// 拖拽数据类型
export interface DragData {
  node: TreeNode;
  type: 'move' | 'link';
}

// 文件树状态
export interface FileTreeState {
  // 文件和文件夹索引
  nodes: Record<string, TreeNode>;
  
  // 展开的文件夹集合
  expandedFolders: Set<string>;
  
  // 选中的节点ID
  selectedNodeId: string | null;
  
  // 拖拽状态
  draggedNode: TreeNode | null;
  dragOverNodeId: string | null;
  
  // 重命名状态
  renamingNodeId: string | null;
  
  // 文件搜索过滤
  searchQuery: string;
  filteredNodeIds: Set<string>;
}

// 文件树操作
export interface FileTreeActions {
  // 节点操作
  addNode: (node: TreeNode) => void;
  updateNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentPath: string) => void;
  
  // 文件夹操作
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
  
  // 选择操作
  selectNode: (nodeId: string | null) => void;
  
  // 拖拽操作
  startDrag: (node: TreeNode) => void;
  endDrag: () => void;
  setDragOver: (nodeId: string | null) => void;
  handleDrop: (targetNodeId: string, dragData: DragData) => void;
  
  // 重命名操作
  startRename: (nodeId: string) => void;
  endRename: () => void;
  commitRename: (nodeId: string, newName: string) => void;
  
  // 搜索操作
  setSearchQuery: (query: string) => void;
  updateFilteredNodes: () => void;
  
  // 批量操作
  createFileInFolder: (parentPath: string, fileName: string, fileType: FileNode['fileType']) => string;
  createFolder: (parentPath: string, folderName: string) => string;
  deleteFolder: (folderPath: string) => void;
  
  // 未链接提及更新
  updateUnlinkedMentions: (counts: Record<string, number>) => void;
  
  // 工具方法
  getNodeByPath: (path: string) => TreeNode | undefined;
  getChildNodes: (parentPath: string) => TreeNode[];
  getAncestorPaths: (path: string) => string[];
  isPathVisible: (path: string) => boolean;
}

export const useFileTreeStore = create<FileTreeState & FileTreeActions>()(
  immer((set, get) => ({
    // 初始状态
    nodes: {},
    expandedFolders: new Set(['/workspace']),
    selectedNodeId: null,
    draggedNode: null,
    dragOverNodeId: null,
    renamingNodeId: null,
    searchQuery: '',
    filteredNodeIds: new Set(),

    // 节点操作
    addNode: (node) => set((state) => {
      state.nodes[node.id] = node;
      
      // 更新父文件夹的子节点数
      if (node.parentPath && state.nodes[node.parentPath]) {
        const parentNode = state.nodes[node.parentPath] as FolderNode;
        parentNode.childCount = (parentNode.childCount || 0) + 1;
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
      
      // 更新父文件夹的子节点数
      if (node.parentPath && state.nodes[node.parentPath]) {
        const parentNode = state.nodes[node.parentPath] as FolderNode;
        parentNode.childCount = Math.max(0, (parentNode.childCount || 0) - 1);
      }
      
      // 删除节点
      delete state.nodes[nodeId];
      
      // 清理相关状态
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null;
      }
      if (state.renamingNodeId === nodeId) {
        state.renamingNodeId = null;
      }
    }),

    moveNode: (nodeId, newParentPath) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      
      const oldParentPath = node.parentPath;
      
      // 更新节点路径
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
      
      // 更新新旧父文件夹的子节点数
      if (oldParentPath && state.nodes[oldParentPath]) {
        const oldParent = state.nodes[oldParentPath] as FolderNode;
        oldParent.childCount = Math.max(0, (oldParent.childCount || 0) - 1);
      }
      if (newParentPath && state.nodes[newParentPath]) {
        const newParent = state.nodes[newParentPath] as FolderNode;
        newParent.childCount = (newParent.childCount || 0) + 1;
      }
    }),

    // 文件夹操作
    toggleFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId] as FolderNode;
      if (folder?.type === 'folder') {
        if (state.expandedFolders.has(folder.path)) {
          state.expandedFolders.delete(folder.path);
          folder.isExpanded = false;
        } else {
          state.expandedFolders.add(folder.path);
          folder.isExpanded = true;
        }
      }
    }),

    expandFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId] as FolderNode;
      if (folder?.type === 'folder') {
        state.expandedFolders.add(folder.path);
        folder.isExpanded = true;
      }
    }),

    collapseFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId] as FolderNode;
      if (folder?.type === 'folder') {
        state.expandedFolders.delete(folder.path);
        folder.isExpanded = false;
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
      if (state.selectedNodeId) {
        const prevNode = state.nodes[state.selectedNodeId];
        if (prevNode) {
          prevNode.isSelected = false;
        }
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
      } else if (dragData.type === 'link') {
        // 创建链接（在编辑器中处理）
        console.log('Creating link from', dragData.node.name, 'to editor');
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
      
      // const oldName = node.name; // 暂时未使用
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
    }
  }))
);