/**
 * 简单的重构验证测试
 * 测试核心功能而不依赖 React hooks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eventBus } from '@/lib/eventBus';
import { fileTreeStorage } from '@/lib/fileTreeStorage';

describe('文件树重构核心功能验证', () => {
  beforeEach(() => {
    // 清理状态
    eventBus.clear();
    fileTreeStorage.clear();
  });

  afterEach(() => {
    // 清理事件监听器
    eventBus.clear();
  });

  describe('事件总线系统', () => {
    it('应该能够正确发布和订阅事件', () => {
      let receivedEvent: any = null;
      
      const unsubscribe = eventBus.on('fileTree:expand', (event) => {
        receivedEvent = event;
      });

      eventBus.emit('fileTree:expand', { folderId: 'test-folder' });

      expect(receivedEvent).toEqual({ folderId: 'test-folder' });

      unsubscribe();
    });

    it('应该能够取消订阅事件', () => {
      let callCount = 0;
      
      const unsubscribe = eventBus.on('fileTree:expand', () => {
        callCount++;
      });

      eventBus.emit('fileTree:expand', { folderId: 'test-folder' });
      expect(callCount).toBe(1);

      unsubscribe();
      eventBus.emit('fileTree:expand', { folderId: 'test-folder' });
      expect(callCount).toBe(1); // 应该仍然是1
    });

    it('应该支持多个事件监听器', () => {
      let callCount1 = 0;
      let callCount2 = 0;
      
      const unsubscribe1 = eventBus.on('fileTree:expand', () => {
        callCount1++;
      });
      
      const unsubscribe2 = eventBus.on('fileTree:expand', () => {
        callCount2++;
      });

      eventBus.emit('fileTree:expand', { folderId: 'test-folder' });

      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);

      unsubscribe1();
      unsubscribe2();
    });

    it('应该能够获取监听器数量', () => {
      const unsubscribe1 = eventBus.on('fileTree:expand', () => {});
      expect(eventBus.getListenerCount('fileTree:expand')).toBe(1);
      
      const unsubscribe2 = eventBus.on('fileTree:expand', () => {});
      expect(eventBus.getListenerCount('fileTree:expand')).toBe(2);
      
      unsubscribe1();
      expect(eventBus.getListenerCount('fileTree:expand')).toBe(1);
      
      unsubscribe2();
      expect(eventBus.getListenerCount('fileTree:expand')).toBe(0);
    });
  });

  describe('状态持久化', () => {
    it('应该能够保存和加载状态', () => {
      const testState = {
        expandedFolders: ['/workspace', '/workspace/笔记'],
        selectedNodeId: 'test-node',
        scrollPosition: 100,
      };

      fileTreeStorage.save(testState);
      const loadedState = fileTreeStorage.load();

      expect(loadedState).toEqual(testState);
    });

    it('应该能够清除状态', () => {
      const testState = {
        expandedFolders: ['/workspace'],
        selectedNodeId: 'test-node',
      };

      fileTreeStorage.save(testState);
      const loadedState = fileTreeStorage.load();
      expect(loadedState?.expandedFolders).toEqual(testState.expandedFolders);
      expect(loadedState?.selectedNodeId).toEqual(testState.selectedNodeId);

      fileTreeStorage.clear();
      expect(fileTreeStorage.load()).toBeNull();
    });

    it('应该能够处理无效的存储数据', () => {
      // 模拟无效的 localStorage 数据
      const invalidData = 'invalid json';
      localStorage.setItem('fileTreeState', invalidData);
      
      const loadedState = fileTreeStorage.load();
      expect(loadedState).toBeNull();
    });

    it('应该能够处理空的存储数据', () => {
      localStorage.removeItem('fileTreeState');
      
      const loadedState = fileTreeStorage.load();
      expect(loadedState).toBeNull();
    });

    it('应该能够更新存储配置', () => {
      const originalKey = 'fileTreeState';
      const newKey = 'newFileTreeState';
      
      // 保存原始配置下的数据
      fileTreeStorage.save({ expandedFolders: ['/test'] });
      const loadedState = fileTreeStorage.load();
      expect(loadedState?.expandedFolders).toEqual(['/test']);
      
      // 更新配置
      fileTreeStorage.updateConfig({ key: newKey });
      
      // 新配置下应该没有数据
      expect(fileTreeStorage.load()).toBeNull();
      
      // 恢复原始配置
      fileTreeStorage.updateConfig({ key: originalKey });
      const restoredState = fileTreeStorage.load();
      expect(restoredState?.expandedFolders).toEqual(['/test']);
    });
  });

  describe('事件类型安全', () => {
    it('应该支持所有定义的文件树事件类型', () => {
      const events = [
        { event: 'fileTree:expand', payload: { folderId: 'test' } },
        { event: 'fileTree:collapse', payload: { folderId: 'test' } },
        { event: 'fileTree:select', payload: { nodeId: 'test' } },
        { event: 'fileTree:createFile', payload: { parentId: 'test', fileName: 'test.md', fileType: 'markdown' } },
        { event: 'fileTree:createFolder', payload: { parentId: 'test', folderName: 'test' } },
        { event: 'fileTree:delete', payload: { nodeId: 'test', path: '/test' } },
        { event: 'fileTree:rename', payload: { nodeId: 'test', oldName: 'old', newName: 'new' } },
        { event: 'fileTree:move', payload: { nodeId: 'test', fromPath: '/old', toPath: '/new' } },
        { event: 'fileTree:refresh', payload: { reason: 'test' } },
        { event: 'fileTree:stateChanged', payload: { expandedFolders: ['/test'], selectedNodeId: 'test' } },
      ];

      events.forEach(({ event, payload }) => {
        let receivedPayload: any = null;
        
        const unsubscribe = eventBus.on(event as any, (data) => {
          receivedPayload = data;
        });

        eventBus.emit(event as any, payload);
        expect(receivedPayload).toEqual(payload);

        unsubscribe();
      });
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量事件而不影响性能', () => {
      const startTime = performance.now();
      const eventCount = 1000;
      
      // 创建大量事件监听器
      const unsubscribers = [];
      for (let i = 0; i < eventCount; i++) {
        const unsubscribe = eventBus.on('fileTree:expand', () => {});
        unsubscribers.push(unsubscribe);
      }

      // 发送大量事件
      for (let i = 0; i < eventCount; i++) {
        eventBus.emit('fileTree:expand', { folderId: `folder-${i}` });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 清理
      unsubscribers.forEach(unsubscribe => unsubscribe());

      // 应该在合理时间内完成（这里设置为100ms，实际可能更快）
      expect(duration).toBeLessThan(100);
    });

    it('应该能够快速切换存储操作', () => {
      const startTime = performance.now();
      const operationCount = 100;
      
      // 执行大量存储操作
      for (let i = 0; i < operationCount; i++) {
        fileTreeStorage.save({
          expandedFolders: [`/folder-${i}`],
          selectedNodeId: `node-${i}`,
        });
        fileTreeStorage.load();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(50);
    });
  });

  describe('错误处理', () => {
    it('应该能够处理事件处理器中的错误', () => {
      let errorCaught = false;
      
      // 监听错误事件
      const originalError = console.error;
      console.error = () => {
        errorCaught = true;
      };

      const unsubscribe = eventBus.on('fileTree:expand', () => {
        throw new Error('Test error');
      });

      eventBus.emit('fileTree:expand', { folderId: 'test' });

      expect(errorCaught).toBe(true);

      // 恢复原始 console.error
      console.error = originalError;
      unsubscribe();
    });

    it('应该能够处理存储错误', () => {
      // 模拟 localStorage 错误
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage error');
      };

      // 应该不会抛出错误
      expect(() => {
        fileTreeStorage.save({ expandedFolders: ['/test'] });
      }).not.toThrow();

      // 恢复原始 localStorage.setItem
      localStorage.setItem = originalSetItem;
    });
  });
});
