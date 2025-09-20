import React, { useState, useRef } from 'react';
import { X, ChevronDown, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DraggableTabType {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  isLocked?: boolean;
  isPinned?: boolean;
  isPreview?: boolean;
}

interface DraggableTabProps {
  tab: DraggableTabType;
  index: number;
  onClose: (id: string) => void;
  onActivate: (id: string) => void;
  onDragStart: (e: React.DragEvent, tab: DraggableTabType, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragOver?: boolean;
  onPin?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseAll?: () => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
}

export function DraggableTab({
  tab,
  index,
  onClose,
  onActivate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
  onPin,
  onDuplicate,
  onCloseOthers,
  onCloseAll,
  onCopyPath,
  onRevealInExplorer
}: DraggableTabProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ tab, index }));
    onDragStart(e, tab, index);
    
    // 创建拖拽图像
    if (tabRef.current) {
      const dragImage = tabRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, index);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tab.isLocked && !tab.isPinned) {
      onClose(tab.id);
    }
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1 && !tab.isLocked && !tab.isPinned) {
      e.preventDefault();
      onClose(tab.id);
    }
  };

  return (
    <div
      ref={tabRef}
      className={cn(
        "group relative flex items-center min-w-0 h-8 px-3",
        "border-r border-tab-border transition-all duration-150",
        tab.isActive 
          ? "bg-tab-active text-foreground" 
          : "bg-tab-inactive text-muted-foreground hover:bg-tab-hover",
        tab.isPreview && "italic",
        isDragOver && "bg-blue-500/20 border-blue-500",
        "cursor-pointer select-none"
      )}
      onClick={() => onActivate(tab.id)}
      onMouseDown={handleMiddleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!tab.isPinned}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      {/* 固定/锁定图标 */}
      {(tab.isPinned || tab.isLocked) && (
        <div className="mr-1.5 flex-shrink-0">
          {tab.isPinned && (
            <div className="w-3 h-3 text-primary">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
              </svg>
            </div>
          )}
          {tab.isLocked && !tab.isPinned && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
      )}
      
      {/* 标签标题 */}
      <span className={cn(
        "flex-1 text-sm truncate mr-2",
        tab.isPreview && "opacity-80"
      )}>
        {tab.title}
      </span>
      
      {/* 修改指示器 */}
      {tab.isDirty && (
        <Circle className="w-2 h-2 fill-current text-primary mr-2 flex-shrink-0" />
      )}
      
      {/* 下拉菜单 */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button 
            className={cn(
              "flex items-center justify-center w-5 h-5 mr-1",
              "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
              "transition-opacity duration-150",
              isDropdownOpen && "opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-48 bg-card border border-border shadow-dropdown"
        >
          <DropdownMenuItem 
            onClick={() => onClose(tab.id)}
            disabled={tab.isLocked || tab.isPinned}
          >
            关闭
          </DropdownMenuItem>
          {onCloseOthers && (
            <DropdownMenuItem onClick={() => onCloseOthers(tab.id)}>
              关闭其他标签页
            </DropdownMenuItem>
          )}
          {onCloseAll && (
            <DropdownMenuItem onClick={onCloseAll}>
              关闭所有标签页
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onPin && (
            <DropdownMenuItem onClick={() => onPin(tab.id)}>
              {tab.isPinned ? '取消固定' : '固定'}
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(tab.id)}>
              复制标签页
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onCopyPath && (
            <DropdownMenuItem onClick={() => onCopyPath(tab.id)}>
              复制文件路径
            </DropdownMenuItem>
          )}
          {onRevealInExplorer && (
            <DropdownMenuItem onClick={() => onRevealInExplorer(tab.id)}>
              在文件树中显示
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 关闭按钮 */}
      {!tab.isPinned && !tab.isLocked && (
        <button
          className={cn(
            "flex items-center justify-center w-5 h-5",
            "opacity-0 hover:bg-nav-hover rounded",
            "transition-opacity duration-150",
            (isHovered || tab.isActive) && "opacity-100"
          )}
          onClick={handleClose}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}