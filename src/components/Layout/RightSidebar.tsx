import { useAppStore } from '../../stores'
import { BacklinksPanel } from '../Backlinks/BacklinksPanel'
import { OutlinePanel } from '../Outline/OutlinePanel'
import { GraphPanel } from '../Graph/GraphPanel'

export function RightSidebar() {
  const { rightActivePanel } = useAppStore()

  const renderPanel = () => {
    switch (rightActivePanel) {
      case 'backlinks':
        return <BacklinksPanel />
      case 'outline':
        return <OutlinePanel />
      case 'graph':
        return <GraphPanel />
      default:
        return <BacklinksPanel />
    }
  }

  return (
    <div 
      className="bg-sidebar text-sidebar-foreground flex flex-col relative min-w-0 h-full"
    >
      {/* 面板标题 */}
      <div className="h-8 flex items-center px-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {rightActivePanel === 'backlinks' && '反向链接'}
          {rightActivePanel === 'outline' && '大纲'}
          {rightActivePanel === 'graph' && '关系图'}
        </span>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>

      {/* 大小由父级 ResizablePanel 控制 */}
    </div>
  )
}