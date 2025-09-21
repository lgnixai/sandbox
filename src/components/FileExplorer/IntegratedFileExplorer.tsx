import React, { useState, useCallback } from 'react';
import { 
  Database,
  HardDrive,
  Settings,
  RefreshCw
} from 'lucide-react';
import { FileTree } from './FileTree';
import { BackendFileTree } from './BackendFileTree';
import { DocumentManager } from '../DocumentManager/DocumentManager';
import { type FileTreeNode } from '@/lib/api/documentApi';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

type DataSource = 'frontend' | 'backend';

export function IntegratedFileExplorer() {
  const [activeDataSource, setActiveDataSource] = useState<DataSource>('frontend');
  const [selectedBackendFile, setSelectedBackendFile] = useState<FileTreeNode | null>(null);
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  
  const { openNoteInTabWithTitle } = useAppStore();

  // 处理后端文件选择
  const handleBackendFileSelect = useCallback((file: FileTreeNode) => {
    setSelectedBackendFile(file);
  }, []);

  // 处理后端文件打开
  const handleBackendFileOpen = useCallback(async (file: FileTreeNode) => {
    if (file.type === 'file') {
      // 这里可以集成到现有的编辑器系统中
      // 暂时显示文档管理器
      setSelectedBackendFile(file);
      setShowDocumentManager(true);
    }
  }, []);

  // 同步前端数据到后端
  const handleSyncToBackend = useCallback(async () => {
    // TODO: 实现将前端笔记数据同步到后端的逻辑
    console.log('同步前端数据到后端...');
  }, []);

  // 从后端同步数据到前端
  const handleSyncFromBackend = useCallback(async () => {
    // TODO: 实现从后端加载数据到前端的逻辑
    console.log('从后端同步数据到前端...');
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 数据源切换标签 */}
      <Tabs value={activeDataSource} onValueChange={(value) => setActiveDataSource(value as DataSource)}>
        <div className="border-b border-light-border dark:border-dark-border">
          <TabsList className="w-full h-auto p-1 bg-transparent">
            <TabsTrigger 
              value="frontend" 
              className="flex-1 flex items-center gap-2 text-xs data-[state=active]:bg-light-accent dark:data-[state=active]:bg-dark-accent"
            >
              <HardDrive size={14} />
              前端数据
            </TabsTrigger>
            <TabsTrigger 
              value="backend" 
              className="flex-1 flex items-center gap-2 text-xs data-[state=active]:bg-light-accent dark:data-[state=active]:bg-dark-accent"
            >
              <Database size={14} />
              后端数据
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 前端数据视图 */}
        <TabsContent value="frontend" className="flex-1 m-0">
          <FileTree />
        </TabsContent>

        {/* 后端数据视图 */}
        <TabsContent value="backend" className="flex-1 m-0">
          <BackendFileTree 
            onFileSelect={handleBackendFileSelect}
            onFileOpen={handleBackendFileOpen}
          />
        </TabsContent>
      </Tabs>

      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-1">
          {selectedBackendFile && (
            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[150px]">
              已选择: {selectedBackendFile.name}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* 文档管理器对话框 */}
          <Dialog open={showDocumentManager} onOpenChange={setShowDocumentManager}>
            <DialogTrigger asChild>
              <button
                className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded text-light-text-secondary dark:text-dark-text-secondary"
                title="文档管理器"
              >
                <Settings size={14} />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[90vw] h-[80vh]">
              <DialogHeader>
                <DialogTitle>文档管理器</DialogTitle>
                <DialogDescription>
                  管理后端文档数据，支持创建、编辑、删除等操作
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <DocumentManager />
              </div>
            </DialogContent>
          </Dialog>

          {/* 同步按钮 */}
          <button
            onClick={handleSyncToBackend}
            className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded text-light-text-secondary dark:text-dark-text-secondary"
            title="同步到后端"
            disabled={activeDataSource !== 'frontend'}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 数据源状态指示 */}
      <div className="px-2 py-1 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
          <span>
            当前数据源: {activeDataSource === 'frontend' ? '前端内存' : '后端数据库'}
          </span>
          <div className={cn(
            "w-2 h-2 rounded-full",
            activeDataSource === 'frontend' ? 'bg-blue-500' : 'bg-green-500'
          )} />
        </div>
      </div>
    </div>
  );
}
