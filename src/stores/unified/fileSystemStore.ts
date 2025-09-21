import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { FileSystemNode, TreeNode, SearchResult } from './types';
import { fileSystemAPI } from '@/api/unified';
import { createDebouncedSearch, BatchOperationQueue } from './performance';

interface FileSystemState {
  // 文件系统数据
  nodes: Map<string, FileSystemNode>;
  tree: TreeNode | null;
  
  // UI 状态
  expandedFolders: Set<string>;
  selectedNodeId: string | null;
  
  // 搜索
  searchQuery: string;
  searchResults: SearchResult[];
  
  // 加载状态
  loading: boolean;
  error: string | null;
}

interface FileSystemActions {
  // 数据加载
  loadTree: (path?: string) => Promise<void>;
  refreshNode: (path: string) => Promise<void>;
  
  // 文件操作
  createFile: (parentPath: string, name: string, fileType?: string) => Promise<void>;
  updateFile: (path: string, content: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  moveNode: (oldPath: string, newPath: string) => Promise<void>;
  
  // 文件夹操作
  createFolder: (parentPath: string, name: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  
  // 选择操作
  selectNode: (nodeId: string | null) => void;
  
  // 搜索
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  
  // 工具方法
  getNodeByPath: (path: string) => FileSystemNode | undefined;
  getNodeById: (id: string) => FileSystemNode | undefined;
  isPathExpanded: (path: string) => boolean;
  updateMultipleNodes: (nodes: FileSystemNode[]) => void;
}

// 创建防抖搜索函数
const debouncedSearch = createDebouncedSearch(
  (query: string) => fileSystemAPI.search(query),
  300
);

// 创建批量刷新队列
const refreshQueue = new BatchOperationQueue<string>(
  async (paths: string[]) => {
    // 批量刷新节点
    const promises = paths.map(path => fileSystemAPI.getNode(path));
    const nodes = await Promise.all(promises);
    
    useFileSystemStore.getState().updateMultipleNodes(nodes);
  },
  500,
  20
);

export const useFileSystemStore = create<FileSystemState & FileSystemActions>()(
  immer((set, get) => ({
    // 初始状态
    nodes: new Map(),
    tree: null,
    expandedFolders: new Set(['/workspace']),
    selectedNodeId: null,
    searchQuery: '',
    searchResults: [],
    loading: false,
    error: null,

    // 数据加载
    loadTree: async (path = '/') => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const tree = await fileSystemAPI.getTree(path);
        
        set((state) => {
          // 清空旧数据
          state.nodes.clear();
          
          // 递归添加节点
          const addNodes = (node: TreeNode) => {
            state.nodes.set(node.id, {
              ...node,
              children: undefined
            });
            
            if (node.children) {
              node.children.forEach(addNodes);
            }
          };
          
          addNodes(tree);
          state.tree = tree;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
          state.loading = false;
        });
      }
    },

    refreshNode: async (path: string) => {
      try {
        const node = await fileSystemAPI.getNode(path);
        
        set((state) => {
          state.nodes.set(node.id, node);
        });
      } catch (error) {
        console.error('Failed to refresh node:', error);
      }
    },

    // 文件操作
    createFile: async (parentPath: string, name: string, fileType = 'markdown') => {
      const path = `${parentPath}/${name}`;
      
      try {
        await fileSystemAPI.createFile(path, '', fileType);
        
        // 刷新父文件夹
        await get().loadTree();
        
        // 选中新文件
        const newNode = get().getNodeByPath(path);
        if (newNode) {
          get().selectNode(newNode.id);
        }
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    updateFile: async (path: string, content: string) => {
      try {
        await fileSystemAPI.updateFile(path, content);
        await get().refreshNode(path);
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    deleteNode: async (path: string) => {
      try {
        await fileSystemAPI.deleteNode(path);
        await get().loadTree();
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    moveNode: async (oldPath: string, newPath: string) => {
      try {
        await fileSystemAPI.moveNode(oldPath, newPath);
        await get().loadTree();
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    // 文件夹操作
    createFolder: async (parentPath: string, name: string) => {
      const path = `${parentPath}/${name}`;
      
      try {
        await fileSystemAPI.createFolder(path);
        await get().loadTree();
        
        // 展开父文件夹
        get().expandFolder(parentPath);
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    toggleFolder: (path: string) => {
      set((state) => {
        if (state.expandedFolders.has(path)) {
          state.expandedFolders.delete(path);
        } else {
          state.expandedFolders.add(path);
        }
      });
    },

    expandFolder: (path: string) => {
      set((state) => {
        state.expandedFolders.add(path);
      });
    },

    collapseFolder: (path: string) => {
      set((state) => {
        state.expandedFolders.delete(path);
      });
    },

    // 选择操作
    selectNode: (nodeId: string | null) => {
      set((state) => {
        state.selectedNodeId = nodeId;
      });
    },

    // 搜索
    search: async (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });

      if (!query.trim()) {
        get().clearSearch();
        return;
      }

      try {
        // 使用防抖搜索
        const results = await debouncedSearch(query);
        set((state) => {
          state.searchResults = results;
        });
      } catch (error) {
        console.error('Search failed:', error);
      }
    },

    clearSearch: () => {
      set((state) => {
        state.searchQuery = '';
        state.searchResults = [];
      });
    },

    // 工具方法
    getNodeByPath: (path: string) => {
      const nodes = get().nodes;
      for (const node of nodes.values()) {
        if (node.path === path) {
          return node;
        }
      }
      return undefined;
    },

    getNodeById: (id: string) => {
      return get().nodes.get(id);
    },

    isPathExpanded: (path: string) => {
      return get().expandedFolders.has(path);
    },

    updateMultipleNodes: (nodes: FileSystemNode[]) => {
      set((state) => {
        nodes.forEach(node => {
          state.nodes.set(node.id, node);
        });
      });
    }
  }))
);