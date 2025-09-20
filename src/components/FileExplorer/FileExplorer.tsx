import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus,
  Search,
  MoreHorizontal,
  Folder,
  FolderOpen,
  File,
  Edit3,
  Trash2,
  FolderPlus,
  Eye,
  Database,
  Image,
  Code,
  Globe,
  Copy as CopyIcon
} from 'lucide-react'
import { useAppStore } from '../../stores'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface FileTreeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileTreeItem[]
  isExpanded?: boolean
}

export function FileExplorer() {
  const {
    notes,
    expandedFolders,
    selectedFileId,
    leftActivePanel,
    toggleFolder,
    setSelectedFile,
    addNote,
    renameNote,
    deleteNote,
    duplicateNote,
    moveNote,
    createFolder,
    renameFolder,
    deleteFolder,
    selectFileInEditor,
    createFileInEditor
  } = useAppStore()
  
  const [renamingItem, setRenamingItem] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [draggedItem, setDraggedItem] = useState<FileTreeItem | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // 从笔记数据构建文件树
  const buildFileTree = (): FileTreeItem[] => {
    const folders: Record<string, FileTreeItem> = {}
    
    // 创建基础文件夹结构
    const createFolderItem = (name: string, path: string): FileTreeItem => ({
      id: `folder-${path}`,
      name,
      type: 'folder',
      path,
      children: [],
      isExpanded: expandedFolders.has(path)
    })
    
    // 添加默认文件夹
    const workspaceFolder = createFolderItem('工作区', '/workspace')
    const notesFolder = createFolderItem('笔记', '/workspace/笔记')
    const draftFolder = createFolderItem('草稿', '/workspace/草稿')
    
    folders['/workspace'] = workspaceFolder
    folders['/workspace/笔记'] = notesFolder
    folders['/workspace/草稿'] = draftFolder
    
    workspaceFolder.children = [notesFolder, draftFolder]
    
    // 将笔记添加到对应文件夹
    Object.values(notes).forEach(note => {
      const fileItem: FileTreeItem = {
        id: note.id,
        name: note.title,
        type: 'file',
        path: `${note.folder || '/workspace/笔记'}/${note.title}.md`
      }
      
      // 根据 folder 字段决定添加到哪个文件夹
      const targetFolderPath = note.folder || '/workspace/笔记'
      if (targetFolderPath === '/workspace/笔记') {
        notesFolder.children!.push(fileItem)
      } else if (targetFolderPath === '/workspace/草稿') {
        draftFolder.children!.push(fileItem)
      } else {
        // 默认添加到笔记文件夹
        notesFolder.children!.push(fileItem)
      }
    })
    
    // 排序
    const sortItems = (items: FileTreeItem[]) => {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      items.forEach(item => {
        if (item.children) {
          sortItems(item.children)
        }
      })
    }
    
    sortItems(workspaceFolder.children!)
    
    return [workspaceFolder]
  }

  const fileTree = buildFileTree()

  const handleFileClick = (item: FileTreeItem) => {
    if (item.type === 'file') {
      // 单击：预览模式（可复用）
      selectFileInEditor(item.id, { openMode: 'preview' })
      setSelectedFile(item.id)
    } else {
      toggleFolder(item.path)
    }
  }

  const handleFileDoubleClick = (item: FileTreeItem) => {
    if (item.type === 'file') {
      // 双击：固定模式
      selectFileInEditor(item.id, { openMode: 'pinned' })
    }
  }

  const createNewFile = (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', targetFolder?: string) => {
    const id = `note-${Date.now()}`
    let title = '新文件'
    let content = ''
    
    switch (type) {
      case 'markdown':
        title = '新笔记'
        content = '# 新笔记\n\n开始编辑这个笔记...'
        break
      case 'database':
        title = '新数据库'
        content = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2)
        break
      case 'canvas':
        title = '新画图'
        content = ''
        break
      case 'html':
        title = '新页面'
        content = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>'
        break
      case 'code':
        title = '新代码'
        content = '// JavaScript 代码\nconsole.log("Hello World!");'
        break
    }
    
    const note = {
      id,
      title,
      content,
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: type,
      folder: targetFolder || '/workspace/笔记' // 使用目标文件夹
    }
    
    // 添加笔记到 store
    addNote(note)
    
    // 使用编辑器回调函数来创建和打开文件
    createFileInEditor(type)
    
    setSelectedFile(id)
    
    // 自动开始重命名新创建的文件
    setTimeout(() => {
      setRenamingItem(id)
      setNewItemName(title)
    }, 100)
  }

  const createNewNote = () => createNewFile('markdown')

  // 在指定文件夹下创建文件的函数
  const createFileInFolder = (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folderPath: string) => {
    // 使用编辑器回调来创建文件，同时传递文件夹信息
    createFileInEditor(type, folderPath)
    
    // 同时在 notes store 中创建笔记记录
    const id = `note-${Date.now()}`
    let title = '新文件'
    let content = ''
    
    switch (type) {
      case 'markdown':
        title = '新笔记'
        content = '# 新笔记\n\n开始编辑这个笔记...'
        break
      case 'database':
        title = '新数据库'
        content = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2)
        break
      case 'canvas':
        title = '新画图'
        content = ''
        break
      case 'html':
        title = '新页面'
        content = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>'
        break
      case 'code':
        title = '新代码'
        content = '// JavaScript 代码\nconsole.log("Hello World!");'
        break
    }
    
    const note = {
      id,
      title,
      content,
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: type,
      folder: folderPath // 使用传入的文件夹路径
    }
    
    addNote(note)
    setSelectedFile(id)
    
    // 自动开始重命名新创建的文件
    setTimeout(() => {
      setRenamingItem(id)
      setNewItemName(title)
    }, 100)
  }

  const createNewFolderItem = () => {
    const folderName = '新文件夹'
    const path = `/workspace/笔记/${folderName}`
    createFolder(path, folderName)
  }

  const handleRename = (item: FileTreeItem, newName: string) => {
    if (item.type === 'file') {
      renameNote(item.id, newName)
    } else {
      renameFolder(item.path, newName)
    }
    setRenamingItem(null)
    setNewItemName('')
  }

  const handleDelete = (item: FileTreeItem) => {
    if (confirm(`确定要删除 "${item.name}" 吗？`)) {
      if (item.type === 'file') {
        deleteNote(item.id)
      } else {
        deleteFolder(item.path)
      }
    }
  }

  const handleDuplicate = (item: FileTreeItem) => {
    if (item.type === 'file') {
      duplicateNote(item.id)
    }
  }

  const handleMove = (item: FileTreeItem, targetFolder: string) => {
    if (item.type === 'file') {
      moveNote(item.id, targetFolder)
    }
  }

  const handleCopyPath = (item: FileTreeItem) => {
    navigator.clipboard.writeText(item.path)
  }

  const handleDragStart = (item: FileTreeItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent, targetItem?: FileTreeItem) => {
    e.preventDefault()
    if (targetItem && targetItem.type === 'folder') {
      setDragOverItem(targetItem.id)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (targetItem: FileTreeItem, e: React.DragEvent) => {
    e.preventDefault()
    setDragOverItem(null)
    if (draggedItem && targetItem.type === 'folder' && draggedItem.id !== targetItem.id) {
      handleMove(draggedItem, targetItem.path)
      setDraggedItem(null)
    }
  }

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在文件浏览器聚焦时处理快捷键
      if (leftActivePanel !== 'files') return
      
      if (e.key === 'Delete' && selectedFileId) {
        const selectedItem = findItemById(fileTree, selectedFileId)
        if (selectedItem) {
          handleDelete(selectedItem)
        }
      } else if (e.key === 'F2' && selectedFileId) {
        setRenamingItem(selectedFileId)
        const selectedItem = findItemById(fileTree, selectedFileId)
        if (selectedItem) {
          setNewItemName(selectedItem.name)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [leftActivePanel, selectedFileId, fileTree])

  // 辅助函数：根据ID查找文件项
  const findItemById = (items: FileTreeItem[], id: string): FileTreeItem | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findItemById(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border">
        <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          笔记
        </span>
        <div className="flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                title="新建"
              >
                <Plus size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => createNewFile('markdown')}>
                <FileText size={16} className="mr-2" />
                新建Markdown文档
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('database')}>
                <Database size={16} className="mr-2" />
                新建数据库
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('canvas')}>
                <Image size={16} className="mr-2" />
                新建画图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('html')}>
                <Globe size={16} className="mr-2" />
                新建HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('code')}>
                <Code size={16} className="mr-2" />
                新建代码
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={createNewFolderItem}>
                <FolderPlus size={16} className="mr-2" />
                新建文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="搜索"
          >
            <Search size={14} />
          </button>
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="更多选项"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
        {fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <FileText size={32} className="mb-2 opacity-50" />
            <p className="text-sm text-center">暂无笔记</p>
            <button
              onClick={createNewNote}
              className="mt-2 text-xs text-light-accent dark:text-dark-accent hover:underline"
            >
              创建第一个笔记
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {fileTree.map(item => (
              <FileItem
                key={item.id}
                item={item}
                onClick={handleFileClick}
                onDoubleClick={handleFileDoubleClick}
                depth={0}
                selectedFileId={selectedFileId}
                onRename={handleRename}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onMove={handleMove}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                dragOverItem={dragOverItem}
                renamingItem={renamingItem}
                setRenamingItem={setRenamingItem}
                newItemName={newItemName}
                setNewItemName={setNewItemName}
                onCopyPath={handleCopyPath}
                onCreateNewFolder={createNewFolderItem}
                onCreateFileInFolder={createFileInFolder}
              />
            ))}
          </div>
        )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => createNewFile('markdown')}>
            <FileText size={16} className="mr-2" />
            新建Markdown文档
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('database')}>
            <Database size={16} className="mr-2" />
            新建数据库
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('canvas')}>
            <Image size={16} className="mr-2" />
            新建画图
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('html')}>
            <Globe size={16} className="mr-2" />
            新建HTML
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('code')}>
            <Code size={16} className="mr-2" />
            新建代码
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={createNewFolderItem}>
            <FolderPlus size={16} className="mr-2" />
            新建文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

