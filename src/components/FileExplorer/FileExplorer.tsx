import React, { useState, useCallback, useEffect } from 'react';
import { 
  Plus,
  Search,
  MoreHorizontal,
  FolderPlus,
  FileText,
  Database,
  Image,
  Code,
  Globe,
  RefreshCw
} from 'lucide-react';
import { useFileSystemStore, useEditorStore, useNoteStore } from '@/stores/unified';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { FileTree } from './FileTree';
import { Input } from '../ui/input';

export function FileExplorer() {
  const {
    searchQuery,
    search,
    clearSearch,
    loadTree,
    createFile,
    createFolder,
    loading
  } = useFileSystemStore();
  
  const { createNote } = useNoteStore();
  const { openFile } = useEditorStore();
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // 初始加载文件树
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 创建新文件
  const createNewFile = useCallback(async (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    const parentPath = '/workspace/notes';
    let fileName = '';
    
    switch (type) {
      case 'markdown':
        fileName = `新笔记-${Date.now()}.md`;
        break;
      case 'database':
        fileName = `新数据库-${Date.now()}.db`;
        break;
      case 'canvas':
        fileName = `新画板-${Date.now()}.canvas`;
        break;
      case 'html':
        fileName = `新页面-${Date.now()}.html`;
        break;
      case 'code':
        fileName = `新代码-${Date.now()}.js`;
        break;
    }
    
    // 创建文件
    if (type === 'markdown') {
      const path = `${parentPath}/${fileName}`;
      const title = fileName.replace('.md', '');
      const note = await createNote(path, title);
      
      if (note) {
        openFile(note.id, note.name);
      }
    } else {
      await createFile(parentPath, fileName, type);
      // TODO: 获取创建的文件并打开
    }
  }, [createFile, createNote, openFile]);

  // 创建新文件夹
  const createNewFolder = useCallback(async () => {
    const parentPath = '/workspace/notes';
    const folderName = `新文件夹-${Date.now()}`;
    await createFolder(parentPath, folderName);
  }, [createFolder]);

  // 搜索处理
  const handleSearch = useCallback((query: string) => {
    setLocalSearchQuery(query);
    if (query.trim()) {
      search(query);
    } else {
      clearSearch();
    }
  }, [search, clearSearch]);

  // 刷新文件树
  const handleRefresh = useCallback(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border">
        <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          文件
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
                新建 Markdown 文档
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('database')}>
                <Database size={16} className="mr-2" />
                新建数据库
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('canvas')}>
                <Image size={16} className="mr-2" />
                新建画板
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('html')}>
                <Globe size={16} className="mr-2" />
                新建 HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('code')}>
                <Code size={16} className="mr-2" />
                新建代码
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={createNewFolder}>
                <FolderPlus size={16} className="mr-2" />
                新建文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="搜索"
            onClick={() => setIsSearchVisible(!isSearchVisible)}
          >
            <Search size={14} />
          </button>
          
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="刷新"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="更多选项"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      {isSearchVisible && (
        <div className="p-2 border-b border-light-border dark:border-dark-border">
          <Input
            type="text"
            placeholder="搜索文件..."
            value={localSearchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      )}

      {/* 文件树 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-hidden">
            <FileTree className="h-full" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => createNewFile('markdown')}>
            <FileText size={16} className="mr-2" />
            新建 Markdown 文档
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('database')}>
            <Database size={16} className="mr-2" />
            新建数据库
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('canvas')}>
            <Image size={16} className="mr-2" />
            新建画板
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('html')}>
            <Globe size={16} className="mr-2" />
            新建 HTML
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('code')}>
            <Code size={16} className="mr-2" />
            新建代码
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={createNewFolder}>
            <FolderPlus size={16} className="mr-2" />
            新建文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}