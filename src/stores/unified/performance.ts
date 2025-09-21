// 性能优化工具

import { TreeNode, FileSystemNode } from './types';
import { LRUCache } from 'lru-cache';

// 文件内容缓存
export const contentCache = new LRUCache<string, string>({
  max: 100, // 最多缓存 100 个文件
  maxSize: 50 * 1024 * 1024, // 最大 50MB
  sizeCalculation: (value) => value.length,
  ttl: 1000 * 60 * 5, // 5 分钟过期
});

// 搜索结果缓存
export const searchCache = new LRUCache<string, any[]>({
  max: 50,
  ttl: 1000 * 60 * 2, // 2 分钟过期
});

// 虚拟化文件树
export class VirtualFileTree {
  private visibleNodes: Map<string, TreeNode> = new Map();
  private expandedPaths: Set<string>;
  
  constructor(expandedPaths: Set<string>) {
    this.expandedPaths = expandedPaths;
  }

  // 计算可见节点
  calculateVisibleNodes(root: TreeNode): TreeNode[] {
    const visible: TreeNode[] = [];
    
    const traverse = (node: TreeNode, depth: number) => {
      // 添加当前节点
      visible.push(node);
      
      // 如果是展开的文件夹，递归子节点
      if (node.type === 'folder' && 
          this.expandedPaths.has(node.path) && 
          node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    if (root.children) {
      root.children.forEach(child => traverse(child, 0));
    }
    
    return visible;
  }

  // 获取节点的可见索引
  getNodeIndex(nodeId: string, visibleNodes: TreeNode[]): number {
    return visibleNodes.findIndex(node => node.id === nodeId);
  }

  // 获取节点的深度
  getNodeDepth(node: TreeNode, root: TreeNode): number {
    let depth = 0;
    let current = node;
    
    while (current.parentPath !== root.path) {
      depth++;
      // TODO: 需要父节点引用来计算深度
      break;
    }
    
    return depth;
  }
}

// 批量操作队列
export class BatchOperationQueue<T> {
  private queue: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<void>;
  private delay: number;
  private maxBatchSize: number;

  constructor(
    processor: (items: T[]) => Promise<void>,
    delay = 500,
    maxBatchSize = 50
  ) {
    this.processor = processor;
    this.delay = delay;
    this.maxBatchSize = maxBatchSize;
  }

  add(item: T) {
    this.queue.push(item);
    
    // 如果达到最大批量大小，立即处理
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length === 0) return;
    
    const items = this.queue.splice(0, this.maxBatchSize);
    
    try {
      await this.processor(items);
    } catch (error) {
      console.error('Batch operation failed:', error);
      // 可以选择重新加入队列或记录错误
    }
    
    // 如果还有剩余项，继续处理
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

// 防抖搜索
export function createDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay = 300
) {
  let timer: NodeJS.Timeout | null = null;
  let lastQuery = '';
  
  return (query: string): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      if (timer) {
        clearTimeout(timer);
      }
      
      // 检查缓存
      const cached = searchCache.get(query);
      if (cached) {
        resolve(cached as T[]);
        return;
      }
      
      timer = setTimeout(async () => {
        try {
          const results = await searchFn(query);
          searchCache.set(query, results);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

// 优化的文件树渲染
export const treeRenderOptimizations = {
  // 使用 React.memo 优化组件
  shouldComponentUpdate: (prevProps: any, nextProps: any) => {
    // 只在必要的 props 变化时重新渲染
    return (
      prevProps.node.id !== nextProps.node.id ||
      prevProps.isExpanded !== nextProps.isExpanded ||
      prevProps.isSelected !== nextProps.isSelected ||
      prevProps.depth !== nextProps.depth
    );
  },

  // 虚拟滚动配置
  virtualScrollConfig: {
    itemHeight: 28, // 每个树节点的高度
    overscan: 5, // 视口外预渲染的项目数
    estimateSize: () => 28,
  },

  // 懒加载子节点
  lazyLoadChildren: async (node: TreeNode, loadFn: (path: string) => Promise<TreeNode[]>) => {
    // 如果子节点未加载，动态加载
    if (node.type === 'folder' && !node.children) {
      const children = await loadFn(node.path);
      node.children = children;
    }
    return node.children || [];
  }
};

// 内存使用监控
export class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private threshold = 100 * 1024 * 1024; // 100MB

  start() {
    this.interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        
        if (used > this.threshold) {
          console.warn(`High memory usage: ${(used / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB`);
          
          // 触发缓存清理
          this.cleanupCaches();
        }
      }
    }, 30000); // 每30秒检查一次
  }

  private cleanupCaches() {
    // 清理过期缓存
    contentCache.purgeStale();
    searchCache.purgeStale();
    
    // 如果内存压力大，清理部分缓存
    if (contentCache.size > 50) {
      // 删除最少使用的项
      const items = Array.from(contentCache.entries());
      items.sort((a, b) => (a[1] as any).lastAccess - (b[1] as any).lastAccess);
      items.slice(0, 25).forEach(([key]) => contentCache.delete(key));
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const memoryMonitor = new MemoryMonitor();