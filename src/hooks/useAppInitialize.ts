import { useEffect } from 'react';
import { syncManager } from '@/stores/unified/syncManager';
import { wsManager } from '@/stores/unified';

export function useAppInitialize() {
  useEffect(() => {
    // 初始化同步管理器
    syncManager.initialize().catch(error => {
      console.error('Failed to initialize app:', error);
    });

    // 清理函数
    return () => {
      syncManager.destroy();
    };
  }, []);
}