import React, { useRef, useEffect } from 'react'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
}

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 自动调整高度
    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    textarea.addEventListener('input', adjustHeight)
    adjustHeight()

    return () => {
      textarea.removeEventListener('input', adjustHeight)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd, value } = textarea

    // Tab 键缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      const newContent = 
        value.substring(0, selectionStart) + 
        '  ' + 
        value.substring(selectionEnd)
      onChange(newContent)
      
      // 设置新的光标位置
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2
      }, 0)
    }
    
    // Enter 键自动缩进
    else if (e.key === 'Enter') {
      const currentLine = value.substring(0, selectionStart).split('\n').pop() || ''
      const indent = currentLine.match(/^(\s*)/)?.[1] || ''
      
      // 如果是列表项，自动添加列表标记
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/)
      if (listMatch) {
        e.preventDefault()
        const newContent = 
          value.substring(0, selectionStart) + 
          '\n' + listMatch[1] + listMatch[2] + ' ' +
          value.substring(selectionEnd)
        onChange(newContent)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = 
            selectionStart + listMatch[1].length + listMatch[2].length + 2
        }, 0)
      }
      // 普通缩进
      else if (indent) {
        e.preventDefault()
        const newContent = 
          value.substring(0, selectionStart) + 
          '\n' + indent + 
          value.substring(selectionEnd)
        onChange(newContent)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = 
            selectionStart + indent.length + 1
        }, 0)
      }
    }
  }

  return (
    <div className="h-full bg-light-bg dark:bg-dark-bg">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-4 bg-transparent text-light-text dark:text-dark-text font-mono text-sm leading-relaxed resize-none focus:outline-none scrollbar-thin"
        placeholder="开始输入你的想法..."
        spellCheck={false}
        style={{
          minHeight: '100%'
        }}
      />
    </div>
  )
}