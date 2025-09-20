import React, { useEffect } from 'react';
import { useAppStore } from '@/stores';
import { TopBar } from './TopBar';
import { ActivityBar } from './ActivityBar';
import { LeftSidebar } from './LeftSidebar';
import { EnhancedMainEditor } from './EnhancedMainEditor';
import { RightSidebar } from './RightSidebar';
import { Resizable, ResizableHandle, ResizablePanel } from '../ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export function TestLayout() {
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    syncFileTreeWithNotes,
    loadStateFromStorage
  } = useAppStore();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  // 初始化加载存储状态和同步文件树
  useEffect(() => {
    loadStateFromStorage();
    syncFileTreeWithNotes();
  }, [loadStateFromStorage, syncFileTreeWithNotes]);

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const leftMinPx = 200;
  const leftMaxPx = 500;
  const rightMinPx = 200;
  const rightMaxPx = 500;

  const toPct = (px: number) => {
    if (!containerWidth || containerWidth <= 0) return 20;
    return Math.max(0, Math.min(100, (px / containerWidth) * 100));
  };

  const leftDefault = toPct(leftSidebarWidth);
  const rightDefault = toPct(rightSidebarWidth);
  const leftMin = toPct(leftMinPx);
  const leftMax = toPct(leftMaxPx);
  const rightMin = toPct(rightMinPx);
  const rightMax = toPct(rightMaxPx);

  const onLeftResize = (size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setLeftSidebarWidth(width);
  };

  const onRightResize = (size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setRightSidebarWidth(width);
  };

  // 生成动态的 panel 布局 key，确保在侧边栏可见性改变时重新创建组件
  const layoutKey = `${leftSidebarVisible ? 'L' : ''}${rightSidebarVisible ? 'R' : ''}`;

  const renderMainContent = () => {
    if (!leftSidebarVisible && !rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <EnhancedMainEditor />
        </div>
      );
    }

    // 使用单一的 Resizable 组件，通过 key 属性强制重新创建
    return (
      <div className="flex flex-1">
        <ActivityBar />
        <div className="flex flex-1" ref={containerRef}>
          <Resizable 
            direction="horizontal" 
            className="flex flex-1"
            key={layoutKey}
            id={`layout-${layoutKey}`}
          >
            {leftSidebarVisible && (
              <>
                <ResizablePanel 
                  id="left-sidebar"
                  order={1}
                  defaultSize={leftDefault} 
                  minSize={leftMin} 
                  maxSize={leftMax} 
                  onResize={onLeftResize}
                >
                  <LeftSidebar />
                </ResizablePanel>
                <ResizableHandle className="w-px bg-border" />
              </>
            )}
            
            <ResizablePanel 
              id="main-editor"
              order={2}
            >
              <EnhancedMainEditor />
            </ResizablePanel>
            
            {rightSidebarVisible && (
              <>
                <ResizableHandle className="w-px bg-border" />
                <ResizablePanel 
                  id="right-sidebar"
                  order={3}
                  defaultSize={rightDefault} 
                  minSize={rightMin} 
                  maxSize={rightMax} 
                  onResize={onRightResize}
                >
                  <RightSidebar />
                </ResizablePanel>
              </>
            )}
          </Resizable>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground">
      {/* 顶部工具栏 */}
      <TopBar />
      
      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  );
}