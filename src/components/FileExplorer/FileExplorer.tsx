import React, { useState, useCallback } from 'react';
import { 
  Plus,
  Search,
  MoreHorizontal,
  FolderPlus,
  FileText,
  Database,
  Image,
  Code,
  Globe
} from 'lucide-react';
import { useAppStore } from '@/stores';
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
    setSearchQuery,
    createFileInFolder,
    createFolder,
    addNote,
    syncFileTreeWithNotes
  } = useAppStore();
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 创建新文件
  const createNewFile = useCallback((type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    const id = `note-${Date.now()}`;
    let title = '新文件';
    let content = '';
    
    switch (type) {
      case 'markdown':
        title = '新笔记';
        content = '# 新笔记\n\n开始编辑这个笔记...';
        break;
      case 'database':
        title = '新数据库';
        content = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2);
        break;
      case 'canvas':
        title = '新画板';
        content = '';
        break;
      case 'html':
        title = '新页面';
        content = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>';
        break;
      case 'code':
        title = '新代码';
        content = '// JavaScript 代码\nconsole.log("Hello World!");';
        break;
    }
    
    // 添加笔记
    addNote({
      id,
      title,
      content,
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: type,
      folder: '/workspace/笔记'
    });
    
    // 同步文件树
    syncFileTreeWithNotes();
    
    // 创建文件节点
    createFileInFolder('/workspace/笔记', title, type);
  }, [addNote, createFileInFolder, syncFileTreeWithNotes]);

  // 创建新文件夹
  const createNewFolder = useCallback(() => {
    const folderName = `新文件夹-${Date.now()}`;
    createFolder('/workspace/笔记', folderName);
  }, [createFolder]);

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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