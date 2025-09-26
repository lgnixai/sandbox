import { useEffect, useState } from 'react'
import { 
  Files, 
  Search, 
  Hash, 
  Puzzle,
  FileText,
  Eye,
  Share2,
  CheckSquare,
  PlusSquare,
  List,
  Calculator
} from 'lucide-react'
import { useAppStore } from '../../stores'
import { PluginAPI } from '../../lib/plugins/api'
import type { PluginMenu } from '../../lib/plugins/types'

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

  const [toolMenus, setToolMenus] = useState<PluginMenu[]>([])

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

  // Load plugin menus that should appear as activity shortcuts (parent === 'tools')
  useEffect(() => {
    const loadMenus = async () => {
      try {
        console.log('Loading runtime menus...')
        const menus = await PluginAPI.getRuntimeMenus()
        console.log('All menus:', menus)
        const tools = (menus || []).filter(m => m.parent === 'tools')
        console.log('Tools menus:', tools)
        setToolMenus(tools)
      } catch (e) {
        console.error('Failed to load runtime menus:', e)
      }
    }
    loadMenus()
  }, [])

  const IconByName = (name?: string) => {
    switch ((name || '').toLowerCase()) {
      case 'check-square':
        return <CheckSquare size={20} />
      case 'plus-square':
        return <PlusSquare size={20} />
      case 'list':
        return <List size={20} />
      case 'calculator':
        return <Calculator size={20} />
      default:
        return <Puzzle size={20} />
    }
  }

  const handlePluginMenuClick = async (menu: PluginMenu) => {
    try {
      console.log('Executing plugin command:', menu.action)
      // 执行后端运行时命令（action 为命令 id）
      const result = await PluginAPI.executeCommand(menu.action)
      console.log('Command result:', result)
      
      // 触发插件命令执行事件
      window.dispatchEvent(new CustomEvent('plugin:command-executed', {
        detail: { menu, result }
      }))
      
      // 根据插件类型决定显示位置
      if (menu.id.includes('calculator')) {
        // 计算器插件显示在右侧
        if (!rightSidebarVisible) toggleRightSidebar()
        setRightPanel('outline') // 使用现有的右侧面板
      } else {
        // 其他插件显示在左侧
        if (!leftSidebarVisible) toggleLeftSidebar()
        setLeftPanel('plugins')
      }
    } catch (e) {
      console.error('Failed to execute plugin command:', e)
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

        {/* 插件注入的活动栏图标（来自运行时菜单 parent=tools） */}
        {toolMenus.map(menu => {
          console.log('Rendering menu:', menu)
          return (
            <button
              key={menu.id}
              onClick={() => handlePluginMenuClick(menu)}
              className={`p-3 flex items-center justify-center transition-colors hover:bg-nav-hover text-muted-foreground`}
              title={menu.label}
            >
              {IconByName(menu.icon)}
            </button>
          )
        })}
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