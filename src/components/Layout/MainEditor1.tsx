import { useAppContext } from '../../contexts/AppContext'
import { TabBar } from '../Obeditor/Tab'
import { Editor } from '../Editor/Editor'
import { Resizable, ResizableHandle, ResizablePanel } from '../ui/resizable'

function PaneView({ pane }: { pane: any }) {
  const { state } = useAppContext()
  
  if (!pane || pane.tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="text-center text-light-text-secondary dark:text-dark-text-secondary">
          <p className="text-lg mb-2">没有打开的笔记</p>
          <p className="text-sm">创建新笔记或从文件列表中打开现有笔记</p>
        </div>
      </div>
    )
  }

  const activeTab = pane.tabs.find((tab: any) => tab.id === pane.activeTabId)
  const activeNote = activeTab ? state.notes[activeTab.noteId] : null

  return (
    <div className="split-pane flex-1 flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* 标签栏 */}
      <TabBar 
        tabs={pane.tabs} 
        onCloseTab={() => {}} 
        onActivateTab={() => {}} 
        onAddTab={() => {}}
        onCloseOthers={() => {}}
        onCloseAll={() => {}}
        onSplitHorizontal={() => {}}
        onSplitVertical={() => {}}
        onToggleLock={() => {}}
        onDuplicate={() => {}}
        onRename={() => {}}
      />
      
      {/* 编辑器 */}
      <div className="flex-1 overflow-hidden">
        {activeNote ? (
          <Editor note={activeNote} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-light-text-secondary dark:text-dark-text-secondary">
              <p className="text-lg mb-2">笔记未找到</p>
              <p className="text-sm">请选择一个有效的笔记</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function MainEditor() {
  const { state } = useAppContext()

  if (state.panes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="text-center text-light-text-secondary dark:text-dark-text-secondary">
          <p className="text-lg mb-2">没有打开的笔记</p>
          <p className="text-sm">创建新笔记或从文件列表中打开现有笔记</p>
        </div>
      </div>
    )
  }

  if (state.panes.length === 1) {
    return <PaneView pane={state.panes[0]} />
  }

  // Multiple panes - render with resizable vertical split
  const renderPanes = () => {
    if (state.panes.length === 2) {
      return (
        <Resizable direction="vertical" className="flex flex-1">
          <ResizablePanel defaultSize={50} minSize={20}>
            <PaneView pane={state.panes[0]} />
          </ResizablePanel>
          <ResizableHandle className="h-px bg-light-border dark:bg-dark-border" />
          <ResizablePanel defaultSize={50} minSize={20}>
            <PaneView pane={state.panes[1]} />
          </ResizablePanel>
        </Resizable>
      )
    }

    // For more than 2 panes, create a more complex layout
    return (
      <div className="flex flex-1">
        {state.panes.map(pane => (
          <div key={pane.id} className="flex-1 min-w-0">
            <PaneView pane={pane} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-light-bg dark:bg-dark-bg">
      {renderPanes()}
    </div>
  )
}