interface FileItemProps {
  item: FileTreeItem
  onClick: (item: FileTreeItem) => void
  onDoubleClick: (item: FileTreeItem) => void
  depth: number
  selectedFileId?: string | null
  onRename: (item: FileTreeItem, newName: string) => void
  onDelete: (item: FileTreeItem) => void
  onDuplicate: (item: FileTreeItem) => void
  onMove: (item: FileTreeItem, targetFolder: string) => void
  onDragStart: (item: FileTreeItem) => void
  onDragOver: (e: React.DragEvent, targetItem?: FileTreeItem) => void
  onDragLeave: () => void
  onDrop: (targetItem: FileTreeItem, e: React.DragEvent) => void
  dragOverItem: string | null
  renamingItem: string | null
  setRenamingItem: (id: string | null) => void
  newItemName: string
  setNewItemName: (name: string) => void
  onCopyPath: (item: FileTreeItem) => void
  onCreateNewFolder: () => void
  onCreateFileInFolder: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folderPath: string) => void
}

function FileItem({ 
  item, 
  onClick, 
  onDoubleClick, 
  depth, 
  selectedFileId,
  onRename,
  onDelete,
  onDuplicate,
  onMove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverItem,
  renamingItem,
  setRenamingItem,
  newItemName,
  setNewItemName,
  onCopyPath,
  onCreateNewFolder,
  onCreateFileInFolder
}: FileItemProps) {
  const { expandedFolders } = useAppStore()
  
  const isExpanded = item.type === 'folder' ? expandedFolders.has(item.path) : false
  const isSelected = item.type === 'file' && selectedFileId === item.id
  const isRenaming = renamingItem === item.id
  const isDragOver = dragOverItem === item.id

  const handleClick = () => {
    onClick(item)
  }

  const handleDoubleClick = () => {
    onDoubleClick(item)
  }

  const handleRenameStart = () => {
    setRenamingItem(item.id)
    setNewItemName(item.name)
  }

  const handleRenameSubmit = () => {
    if (newItemName.trim() && newItemName !== item.name) {
      onRename(item, newItemName.trim())
    } else {
      setRenamingItem(null)
      setNewItemName('')
    }
  }

  const handleRenameCancel = () => {
    setRenamingItem(null)
    setNewItemName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      handleRenameCancel()
    }
  }

  const paddingLeft = depth * 12 + 4

  const getIcon = () => {
    if (item.type === 'folder') {
      return isExpanded ? (
        <FolderOpen size={16} className="text-blue-500 dark:text-blue-400" />
      ) : (
        <Folder size={16} className="text-blue-500 dark:text-blue-400" />
      )
    } else {
      return <File size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
    }
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`file-tree-item flex items-center py-1 px-1 rounded text-sm cursor-pointer transition-colors group ${
              isSelected 
                ? 'selected bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent' 
                : isDragOver && item.type === 'folder'
                ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600'
                : 'hover:bg-light-hover dark:hover:bg-dark-hover'
            }`}
            style={{ paddingLeft }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            draggable={!isRenaming}
            onDragStart={() => onDragStart(item)}
            onDragOver={(e) => onDragOver(e, item)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(item, e)}
          >
            {item.type === 'folder' && (
              <div className="flex-shrink-0 mr-1">
                {isExpanded ? (
                  <ChevronDown size={14} className="text-light-text-secondary dark:text-dark-text-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-light-text-secondary dark:text-dark-text-secondary" />
                )}
              </div>
            )}
            
            <div className="flex-shrink-0 mr-2">
              {getIcon()}
            </div>
            
            {isRenaming ? (
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border border-light-accent dark:border-dark-accent rounded px-1 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`flex-1 truncate ${
                isSelected 
                  ? 'text-light-accent dark:text-dark-accent font-medium' 
                  : 'text-light-text dark:text-dark-text'
              }`}>
                {item.name}
              </span>
            )}
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-0.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRenameStart}>
                    <Edit3 size={16} className="mr-2" />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopyPath(item)}>
                    <CopyIcon size={16} className="mr-2" />
                    复制路径
                  </DropdownMenuItem>
                  
                  {item.type === 'folder' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onCreateFileInFolder('markdown', item.path)}>
                        <FileText size={16} className="mr-2" />
                        新建Markdown文档
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFileInFolder('database', item.path)}>
                        <Database size={16} className="mr-2" />
                        新建数据库
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFileInFolder('canvas', item.path)}>
                        <Image size={16} className="mr-2" />
                        新建画图
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFileInFolder('html', item.path)}>
                        <Globe size={16} className="mr-2" />
                        新建HTML
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFileInFolder('code', item.path)}>
                        <Code size={16} className="mr-2" />
                        新建代码
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onCreateNewFolder}>
                        <FolderPlus size={16} className="mr-2" />
                        新建文件夹
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(item)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 size={16} className="mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {item.type === 'file' && (
            <>
              <ContextMenuItem onClick={() => onClick(item)}>
                <Eye size={16} className="mr-2" />
                打开
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRenameStart}>
            <Edit3 size={16} className="mr-2" />
            重命名
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCopyPath(item)}>
            <CopyIcon size={16} className="mr-2" />
            复制路径
          </ContextMenuItem>
          
          {item.type === 'folder' && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onCreateFileInFolder('markdown', item.path)}>
                <FileText size={16} className="mr-2" />
                新建Markdown文档
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFileInFolder('database', item.path)}>
                <Database size={16} className="mr-2" />
                新建数据库
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFileInFolder('canvas', item.path)}>
                <Image size={16} className="mr-2" />
                新建画图
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFileInFolder('html', item.path)}>
                <Globe size={16} className="mr-2" />
                新建HTML
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFileInFolder('code', item.path)}>
                <Code size={16} className="mr-2" />
                新建代码
              </ContextMenuItem>
              <ContextMenuItem onClick={onCreateNewFolder}>
                <FolderPlus size={16} className="mr-2" />
                新建文件夹
              </ContextMenuItem>
            </>
          )}
          
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDelete(item)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 size={16} className="mr-2" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {item.type === 'folder' && isExpanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileItem
              key={child.id}
              item={child}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              depth={depth + 1}
              selectedFileId={selectedFileId}
              onRename={onRename}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dragOverItem={dragOverItem}
              renamingItem={renamingItem}
              setRenamingItem={setRenamingItem}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              onCopyPath={onCopyPath}
              onCreateNewFolder={onCreateNewFolder}
              onCreateFileInFolder={onCreateFileInFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}