import React, { useState, useCallback } from 'react';
import { Plus, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { DraggableTab, type DraggableTabType } from './DraggableTab';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedTabBarProps {
  tabs: DraggableTabType[];
  onCloseTab: (id: string) => void;
  onActivateTab: (id: string) => void;
  onAddTab: () => void;
  onReorderTabs: (tabs: DraggableTabType[]) => void;
  onPinTab?: (id: string) => void;
  onDuplicateTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseAll?: () => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
}

export function EnhancedTabBar({
  tabs,
  onCloseTab,
  onActivateTab,
  onAddTab,
  onReorderTabs,
  onPinTab,
  onDuplicateTab,
  onCloseOthers,
  onCloseAll,
  onCopyPath,
  onRevealInExplorer,
  canNavigateBack,
  canNavigateForward,
  onNavigateBack,
  onNavigateForward
}: EnhancedTabBarProps) {
  const [draggedTab, setDraggedTab] = useState<{ tab: DraggableTabType; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, tab: DraggableTabType, index: number) => {
    setDraggedTab({ tab, index });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedTab && draggedTab.index !== index) {
      setDragOverIndex(index);
    }
  }, [draggedTab]);

  // 处理放置
  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedTab && draggedTab.index !== dropIndex) {
      const newTabs = [...tabs];
      const [movedTab] = newTabs.splice(draggedTab.index, 1);
      
      // 调整插入位置
      const adjustedIndex = draggedTab.index < dropIndex ? dropIndex - 1 : dropIndex;
      newTabs.splice(adjustedIndex, 0, movedTab);
      
      onReorderTabs(newTabs);
    }
    
    setDraggedTab(null);
    setDragOverIndex(null);
  }, [draggedTab, tabs, onReorderTabs]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
    setDragOverIndex(null);
  }, []);

  // 分离固定和普通标签
  const pinnedTabs = tabs.filter(tab => tab.isPinned);
  const normalTabs = tabs.filter(tab => !tab.isPinned);

  return (
    <div className="flex items-center bg-panel border-b border-border h-9">
      {/* 导航控制 */}
      {(onNavigateBack || onNavigateForward) && (
        <div className="flex items-center px-2 border-r border-border">
          <button 
            className="p-1 hover:bg-nav-hover rounded disabled:opacity-50"
            onClick={onNavigateBack}
            disabled={!canNavigateBack}
            title="后退"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            className="p-1 hover:bg-nav-hover rounded disabled:opacity-50"
            onClick={onNavigateForward}
            disabled={!canNavigateForward}
            title="前进"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 标签列表 */}
      <div className="flex flex-1 overflow-x-auto scrollbar-none">
        {/* 固定标签 */}
        {pinnedTabs.length > 0 && (
          <>
            <div className="flex">
              {pinnedTabs.map((tab, index) => (
                <DraggableTab
                  key={tab.id}
                  tab={tab}
                  index={index}
                  onClose={onCloseTab}
                  onActivate={onActivateTab}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === index}
                  onPin={onPinTab}
                  onDuplicate={onDuplicateTab}
                  onCloseOthers={onCloseOthers}
                  onCloseAll={onCloseAll}
                  onCopyPath={onCopyPath}
                  onRevealInExplorer={onRevealInExplorer}
                />
              ))}
            </div>
            {normalTabs.length > 0 && (
              <div className="w-px bg-border mx-1" />
            )}
          </>
        )}
        
        {/* 普通标签 */}
        {normalTabs.map((tab, index) => {
          const actualIndex = pinnedTabs.length + index;
          return (
            <DraggableTab
              key={tab.id}
              tab={tab}
              index={actualIndex}
              onClose={onCloseTab}
              onActivate={onActivateTab}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverIndex === actualIndex}
              onPin={onPinTab}
              onDuplicate={onDuplicateTab}
              onCloseOthers={onCloseOthers}
              onCloseAll={onCloseAll}
              onCopyPath={onCopyPath}
              onRevealInExplorer={onRevealInExplorer}
            />
          );
        })}
        
        {/* 拖拽时的插入指示器 */}
        {dragOverIndex !== null && (
          <div
            className="absolute w-0.5 h-6 bg-blue-500 pointer-events-none transition-all duration-150"
            style={{
              left: `${dragOverIndex * 150}px`,
              top: '6px'
            }}
          />
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center px-2 border-l border-border">
        <button 
          onClick={onAddTab}
          className="p-1 hover:bg-nav-hover rounded"
          title="新建标签页"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 更多选项 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-nav-hover rounded ml-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddTab}>
              新建标签页
            </DropdownMenuItem>
            {onCloseAll && (
              <DropdownMenuItem onClick={onCloseAll}>
                关闭所有标签页
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}