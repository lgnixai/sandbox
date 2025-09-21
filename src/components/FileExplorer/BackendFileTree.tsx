import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Folder,
  FolderOpen,
  Database,
  Image,
  Code,
  Globe,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2
} from 'lucide-react';
import { documentApi, type FileTreeNode } from '@/lib/api/documentApi';
import { cn } from '@/lib/utils';
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

interface BackendFileTreeProps {
  className?: string;
  onFileSelect?: (file: FileTreeNode) => void;
  onFileOpen?: (file: FileTreeNode) => void;
}

export function BackendFileTree({ className, onFileSelect, onFileOpen }: BackendFileTreeProps) {
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 加载文件树数据
  const loadFileTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentApi.getFileTree();
      
      if (response.code === 0 && response.data) {
        setNodes(response.data.nodes || []);
      } else {
        setError(response.message || '获取文件树失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
      console.error('Failed to load file tree:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // 获取文件图标
  const getFileIcon = (node: FileTreeNode) => {
    const iconProps = { 
      size: 16, 
      className: "text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" 
    };
    
    if (node.type === 'directory' || node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.id.toString());
      return isExpanded ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
    }
    
    // 根据文档类型返回对应图标
    switch (node.document_type) {
      case 'markdown':
        return <FileText {...iconProps} />;
      case 'json':
        return <Code {...iconProps} />;
      case 'html':
        return <Globe {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  // 处理文件夹展开/折叠
  const toggleFolder = useCallback((nodeId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // 处理节点点击
  const handleNodeClick = useCallback((node: FileTreeNode) => {
    setSelectedNodeId(node.id.toString());
    onFileSelect?.(node);
    
    if (node.type === 'directory' || node.type === 'folder') {
      toggleFolder(node.id.toString());
    } else if (onFileOpen) {
      onFileOpen(node);
    }
  }, [onFileSelect, onFileOpen, toggleFolder]);

  // 处理双击
  const handleNodeDoubleClick = useCallback((node: FileTreeNode) => {
    if (node.type === 'file' && onFileOpen) {
      onFileOpen(node);
    }
  }, [onFileOpen]);

  // 创建新文件
  const handleCreateFile = useCallback(async (parentPath?: string) => {
    const fileName = prompt('请输入文件名：');
    if (!fileName) return;

    try {
      setLoading(true);
      await documentApi.createDocument({
        title: fileName,
        type: 'markdown',
        content: `# ${fileName}\n\n`,
        parent_path: parentPath || ''
      });
      
      // 重新加载文件树
      await loadFileTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建文件失败');
    } finally {
      setLoading(false);
    }
  }, [loadFileTree]);

  // 创建新文件夹
  const handleCreateFolder = useCallback(async (parentPath?: string) => {
    const folderName = prompt('请输入文件夹名：');
    if (!folderName) return;

    try {
      setLoading(true);
      await documentApi.createDirectory({
        name: folderName,
        parent_path: parentPath || ''
      });
      
      // 重新加载文件树
      await loadFileTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建文件夹失败');
    } finally {
      setLoading(false);
    }
  }, [loadFileTree]);

  // 删除文件/文件夹
  const handleDelete = useCallback(async (node: FileTreeNode) => {
    if (!confirm(`确定要删除 "${node.name}" 吗？`)) return;

    try {
      setLoading(true);
      await documentApi.deleteDocument(parseInt(node.id));
      
      // 重新加载文件树
      await loadFileTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  }, [loadFileTree]);

  // 重命名
  const handleRename = useCallback(async (node: FileTreeNode) => {
    const newName = prompt('请输入新名称：', node.name);
    if (!newName || newName === node.name) return;

    try {
      setLoading(true);
      await documentApi.renameDocument(parseInt(node.id), newName);
      
      // 重新加载文件树
      await loadFileTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重命名失败');
    } finally {
      setLoading(false);
    }
  }, [loadFileTree]);

  // 渲染单个节点
  const renderNode = useCallback((node: FileTreeNode, level = 0) => {
    const isSelected = selectedNodeId === node.id.toString();
    const isFolder = node.type === 'directory' || node.type === 'folder';
    const isExpanded = expandedFolders.has(node.id.toString());

    return (
      <ContextMenu key={node.id}>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover rounded-sm group",
              isSelected && "bg-light-accent dark:bg-dark-accent",
              "text-light-text-primary dark:text-dark-text-primary"
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onClick={() => handleNodeClick(node)}
            onDoubleClick={() => handleNodeDoubleClick(node)}
          >
            {/* 展开/折叠图标 */}
            {isFolder && (
              <div className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown size={12} className="text-light-text-secondary dark:text-dark-text-secondary" />
                ) : (
                  <ChevronRight size={12} className="text-light-text-secondary dark:text-dark-text-secondary" />
                )}
              </div>
            )}
            
            {/* 文件图标 */}
            <div className="w-4 h-4 flex items-center justify-center">
              {getFileIcon(node)}
            </div>
            
            {/* 文件名 */}
            <span className="flex-1 text-sm truncate">
              {node.name}
            </span>
            
            {/* 文件大小 */}
            {node.type === 'file' && node.size > 0 && (
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-0 group-hover:opacity-100">
                {formatFileSize(node.size)}
              </span>
            )}
            
            {/* 操作按钮 */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded">
                    <MoreHorizontal size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRename(node)}>
                    <Edit3 size={14} className="mr-2" />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(node)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 size={14} className="mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => handleCreateFile(node.path)}>
                <FileText size={14} className="mr-2" />
                新建文件
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateFolder(node.path)}>
                <Folder size={14} className="mr-2" />
                新建文件夹
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => handleRename(node)}>
            <Edit3 size={14} className="mr-2" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => handleDelete(node)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 size={14} className="mr-2" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }, [selectedNodeId, expandedFolders, handleNodeClick, handleNodeDoubleClick, handleCreateFile, handleCreateFolder, handleRename, handleDelete]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border">
        <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          文件 (后端数据)
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleCreateFile()}
            className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded"
            title="新建文件"
            disabled={loading}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => handleCreateFolder()}
            className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded"
            title="新建文件夹"
            disabled={loading}
          >
            <Folder size={14} />
          </button>
          <button
            onClick={loadFileTree}
            className={cn(
              "p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded",
              loading && "animate-spin"
            )}
            title="刷新"
            disabled={loading}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {loading && nodes.length === 0 && (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <RefreshCw size={16} className="animate-spin mr-2" />
            加载中...
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600 dark:text-red-400">
            {error}
            <button
              onClick={loadFileTree}
              className="ml-2 underline hover:no-underline"
            >
              重试
            </button>
          </div>
        )}

        {nodes.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <Folder size={32} className="mb-2 opacity-50" />
            <p className="text-sm">暂无文件</p>
            <button
              onClick={() => handleCreateFile()}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              创建第一个文件
            </button>
          </div>
        )}

        {nodes.length > 0 && (
          <div className="py-2">
            {nodes.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}

