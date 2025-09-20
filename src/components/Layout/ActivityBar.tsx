import { 
  Files, 
  Search, 
  Hash, 
  Puzzle,
  FileText,
  Eye,
  Share2
} from 'lucide-react'
import { useAppStore } from '../../stores'

export function ActivityBar() {
  const {
    leftActivePanel,
    rightActivePanel,
    leftSidebarVisible,
    rightSidebarVisible,
    setLeftPanel,
    setRightPanel,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore()

  const handleSetLeftPanel = (panel: 'files' | 'search' | 'tags' | 'plugins') => {
    setLeftPanel(panel)
    if (!leftSidebarVisible) {
      toggleLeftSidebar()
    }
  }

  const handleSetRightPanel = (panel: 'backlinks' | 'outline' | 'graph') => {
    setRightPanel(panel)
    if (!rightSidebarVisible) {
      toggleRightSidebar()
    }
  }

  return (
    <div className="flex flex-col w-12 bg-sidebar border-r border-border text-sidebar-foreground">
      {/* 左侧面板切换按钮 */}
      <div className="flex flex-col">
        <button
          onClick={() => handleSetLeftPanel('files')}
          className={`p-3 flex items-center justify-center transition-colors ${
            leftActivePanel === 'files'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="文件"
        >
          <Files size={20} />
        </button>
        
        <button
          onClick={() => handleSetLeftPanel('search')}
          className={`p-3 flex items-center justify-center transition-colors ${
            leftActivePanel === 'search'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="搜索"
        >
          <Search size={20} />
        </button>
        
        <button
          onClick={() => handleSetLeftPanel('tags')}
          className={`p-3 flex items-center justify-center transition-colors ${
            leftActivePanel === 'tags'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="标签"
        >
          <Hash size={20} />
        </button>
        
        <button
          onClick={() => handleSetLeftPanel('plugins')}
          className={`p-3 flex items-center justify-center transition-colors ${
            leftActivePanel === 'plugins'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="插件"
        >
          <Puzzle size={20} />
        </button>
      </div>

      {/* 分隔线 */}
      <div className="my-4 mx-2 border-t border-border" />

      {/* 右侧面板切换按钮 */}
      <div className="flex flex-col">
        <button
          onClick={() => handleSetRightPanel('backlinks')}
          className={`p-3 flex items-center justify-center transition-colors ${
            rightActivePanel === 'backlinks'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="反向链接"
        >
          <FileText size={20} />
        </button>
        
        <button
          onClick={() => handleSetRightPanel('outline')}
          className={`p-3 flex items-center justify-center transition-colors ${
            rightActivePanel === 'outline'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="大纲"
        >
          <Eye size={20} />
        </button>
        
        <button
          onClick={() => handleSetRightPanel('graph')}
          className={`p-3 flex items-center justify-center transition-colors ${
            rightActivePanel === 'graph'
              ? 'bg-primary/10 text-primary border-r-2 border-primary'
              : 'hover:bg-nav-hover text-muted-foreground'
          }`}
          title="关系图"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  )
}