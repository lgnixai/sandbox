import React from 'react'
import { useAppStore } from '../../stores'
import { TopBar } from './TopBar'
import { ActivityBar } from './ActivityBar'
import { LeftSidebar } from './LeftSidebar'
import { MainEditor } from './MainEditor'
import { RightSidebar } from './RightSidebar'
import { Resizable, ResizableHandle, ResizablePanel } from '../ui/resizable'

export function Layout() {
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth
  } = useAppStore()

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = React.useState<number>(0)

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const leftMinPx = 200
  const leftMaxPx = 500
  const rightMinPx = 200
  const rightMaxPx = 500

  const toPct = (px: number) => {
    if (!containerWidth || containerWidth <= 0) return 20
    return Math.max(0, Math.min(100, (px / containerWidth) * 100))
  }

  const leftDefault = toPct(leftSidebarWidth)
  const rightDefault = toPct(rightSidebarWidth)
  const leftMin = toPct(leftMinPx)
  const leftMax = toPct(leftMaxPx)
  const rightMin = toPct(rightMinPx)
  const rightMax = toPct(rightMaxPx)

  const onLeftResize = (size: number) => {
    if (!containerWidth) return
    const width = Math.round((size / 100) * containerWidth)
    setLeftSidebarWidth(width)
  }

  const onRightResize = (size: number) => {
    if (!containerWidth) return
    const width = Math.round((size / 100) * containerWidth)
    setRightSidebarWidth(width)
  }

  const renderMainContent = () => {
    if (!leftSidebarVisible && !rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <MainEditor />
        </div>
      )
    }

    if (leftSidebarVisible && rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <div className="flex flex-1" ref={containerRef}>
            <Resizable direction="horizontal" className="flex flex-1">
            <ResizablePanel defaultSize={leftDefault} minSize={leftMin} maxSize={leftMax} onResize={onLeftResize}>
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle className="w-px bg-border" />
            <ResizablePanel>
              <MainEditor />
            </ResizablePanel>
            <ResizableHandle className="w-px bg-border" />
            <ResizablePanel defaultSize={rightDefault} minSize={rightMin} maxSize={rightMax} onResize={onRightResize}>
              <RightSidebar />
            </ResizablePanel>
            </Resizable>
          </div>
        </div>
      )
    }

    if (leftSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <div className="flex flex-1" ref={containerRef}>
            <Resizable direction="horizontal" className="flex flex-1">
            <ResizablePanel defaultSize={leftDefault} minSize={leftMin} maxSize={leftMax} onResize={onLeftResize}>
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle className="w-px bg-border" />
            <ResizablePanel>
              <MainEditor />
            </ResizablePanel>
            </Resizable>
          </div>
        </div>
      )
    }

    if (rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <div className="flex flex-1" ref={containerRef}>
            <Resizable direction="horizontal" className="flex flex-1">
            <ResizablePanel>
              <MainEditor />
            </ResizablePanel>
            <ResizableHandle className="w-px bg-light-border dark:bg-dark-border" />
            <ResizablePanel defaultSize={rightDefault} minSize={rightMin} maxSize={rightMax} onResize={onRightResize}>
              <RightSidebar />
            </ResizablePanel>
            </Resizable>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-1">
        <ActivityBar />
        <MainEditor />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground">
      {/* 顶部工具栏 */}
      <TopBar />
      
      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  )
}