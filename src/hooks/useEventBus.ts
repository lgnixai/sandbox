import { useEffect, useCallback, useRef } from 'react';
import { Event } from '@/types/events';
import { eventBus } from '@/lib/event-bus';

/**
 * 事件处理器接口
 */
export interface EventHandler<T extends Event = Event> {
  id: string;
  eventTypes: T['type'][];
  handler: (event: T) => Promise<void> | void;
  priority?: number;
  conditions?: (event: T) => boolean;
}

/**
 * 事件发布 hook
 * 提供类型安全的事件发布功能
 */
export function useEventPublisher() {
  const publish = useCallback(<T extends Event>(event: T) => {
    console.log(`[Event] Publishing: ${event.type}`, event);
    eventBus.publish(event);
  }, []);

  return { publish };
}

/**
 * 事件监听 hook
 * 提供类型安全的事件监听功能
 */
export function useEventListener<T extends Event = Event>(
  eventTypes: T['type'] | T['type'][],
  handler: (event: T) => void | Promise<void>,
  dependencies: any[] = [],
  conditions?: (event: T) => boolean
) {
  const handlerRef = useRef(handler);
  const conditionsRef = useRef(conditions);

  // 更新 ref 以避免闭包问题
  useEffect(() => {
    handlerRef.current = handler;
    conditionsRef.current = conditions;
  });

  useEffect(() => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    const wrappedHandler = async (event: Event) => {
      const typedEvent = event as T;
      
      // 检查事件类型
      if (!types.includes(typedEvent.type)) {
        return;
      }
      
      // 检查条件
      if (conditionsRef.current && !conditionsRef.current(typedEvent)) {
        return;
      }
      
      console.log(`[Event] Handling: ${typedEvent.type}`, typedEvent);
      
      try {
        await handlerRef.current(typedEvent);
      } catch (error) {
        console.error(`[Event] Error handling ${typedEvent.type}:`, error);
      }
    };

    const subscriptionId = eventBus.subscribe(wrappedHandler);

    return () => {
      eventBus.unsubscribe(subscriptionId);
    };
  }, [eventTypes, ...dependencies]);
}

/**
 * 事件处理器 hook
 * 用于注册复杂的事件处理器
 */
export function useEventHandler<T extends Event = Event>(
  handler: EventHandler<T>,
  dependencies: any[] = []
) {
  useEventListener(
    handler.eventTypes,
    handler.handler,
    dependencies,
    handler.conditions
  );
}

/**
 * 组合事件 hook
 * 同时提供发布和监听功能
 */
export function useEvents() {
  const { publish } = useEventPublisher();
  
  return {
    publish,
    useListener: useEventListener,
    useHandler: useEventHandler
  };
}

/**
 * 文件系统事件 hook
 * 专门用于文件系统相关事件的发布和监听
 */
export function useFileSystemEvents() {
  const { publish } = useEventPublisher();
  
  // 文件节点事件发布器
  const publishFileNodeCreated = useCallback((node: any) => {
    publish({
      type: 'file.node.created',
      node
    } as Event);
  }, [publish]);
  
  const publishFileNodeDeleted = useCallback((nodeId: string, node: any) => {
    publish({
      type: 'file.node.deleted',
      nodeId,
      node
    } as Event);
  }, [publish]);
  
  const publishFileNodeRenamed = useCallback((
    nodeId: string,
    oldName: string,
    newName: string,
    oldPath: string,
    newPath: string
  ) => {
    publish({
      type: 'file.node.renamed',
      nodeId,
      oldName,
      newName,
      oldPath,
      newPath
    } as Event);
  }, [publish]);
  
  const publishFileNodeMoved = useCallback((
    nodeId: string,
    oldParentPath: string,
    newParentPath: string,
    oldPath: string,
    newPath: string
  ) => {
    publish({
      type: 'file.node.moved',
      nodeId,
      oldParentPath,
      newParentPath,
      oldPath,
      newPath
    } as Event);
  }, [publish]);
  
  // 文件夹事件发布器
  const publishFolderNodeCreated = useCallback((node: any) => {
    publish({
      type: 'folder.node.created',
      node
    } as Event);
  }, [publish]);
  
  const publishFolderNodeDeleted = useCallback((nodeId: string, node: any) => {
    publish({
      type: 'folder.node.deleted',
      nodeId,
      node
    } as Event);
  }, [publish]);
  
  const publishFolderExpanded = useCallback((folderPath: string) => {
    publish({
      type: 'folder.expanded',
      folderPath
    } as Event);
  }, [publish]);
  
  const publishFolderCollapsed = useCallback((folderPath: string) => {
    publish({
      type: 'folder.collapsed',
      folderPath
    } as Event);
  }, [publish]);
  
  const publishNodeSelected = useCallback((nodeId: string | null, previousNodeId: string | null) => {
    publish({
      type: 'node.selected',
      nodeId,
      previousNodeId
    } as Event);
  }, [publish]);
  
  // 拖拽事件发布器
  const publishDragStarted = useCallback((node: any) => {
    publish({
      type: 'drag.started',
      node
    } as Event);
  }, [publish]);
  
  const publishDragEnded = useCallback((node: any) => {
    publish({
      type: 'drag.ended',
      node
    } as Event);
  }, [publish]);
  
  const publishDrop = useCallback((targetNodeId: string, dragData: any) => {
    publish({
      type: 'drop',
      targetNodeId,
      dragData
    } as Event);
  }, [publish]);

  return {
    // 通用发布器
    publish,
    
    // 文件节点事件
    publishFileNodeCreated,
    publishFileNodeDeleted,
    publishFileNodeRenamed,
    publishFileNodeMoved,
    
    // 文件夹事件
    publishFolderNodeCreated,
    publishFolderNodeDeleted,
    publishFolderExpanded,
    publishFolderCollapsed,
    
    // 选择事件
    publishNodeSelected,
    
    // 拖拽事件
    publishDragStarted,
    publishDragEnded,
    publishDrop,
    
    // 监听器
    useListener: useEventListener
  };
}
