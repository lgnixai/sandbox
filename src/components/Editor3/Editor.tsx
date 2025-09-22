import { useState, useCallback, useRef, useEffect } from 'react'
import { Edit, Eye, SplitSquareHorizontal } from 'lucide-react'
import { useAppContext, Note } from '../../contexts/AppContext'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownEditor } from './MarkdownEditor'

interface EditorProps {
  note: Note
}

export function Editor({ note }: EditorProps) {
  const { state, dispatch } = useAppContext()
  const [content, setContent] = useState(note.content)
  const saveTimeoutRef = useRef<number>()

  // 保存内容到 store
  const saveContent = useCallback((newContent: string) => {
    if (newContent !== note.content) {
      dispatch({
        type: 'UPDATE_NOTE',
        noteId: note.id,
        updates: { content: newContent }
      })
    }
  }, [note.id, note.content, dispatch])

  // 防抖保存
  const debouncedSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent)
    }, 500)
  }, [saveContent])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    debouncedSave(newContent)
  }, [debouncedSave])

  // 当切换笔记时更新内容
  useEffect(() => {
    setContent(note.content)
  }, [note.id, note.content])

  const setEditorMode = (mode: 'edit' | 'preview' | 'split') => {
    dispatch({ type: 'SET_EDITOR_MODE', mode })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 编辑器工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-panel">
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-foreground">
            {note.title}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setEditorMode('edit')}
            className={`p-2 rounded text-sm transition-colors ${
              state.editorMode === 'edit'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-nav-hover text-muted-foreground'
            }`}
            title="编辑模式"
          >
            <Edit size={16} />
          </button>
          
          <button
            onClick={() => setEditorMode('preview')}
            className={`p-2 rounded text-sm transition-colors ${
              state.editorMode === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-nav-hover text-muted-foreground'
            }`}
            title="预览模式"
          >
            <Eye size={16} />
          </button>
          
          <button
            onClick={() => setEditorMode('split')}
            className={`p-2 rounded text-sm transition-colors ${
              state.editorMode === 'split'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-nav-hover text-muted-foreground'
            }`}
            title="分屏模式"
          >
            <SplitSquareHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 编辑器内容区 */}
      <div className="flex-1 min-h-0">
        {state.editorMode === 'edit' && (
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
          />
        )}
        
        {state.editorMode === 'preview' && (
          <MarkdownPreview content={content} />
        )}
        
        {state.editorMode === 'split' && (
          <div className="flex h-full">
            <div className="flex-1 border-r border-border">
              <MarkdownEditor
                content={content}
                onChange={handleContentChange}
              />
            </div>
            <div className="flex-1">
              <MarkdownPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}