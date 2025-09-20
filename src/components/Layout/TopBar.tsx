import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen,
  Sun,
  Moon,
  Search,
  Plus,
  Settings
} from 'lucide-react'
import { useAppStore } from '../../stores'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function TopBar() {
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    isDarkMode,
    theme,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleTheme,
    toggleCommandPalette,
    addNote,
    openNoteInTab,
    setTheme
  } = useAppStore()

  const createNewNote = () => {
    const id = `note-${Date.now()}`
    const note = {
      id,
      title: '未命名',
      content: '# 未命名\n\n开始编辑这个笔记...',
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: 'markdown' as const
    }
    addNote(note)
    openNoteInTab(id)
  }

  return (
    <div className="flex items-center justify-between h-10 px-3 bg-panel border-b border-border">
      {/* 左侧控制按钮 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={toggleLeftSidebar}
          className="p-1.5 rounded hover:bg-nav-hover transition-colors"
          title={leftSidebarVisible ? '隐藏左侧边栏' : '显示左侧边栏'}
        >
          {leftSidebarVisible ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>
        
        <button
          onClick={toggleRightSidebar}
          className="p-1.5 rounded hover:bg-nav-hover transition-colors"
          title={rightSidebarVisible ? '隐藏右侧边栏' : '显示右侧边栏'}
        >
          {rightSidebarVisible ? (
            <PanelRightClose size={16} />
          ) : (
            <PanelRightOpen size={16} />
          )}
        </button>
      </div>

      {/* 中间标题区域 */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-sm font-medium text-muted-foreground">
          ReNote
        </h1>
      </div>

      {/* 右侧工具按钮 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={createNewNote}
          className="p-1.5 rounded hover:bg-nav-hover transition-colors"
          title="新建笔记 (Ctrl+N)"
        >
          <Plus size={16} />
        </button>
        
        <button
          onClick={toggleCommandPalette}
          className="p-1.5 rounded hover:bg-nav-hover transition-colors"
          title="命令面板 (Ctrl+P)"
        >
          <Search size={16} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded hover:bg-nav-hover transition-colors"
              title="主题与外观"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-card border border-border">
            <DropdownMenuLabel>外观</DropdownMenuLabel>
            <DropdownMenuItem className="text-sm" onClick={toggleTheme}>
              切换 {isDarkMode ? '浅色' : '暗色'} 模式
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>主题</DropdownMenuLabel>
            <DropdownMenuItem className="text-sm" onClick={() => setTheme && setTheme('obsidian')}>
              Obsidian
              <span className="ml-auto text-xs text-muted-foreground">{theme === 'obsidian' ? '当前' : ''}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={() => setTheme && setTheme('nord')}>
              Nord
              <span className="ml-auto text-xs text-muted-foreground">{theme === 'nord' ? '当前' : ''}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={() => setTheme && setTheme('solarized')}>
              Solarized
              <span className="ml-auto text-xs text-muted-foreground">{theme === 'solarized' ? '当前' : ''}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <button
          className="p-1.5 rounded hover:bg-nav-hover transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}