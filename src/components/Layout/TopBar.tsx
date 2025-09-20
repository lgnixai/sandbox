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

export function TopBar() {
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    isDarkMode,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleTheme,
    toggleCommandPalette,
    addNote,
    openNoteInTab
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
    <div className="flex items-center justify-between h-10 px-3 bg-light-panel dark:bg-dark-panel border-b border-light-border dark:border-dark-border">
      {/* 左侧控制按钮 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={toggleLeftSidebar}
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
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
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
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
        <h1 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
          ReNote
        </h1>
      </div>

      {/* 右侧工具按钮 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={createNewNote}
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title="新建笔记 (Ctrl+N)"
        >
          <Plus size={16} />
        </button>
        
        <button
          onClick={toggleCommandPalette}
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title="命令面板 (Ctrl+P)"
        >
          <Search size={16} />
        </button>
        
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title={isDarkMode ? '切换到浅色主题' : '切换到暗色主题'}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        
        <button
          className="p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}