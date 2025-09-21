import { FileSystemEventHandler } from './FileSystemEventHandler';
import type { AppState, AppActions } from '@/stores';

/**
 * 事件处理器管理器
 * 负责初始化和管理所有事件处理器
 */
export class EventHandlerManager {
  private handlers: Map<string, any> = new Map();
  private getStore: () => AppState & AppActions;

  constructor(getStore: () => AppState & AppActions) {
    this.getStore = getStore;
    this.initialize();
  }

  /**
   * 初始化所有事件处理器
   */
  private initialize() {
    console.log('[EventHandlerManager] Initializing event handlers...');
    
    // 初始化文件系统事件处理器
    const fileSystemHandler = new FileSystemEventHandler(this.getStore);
    this.handlers.set('FileSystemEventHandler', fileSystemHandler);
    
    console.log('[EventHandlerManager] Event handlers initialized successfully');
  }

  /**
   * 获取指定的事件处理器
   */
  public getHandler<T>(name: string): T | undefined {
    return this.handlers.get(name);
  }

  /**
   * 添加新的事件处理器
   */
  public addHandler(name: string, handler: any) {
    if (this.handlers.has(name)) {
      console.warn(`[EventHandlerManager] Handler ${name} already exists, replacing...`);
      this.removeHandler(name);
    }
    
    this.handlers.set(name, handler);
    console.log(`[EventHandlerManager] Handler ${name} added`);
  }

  /**
   * 移除事件处理器
   */
  public removeHandler(name: string) {
    const handler = this.handlers.get(name);
    if (handler && typeof handler.destroy === 'function') {
      handler.destroy();
    }
    
    this.handlers.delete(name);
    console.log(`[EventHandlerManager] Handler ${name} removed`);
  }

  /**
   * 销毁所有事件处理器
   */
  public destroy() {
    console.log('[EventHandlerManager] Destroying all event handlers...');
    
    for (const [name, handler] of this.handlers) {
      if (handler && typeof handler.destroy === 'function') {
        handler.destroy();
      }
    }
    
    this.handlers.clear();
    console.log('[EventHandlerManager] All event handlers destroyed');
  }

  /**
   * 获取所有已注册的处理器名称
   */
  public getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 检查处理器是否存在
   */
  public hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }
}
