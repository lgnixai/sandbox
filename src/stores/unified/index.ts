// 统一导出所有 Store

export * from './types';
export * from './fileSystemStore';
export * from './noteStore';
export * from './tagStore';
export * from './editorStore';

// WebSocket 管理
import { WSEvent, WSEventType } from './types';
import { useFileSystemStore } from './fileSystemStore';
import { useNoteStore } from './noteStore';
import { useTagStore } from './tagStore';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        this.handleEvent(wsEvent);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleEvent(event: WSEvent) {
    switch (event.type) {
      // 文件系统事件
      case WSEventType.FILE_CREATED:
      case WSEventType.FILE_UPDATED:
      case WSEventType.FILE_DELETED:
      case WSEventType.FILE_MOVED:
        // 刷新文件树
        useFileSystemStore.getState().loadTree();
        break;

      // 标签事件
      case WSEventType.TAG_CREATED:
      case WSEventType.TAG_UPDATED:
      case WSEventType.TAG_DELETED:
        // 刷新标签列表
        useTagStore.getState().loadTags();
        break;

      // 同步事件
      case WSEventType.SYNC_START:
        console.log('Sync started');
        break;
      case WSEventType.SYNC_COMPLETE:
        console.log('Sync completed');
        break;
      case WSEventType.SYNC_ERROR:
        console.error('Sync error:', event.payload);
        break;

      default:
        console.log('Unknown WebSocket event:', event);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(event: WSEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      console.error('WebSocket is not connected');
    }
  }
}

export const wsManager = new WebSocketManager();