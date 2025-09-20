import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Folder,
  FolderOpen,
  Database,
  Image,
  Code,
  Globe
} from 'lucide-react';
import { useAppStore } from '@/stores';
import { type FileNode, type FolderNode, type TreeNode } from '@/stores/fileTreeStore';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  className?: string;
}

export function FileTree({ className }: FileTreeProps) {
  const {
    selectedNodeId,
    draggedNode,
    dragOverNodeId,
    renamingNodeId,
    searchQuery,
    filteredNodeIds,
    expandedFolders,
    
    // Actions
    selectNode,
    toggleFolder,
    startDrag,
    endDrag,
    setDragOver,
    handleDrop,
    commitRename,
    getChildNodes,
    syncFileTreeWithNotes,
    selectFileInEditor,
    renameNoteAndUpdateTabs
  } = useAppStore();

  const [newItemName, setNewItemName] = useState('');
  const dragImageRef = useRef<HTMLDivElement>(null);

  // 同步文件树与笔记数据
  useEffect(() => {
    syncFileTreeWithNotes();
  }, [syncFileTreeWithNotes]);

  // 获取文件图标
  const getFileIcon = (node: FileNode) => {
    const iconProps = { size: 16, className: "text-light-text-secondary dark:text-dark-text-secondary" };
    
    switch (node.fileType) {
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

  // 处理文件/文件夹点击
  const handleNodeClick = useCallback((node: TreeNode) => {
    selectNode(node.id);
    
    if (node.type === 'file') {
      selectFileInEditor(node.id, { openMode: 'preview' });
    } else {
      toggleFolder(node.id);
    }
  }, [selectNode, selectFileInEditor, toggleFolder]);

  // 处理双击（固定标签页）
  const handleNodeDoubleClick = useCallback((node: TreeNode) => {
    if (node.type === 'file') {
      selectFileInEditor(node.id, { openMode: 'pinned' });
    }
  }, [selectFileInEditor]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, node: TreeNode) => {
    startDrag(node);
    
    // 设置拖拽数据
    e.dataTransfer.effectAllowed = node.type === 'file' ? 'copyLink' : 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      node: {
        id: node.id,
        name: node.name,
        type: node.type,
        path: node.path,
        parentPath: node.parentPath,
        fileType: (node as any).fileType
      },
      type: e.ctrlKey || e.metaKey ? 'link' : 'move'
    }));
    
    // 创建自定义拖拽图像
    if (dragImageRef.current) {
      dragImageRef.current.textContent = node.name;
      e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    }
  }, [startDrag]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // 处理拖拽进入/悬停
  const handleDragOver = useCallback((e: React.DragEvent, node: TreeNode) => {
    e.preventDefault();
    
    if (node.type === 'folder' && draggedNode && draggedNode.id !== node.id) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(node.id);
    }
  }, [draggedNode, setDragOver]);

  // 处理拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, [setDragOver]);

  // 处理放置
  const handleDropOnNode = useCallback((e: React.DragEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (node.type === 'folder') {
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        handleDrop(node.id, data);
      } catch (error) {
        console.error('Failed to parse drag data:', error);
      }
    }
  }, [handleDrop]);

  // 处理重命名提交
  const handleRenameSubmit = useCallback((nodeId: string) => {
    if (newItemName.trim()) {
      commitRename(nodeId, newItemName.trim());
      
      // 如果是文件节点，同时更新对应的笔记标题
      const nodes = getChildNodes('/workspace');
      const findNodeRecursively = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.type === 'folder') {
            const found = findNodeRecursively(getChildNodes(node.path), id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const node = findNodeRecursively(nodes, nodeId);
      if (node && node.type === 'file') {
        renameNoteAndUpdateTabs(nodeId, newItemName.trim());
      }
      
      setNewItemName('');
    }
  }, [newItemName, commitRename, getChildNodes, renameNoteAndUpdateTabs]);

  // 渲染单个节点
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = node.type === 'folder' && expandedFolders.has(node.path);
    const isSelected = selectedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id;
    const isRenaming = renamingNodeId === node.id;
    const isFiltered = searchQuery && !filteredNodeIds.has(node.id);
    
    if (isFiltered) return null;

    const paddingLeft = 8 + depth * 16;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center h-7 px-1 rounded-sm cursor-pointer transition-colors",
            "hover:bg-light-hover dark:hover:bg-dark-hover",
            isSelected && "bg-light-accent/20 dark:bg-dark-accent/20",
            isDragOver && node.type === 'folder' && "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600"
          )}
          style={{ paddingLeft }}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnNode(e, node)}
        >
          {/* 展开/收缩图标 */}
          {node.type === 'folder' && (
            <div className="flex-shrink-0 mr-1">
              {isExpanded ? (
                <ChevronDown size={14} className="text-light-text-secondary dark:text-dark-text-secondary" />
              ) : (
                <ChevronRight size={14} className="text-light-text-secondary dark:text-dark-text-secondary" />
              )}
            </div>
          )}
          
          {/* 文件/文件夹图标 */}
          <div className="flex-shrink-0 mr-2">
            {node.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen size={16} className="text-blue-500 dark:text-blue-400" />
              ) : (
                <Folder size={16} className="text-blue-500 dark:text-blue-400" />
              )
            ) : (
              getFileIcon(node as FileNode)
            )}
          </div>
          
          {/* 名称 */}
          {isRenaming ? (
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => handleRenameSubmit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit(node.id);
                } else if (e.key === 'Escape') {
                  setNewItemName('');
                  commitRename(node.id, node.name);
                }
              }}
              className="flex-1 bg-transparent border border-light-accent dark:border-dark-accent rounded px-1 text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={cn(
              "flex-1 truncate text-sm select-none",
              isSelected ? "text-light-accent dark:text-dark-accent font-medium" : "text-light-text dark:text-dark-text"
            )}>
              {node.name}
            </span>
          )}
          
          {/* 未链接提及计数 */}
          {node.type === 'file' && (node as FileNode).unlinkedMentions && (node as FileNode).unlinkedMentions! > 0 && (
            <span className="ml-2 text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-60">
              {(node as FileNode).unlinkedMentions}
            </span>
          )}
          
          {/* 文件夹子项计数 */}
          {node.type === 'folder' && (node as FolderNode).childCount && (node as FolderNode).childCount! > 0 && (
            <span className="ml-2 text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-60">
              {(node as FolderNode).childCount}
            </span>
          )}
        </div>
        
        {/* 渲染子节点 */}
        {node.type === 'folder' && isExpanded && (
          <div>
            {getChildNodes(node.path).map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // 获取根节点
  const rootNodes = getChildNodes('/workspace');

  return (
    <>
      <div className={cn("h-full overflow-y-auto scrollbar-thin", className)}>
        {rootNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <FileText size={32} className="mb-2 opacity-50" />
            <p className="text-sm text-center">暂无文件</p>
          </div>
        ) : (
          <div className="py-1">
            {rootNodes.map(node => renderNode(node))}
          </div>
        )}
      </div>
      
      {/* 自定义拖拽图像 */}
      <div
        ref={dragImageRef}
        className="fixed pointer-events-none opacity-80 bg-light-bg dark:bg-dark-bg px-2 py-1 rounded shadow-md text-sm"
        style={{ left: '-9999px' }}
      />
    </>
  );
}