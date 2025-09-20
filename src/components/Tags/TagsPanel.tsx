import React, { useMemo } from 'react'
import { Hash, FileText } from 'lucide-react'
import { useAppStore } from '../../stores'

export function TagsPanel() {
  const { notes, setLeftPanel, openNoteInTabWithTitle } = useAppStore()

  // 从笔记中提取标签
  const tags = useMemo(() => {
    const tagMap = new Map<string, string[]>()

    Object.values(notes).forEach(note => {
      // 从内容中提取 #标签
      const tagMatches = note.content.match(/#\w+/g)
      if (tagMatches) {
        tagMatches.forEach(tag => {
          const tagName = tag.substring(1) // 移除 # 号
          if (!tagMap.has(tagName)) {
            tagMap.set(tagName, [])
          }
          tagMap.get(tagName)!.push(note.id)
        })
      }
    })

    // 转换为数组并排序
    return Array.from(tagMap.entries())
      .map(([name, noteIds]) => ({
        name,
        count: noteIds.length,
        noteIds: [...new Set(noteIds)] // 去重
      }))
      .sort((a, b) => b.count - a.count)
  }, [notes])

  const handleTagClick = (_tagName: string) => {
    // 切换到搜索面板并搜索该标签
    setLeftPanel('search')
  }

  const handleNoteClick = (noteId: string) => {
    openNoteInTabWithTitle(noteId)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tags.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <Hash size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">暂无标签</p>
              <p className="text-xs">在笔记中使用 #标签名 来创建标签</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="space-y-2">
              {tags.map(tag => (
                <TagItem
                  key={tag.name}
                  name={tag.name}
                  count={tag.count}
                  noteIds={tag.noteIds}
                  onTagClick={handleTagClick}
                  onNoteClick={handleNoteClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface TagItemProps {
  name: string
  count: number
  noteIds: string[]
  onTagClick: (tagName: string) => void
  onNoteClick: (noteId: string) => void
}

function TagItem({ name, count, noteIds, onTagClick: _, onNoteClick }: TagItemProps) {
  const { notes } = useAppStore()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const notesList = noteIds.map(id => notes[id]).filter(Boolean)

  return (
    <div className="border border-light-border dark:border-dark-border rounded-lg p-2">
      {/* 标签头部 */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover p-1 rounded transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Hash size={14} className="mr-2 text-light-accent dark:text-dark-accent" />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            {name}
          </span>
        </div>
        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-light-hover dark:bg-dark-hover px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>

      {/* 展开的笔记列表 */}
      {isExpanded && (
        <div className="mt-2 ml-4 space-y-1">
          {notesList.map(note => (
            <div
              key={note.id}
              className="flex items-center p-1 rounded cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              onClick={() => onNoteClick(note.id)}
            >
              <FileText size={12} className="mr-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
              <span className="text-xs text-light-text dark:text-dark-text truncate">
                {note.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}