import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderPlus, FilePlus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { FsNode } from '@/api/fs';
import { getTree, createFile as apiCreateFile, createFolder as apiCreateFolder, movePath as apiMovePath } from '@/api/fs';
import { connectWS, addFsListener } from '@/lib/ws';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  parentId?: string;
  children?: string[];
  isExpanded?: boolean;
  content?: string;
}

interface FileTreeProps {
  onFileSelect?: (file: FileItem) => void;
  selectedFileId?: string;
  onTreeChange?: (files: Record<string, FileItem>) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedFileId, onTreeChange }) => {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [rootItems, setRootItems] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  
  // 防抖定时器引用
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toId = useCallback((p: string) => p, []);

  const buildFromFs = useCallback((node: FsNode): { map: Record<string, FileItem>; roots: string[] } => {
    const map: Record<string, FileItem> = {};
    const roots: string[] = [];

    const walk = (n: FsNode, parentId?: string, depth: number = 0) => {
      if (n.type === 'folder' && n.children) {
        // Skip adding synthetic root node as an item; add children as roots
        if (n.path === '/' && !parentId) {
          n.children.forEach(child => walk(child, undefined, depth + 1));
          return;
        }
      }

      const id = toId(n.path);
      const item: FileItem = {
        id,
        name: n.name,
        type: n.type as 'file' | 'folder',
        fileType: n.fileType as any,
        path: n.path,
        parentId,
        children: n.type === 'folder' ? [] : undefined,
        isExpanded: n.type === 'folder' ? (n.path === '/' ? true : false) : undefined,
      };
      map[id] = item;
      if (!parentId) {
        roots.push(id);
      } else if (parentId) {
        const parent = map[parentId];
        if (parent && parent.children) parent.children.push(id);
      }

      if (n.children && n.children.length > 0) {
        n.children.forEach(child => walk(child, id, depth + 1));
      }
    };

    walk(node);
    return { map, roots };
  }, [toId]);

  const loadTree = useCallback(async () => {
    try {
      const data = await getTree('/');
      const { map, roots } = buildFromFs(data);
      setFiles(map);
      setRootItems(roots);
      onTreeChange?.(map);
    } catch (error) {
      console.error('Failed to load tree:', error);
    }
  }, [buildFromFs, onTreeChange]);

  // 防抖刷新函数 - 避免频繁的文件系统事件触发过多 API 调用
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadTree();
    }, 300); // 300ms 防抖
  }, [loadTree]);

  // 获取文件类型标签
  const getFileTypeLabel = (fileType?: string) => {
    switch (fileType) {
      case 'canvas': return 'CANVAS';
      case 'database': return 'BASE';
      case 'html': return 'HTML';
      case 'code': return 'CODE';
      default: return null;
    }
  };

  // Load from backend & subscribe to realtime updates
  useEffect(() => {
    // 初始加载
    loadTree();
    
    // 连接 WebSocket
    connectWS();
    
    // 订阅文件系统事件 - 使用防抖刷新
    const off = addFsListener(() => {
      debouncedRefresh();
    });
    
    // 清理函数
    return () => {
      off();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // 移除 loadTree 依赖，避免无限循环

  // Notify parent on tree changes
  useEffect(() => {
    onTreeChange?.(files);
  }, [files, onTreeChange]);

  const toggleExpand = useCallback((id: string) => {
    setFiles(prev => ({
      ...prev,
      [id]: { ...prev[id], isExpanded: !prev[id].isExpanded }
    }));
  }, []);

  const createNewItem = useCallback(async (parentId: string | null, type: 'file' | 'folder', fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    const parentPath = parentId ? files[parentId].path : '';
    let defaultName = type === 'folder' ? '新文件夹' : '新文件.md';
    let defaultContent = '';
    if (type === 'file') {
      switch (fileType) {
        case 'markdown': defaultName = '新文档.md'; defaultContent = '# 新文档\n\n在这里开始编写...'; break;
        case 'database': defaultName = '新数据库.db'; defaultContent = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2); break;
        case 'canvas': defaultName = '新画板.canvas'; break;
        case 'html': defaultName = '新页面.html'; defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>'; break;
        case 'code': defaultName = '新代码.js'; defaultContent = '// JavaScript 代码\nconsole.log("Hello World!");'; break;
        default: defaultName = '新文件.md'; defaultContent = '# 新文件\n\n在这里开始编写...'; fileType = 'markdown';
      }
    }
    const newPath = `${parentPath}/${defaultName}`.replace(/\/\/+/g, '/');
    if (type === 'folder') {
      await apiCreateFolder(newPath);
    } else {
      await apiCreateFile(newPath, defaultContent);
    }
    await loadTree();
    setEditingId(toId(newPath));
    setNewItemName(defaultName);
  }, [files, loadTree, toId]);

  const handleRename = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) { setEditingId(null); setNewItemName(''); return; }
    const item = files[id];
    if (!item) return;
    const parentPath = item.parentId ? files[item.parentId!].path : '';
    const newPath = `${parentPath}/${newName}`.replace(/\/\/+/g, '/');
    if (newPath !== item.path) {
      await apiMovePath(item.path, newPath);
      await loadTree();
    }
    setEditingId(null);
    setNewItemName('');
  }, [files, loadTree]);

  const handleFileClick = useCallback((file: FileItem) => {
    if (file.type === 'file' && onFileSelect) {
      onFileSelect(file);
    } else if (file.type === 'folder') {
      toggleExpand(file.id);
    }
  }, [onFileSelect, toggleExpand]);

  const renderFileItem = useCallback((id: string, depth: number = 0): React.ReactNode => {
    const file = files[id];
    if (!file) return null;

    const isEditing = editingId === id;
    const isSelected = selectedFileId === id;
    const typeLabel = getFileTypeLabel(file.fileType);

    return (
      <div key={id}>
        <div
          className={cn(
            "flex items-center gap-1 px-1 py-0.5 cursor-pointer group relative",
            "text-xs transition-colors duration-150",
            "min-h-[24px]", // Obsidian specification: 24px row height
            isSelected 
              ? "bg-file-selected/10 text-file-selected" 
              : "text-file-default hover:bg-background-hover hover:text-file-hover"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }} // Obsidian specification: 16px per level
          onClick={() => !isEditing && handleFileClick(file)}
          draggable={file.type === 'file' && !isEditing}
          onDragStart={(e) => {
            if (file.type === 'file') {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'obsidian-file',
                fileId: file.id,
                fileName: file.name.replace(/\.(md|canvas|db|html|js)$/, ''),
                filePath: file.path
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }
          }}
        >
          {/* Selection indicator bar */}
          {isSelected && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-file-selected" />
          )}

          {file.type === 'folder' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-3 w-3 p-0 hover:bg-transparent shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(id);
              }}
            >
              {file.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-folder-icon" />
              ) : (
                <ChevronRight className="h-3 w-3 text-folder-icon" />
              )}
            </Button>
          )}
          
          {file.type === 'folder' ? (
            <Folder className="h-4 w-4 text-folder-icon shrink-0" />
          ) : (
            <File className="h-4 w-4 text-folder-icon shrink-0" />
          )}

          {isEditing ? (
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => handleRename(id, newItemName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(id, newItemName);
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                  setNewItemName('');
                }
              }}
              className="h-5 px-1 text-xs border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-accent"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="truncate text-inherit font-normal leading-tight">
                {file.name}
              </span>
              {typeLabel && (
                <span className="px-1.5 py-0.5 text-[9px] font-medium bg-muted/50 text-muted-foreground rounded-sm uppercase tracking-wide shrink-0">
                  {typeLabel}
                </span>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setEditingId(id);
                setNewItemName(file.name);
              }}>
                重命名
              </DropdownMenuItem>
              {file.type === 'folder' && (
                <>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'file', 'markdown')}>
                    新建Markdown文档
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'file', 'database')}>
                    新建数据库
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'file', 'canvas')}>
                    新建画图
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'file', 'html')}>
                    新建HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'file', 'code')}>
                    新建代码
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(id, 'folder')}>
                    新建文件夹
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {file.type === 'folder' && file.isExpanded && file.children && (
          <div>
            {file.children.map(childId => renderFileItem(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [files, editingId, selectedFileId, newItemName, handleFileClick, toggleExpand, handleRename, createNewItem, getFileTypeLabel]);

  return (
    <div className="h-full flex flex-col bg-sidebar-background border-r border-sidebar-border obsidian-file-tree">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border bg-sidebar-background">
        <span className="text-xs font-medium text-sidebar-foreground tracking-wide">文件</span>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-sidebar-accent rounded"
            onClick={() => createNewItem(null, 'file', 'markdown')}
          >
            <FilePlus className="h-3.5 w-3.5 text-sidebar-foreground/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-sidebar-accent rounded"
            onClick={() => createNewItem(null, 'folder')}
          >
            <FolderPlus className="h-3.5 w-3.5 text-sidebar-foreground/70" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-1">
        {rootItems.map(id => renderFileItem(id))}
      </div>
    </div>
  );
};

export default FileTree;