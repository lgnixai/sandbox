export { FileSystemEventHandler } from './FileSystemEventHandler';
export { EventHandlerManager } from './EventHandlerManager';

// 导出事件处理器类型
export interface EventHandlerInterface {
  destroy(): void;
}

// 导出常用的事件处理器工厂函数
export const createEventHandlers = (getStore: () => any) => {
  return new EventHandlerManager(getStore);
};
