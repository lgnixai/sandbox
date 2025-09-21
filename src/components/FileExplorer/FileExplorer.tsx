import { useState, useCallback } from 'react';
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
  Edit3,
  Trash2
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
    syncFileTreeWithNotes,
    selectedNodeId,
    startRename,
    deleteNoteAndCloseTabs,
    deleteNode,
    deleteFolder,
    getChildNodes
  } = useAppStore();
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 创建新文件
  const createNewFile = useCallback(async (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
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
    
    try {
      // 创建文件节点（这会调用后端API）
      const fileId = await createFileInFolder('/workspace/笔记', title, type);
      
      // 添加笔记
      addNote({
        id: fileId,
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
      await syncFileTreeWithNotes();
    } catch (error) {
      console.error('创建文件失败:', error);
    }
  }, [addNote, createFileInFolder, syncFileTreeWithNotes]);

  // 创建新文件夹
  const createNewFolder = useCallback(async () => {
    const folderName = `新文件夹-${Date.now()}`;
    try {
      await createFolder('/workspace/笔记', folderName);
      await syncFileTreeWithNotes();
    } catch (error) {
      console.error('创建文件夹失败:', error);
    }
  }, [createFolder, syncFileTreeWithNotes]);

  // 处理重命名选中的文件
  const handleRenameSelected = useCallback(() => {
    if (selectedNodeId) {
      startRename(selectedNodeId);
    }
  }, [selectedNodeId, startRename]);

  // 处理删除选中的文件或文件夹
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      // 获取选中的节点信息
      const nodes = getChildNodes('/workspace');
      const findNodeRecursively = (nodes: any[], id: string): any => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.type === 'folder') {
            const found = findNodeRecursively(getChildNodes(node.path), id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const selectedNode = findNodeRecursively(nodes, selectedNodeId);
      if (!selectedNode) return;
      
      const isFolder = selectedNode.type === 'folder';
      const itemType = isFolder ? '文件夹' : '文件';
      const confirmMessage = `确定要删除这个${itemType}吗？${isFolder ? '文件夹内的所有文件和子文件夹也会被删除，相关的标签页也会被关闭。' : ''}此操作无法撤销。`;
      
      if (confirm(confirmMessage)) {
        if (isFolder) {
          // 删除文件夹
          deleteFolder(selectedNode.path);
        } else {
          // 删除文件，先关闭相关的标签页
          deleteNoteAndCloseTabs(selectedNodeId);
          deleteNode(selectedNodeId);
        }
        // 同步文件树
        syncFileTreeWithNotes().catch(console.error);
      }
    }
  }, [selectedNodeId, deleteNoteAndCloseTabs, deleteNode, deleteFolder, getChildNodes, syncFileTreeWithNotes]);

  // 检查当前是否选中了文件或文件夹
  const hasSelectedItem = selectedNodeId && (() => {
    const nodes = getChildNodes('/workspace');
    const findNodeRecursively = (nodes: any[], id: string): any => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.type === 'folder') {
          const found = findNodeRecursively(getChildNodes(node.path), id);
          if (found) return found;
        }
      }
      return null;
    };
    return findNodeRecursively(nodes, selectedNodeId);
  })();

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
          {/* 如果选中了文件或文件夹，显示操作选项 */}
          {hasSelectedItem && (
            <>
              <ContextMenuItem onClick={handleRenameSelected}>
                <Edit3 size={16} className="mr-2" />
                重命名
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={handleDeleteSelected}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 size={16} className="mr-2" />
                删除
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          
          {/* 创建文件选项 */}
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