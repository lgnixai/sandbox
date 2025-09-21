import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder,
  FolderOpen,
  FileText,
  Database,
  Image,
  Code,
  Globe,
  FolderPlus,
  FilePlus,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FsNode } from '@/api/fs';
import { getTree, createFile as apiCreateFile, createFolder as apiCreateFolder, movePath as apiMovePath, deletePath as apiDeletePath } from '@/api/fs';
import { connectWS, addFsListener } from '@/lib/ws';
import { useAppStore } from '@/stores';

import {
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

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
  className?: string;
  onFileSelect?: (file: FileItem) => void;
  selectedFileId?: string;
  onTreeChange?: (files: Record<string, FileItem>) => void;
}

export function FileTree({ className, onFileSelect, selectedFileId, onTreeChange }: FileTreeProps) {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [rootItems, setRootItems] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const expandedRef = useRef<Set<string>>(new Set());
  const dragSourceIdRef = useRef<string | null>(null);
  
  // 防抖定时器引用
  const refreshTimeoutRef = useRef<number | null>(null);

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
        isExpanded: n.type === 'folder' ? expandedRef.current.has(n.path) : undefined,
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

  // 获取文件图标
  const getFileIcon = (fileType?: string) => {
    const iconProps = { size: 16, className: "text-folder-icon" };
    
    switch (fileType) {
      case 'database':
        return <Database {...iconProps} />;
      case 'canvas':
        return <Image {...iconProps} />;
      case 'html':
        return <Globe {...iconProps} />;
      case 'code':
        return <Code {...iconProps} />;
      case 'markdown':
      default:
        return <FileText {...iconProps} />;
    }
  };

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
    // 恢复展开状态
    try {
      const raw = localStorage.getItem('renote.filetree.expanded');
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        const set = new Set(arr);
        setExpandedPaths(set);
        expandedRef.current = set;
      }
    } catch {}

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

  // 持久化展开状态
  useEffect(() => {
    expandedRef.current = expandedPaths;
    try { localStorage.setItem('renote.filetree.expanded', JSON.stringify(Array.from(expandedPaths))); } catch {}
  }, [expandedPaths]);

  // Notify parent on tree changes
  useEffect(() => {
    onTreeChange?.(files);
  }, [files, onTreeChange]);

  const toggleExpand = useCallback((id: string) => {
    setFiles(prev => {
      const next = { ...prev } as Record<string, FileItem>;
      const current = next[id];
      if (!current) return prev;
      const newExpanded = !current.isExpanded;
      next[id] = { ...current, isExpanded: newExpanded };
      setExpandedPaths((s) => {
        const ns = new Set(s);
        if (newExpanded) ns.add(current.path); else ns.delete(current.path);
        return ns;
      });
      return next;
    });
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
    // 保持父级及新建项展开
    const parentPathToKeep = parentId ? files[parentId].path : undefined;
    if (parentPathToKeep) {
      setExpandedPaths((s) => new Set(s).add(parentPathToKeep));
    }
    if (type === 'folder') {
      setExpandedPaths((s) => new Set(s).add(newPath));
    }
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

  const { editorCallbacks, selectNode, selectedNodeId } = useAppStore();

  // 处理文件/文件夹点击
  const handleNodeClick = useCallback((file: FileItem) => {
    if (file.type === 'file') {
      onFileSelect?.(file);
      // 通知编辑器打开
      editorCallbacks.onFileSelect?.({
        id: file.id,
        name: file.name,
        type: 'file',
        fileType: file.fileType,
        path: file.path,
      } as any, { openMode: 'preview' });
      // 同步树选中
      selectNode(file.id);
    } else if (file.type === 'folder') {
      toggleExpand(file.id);
    }
  }, [onFileSelect, toggleExpand, editorCallbacks, selectNode]);

  const handleDelete = useCallback(async (item: FileItem) => {
    try {
      await apiDeletePath(item.path);
      await loadTree();
      // 若删除的是选中项，清除选中
      if (selectedNodeId === item.id) {
        selectNode(null as any);
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  }, [loadTree, selectNode, selectedNodeId]);

  const handleDragStart = useCallback((item: FileItem, e: React.DragEvent) => {
    if (editingId) return;
    dragSourceIdRef.current = item.id;
    try { e.dataTransfer.setData('text/plain', item.id); } catch {}
    e.dataTransfer.effectAllowed = 'move';
  }, [editingId]);

  const handleDragOverFolder = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnFolder = useCallback(async (target: FileItem, e: React.DragEvent) => {
    e.preventDefault();
    if (target.type !== 'folder') return;
    const sourceId = dragSourceIdRef.current || ((): string | null => {
      try { return e.dataTransfer.getData('text/plain'); } catch { return null; }
    })();
    if (!sourceId) return;
    const source = files[sourceId];
    if (!source || source.id === target.id) return;
    const newPath = `${target.path}/${source.name}`.replace(/\/+/g, '/');
    if (newPath === source.path) return;
    try {
      await apiMovePath(source.path, newPath);
      // 目标自动展开
      setExpandedPaths((s) => new Set(s).add(target.path));
      await loadTree();
    } catch (err) {
      console.error('Move failed:', err);
    } finally {
      dragSourceIdRef.current = null;
    }
  }, [files, loadTree]);

  // 处理双击（固定标签页）
  const handleNodeDoubleClick = useCallback((file: FileItem) => {
    if (file.type === 'file' && onFileSelect) {
      // 双击文件时，可以触发特殊的打开模式，比如固定标签页
      // 这里先保持和单击相同的逻辑，后续可以根据需要扩展
      onFileSelect(file);
    }
  }, [onFileSelect]);

  function Tree({ item }: { item: FileItem }) {
    const isEditing = editingId === item.id;
    const isSelected = (selectedFileId || selectedNodeId) === item.id;
    const typeLabel = getFileTypeLabel(item.fileType);

    return (
      <SidebarMenuItem key={item.id}>
        <div
          className={cn(
            "flex items-center gap-1 px-1 py-0.5 cursor-pointer group relative",
            "text-xs transition-colors duration-150",
            "min-h-[24px]", // Obsidian specification: 24px row height
            isSelected 
              ? "bg-file-selected/10 text-file-selected" 
              : "text-file-default hover:bg-background-hover hover:text-file-hover"
          )}
          onClick={() => !isEditing && handleNodeClick(item)}
          onDoubleClick={() => !isEditing && handleNodeDoubleClick(item)}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(item, e)}
        >
          {/* Selection indicator bar */}
          {isSelected && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-file-selected" />
          )}

          {item.type === 'folder' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-3 w-3 p-0 hover:bg-transparent shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
            >
              {item.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-folder-icon" />
              ) : (
                <ChevronRight className="h-3 w-3 text-folder-icon" />
              )}
            </Button>
          )}
          
          {item.type === 'folder' ? (
            item.isExpanded ? (
              <FolderOpen className="h-4 w-4 text-folder-icon shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-folder-icon shrink-0" />
            )
          ) : (
            getFileIcon(item.fileType)
          )}

          {isEditing ? (
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => handleRename(item.id, newItemName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(item.id, newItemName);
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
                {item.name}
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
                setEditingId(item.id);
                setNewItemName(item.name);
              }}>
                重命名
              </DropdownMenuItem>
              {item.type === 'folder' && (
                <>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'markdown')}>
                    新建Markdown文档
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'database')}>
                    新建数据库
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'canvas')}>
                    新建画图
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'html')}>
                    新建HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'code')}>
                    新建代码
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'folder')}>
                    新建文件夹
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item)}>
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {item.type === 'folder' && item.isExpanded && item.children && (
          <SidebarMenuSub
            onDragOver={handleDragOverFolder}
            onDrop={(e) => handleDropOnFolder(item, e)}
          >
            {item.children.map(childId => {
              const childItem = files[childId];
              return childItem ? <Tree key={childId} item={childItem} /> : null;
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-sidebar-background border-r border-sidebar-border", className)}>
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
        <SidebarProvider>
          <SidebarMenu>
            {rootItems.map(id => {
              const item = files[id];
              return item ? <Tree key={id} item={item} /> : null;
            })}
          </SidebarMenu>
        </SidebarProvider>
      </div>
    </div>
  );
}