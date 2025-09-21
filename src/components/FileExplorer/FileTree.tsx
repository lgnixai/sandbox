import React, { useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Database,
  Image,
  Code,
  Globe,
  File
} from 'lucide-react';
import { useFileSystemStore, useEditorStore, useNoteStore, TreeNode } from '@/stores/unified';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  className?: string;
}

export function FileTree({ className }: FileTreeProps) {
  const { 
    tree, 
    expandedFolders, 
    selectedNodeId,
    toggleFolder,
    selectNode,
    deleteNode,
    moveNode,
    searchResults,
    searchQuery
  } = useFileSystemStore();
  
  const { openFile } = useEditorStore();
  const { loadNote } = useNoteStore();

  const handleNodeClick = useCallback(async (node: TreeNode) => {
    selectNode(node.id);
    
    if (node.type === 'folder') {
      toggleFolder(node.path);
    } else if (node.type === 'file') {
      // 如果是 Markdown 文件，先加载笔记内容
      if (node.fileType === 'markdown') {
        await loadNote(node.path);
      }
      openFile(node.id, node.name);
    }
  }, [selectNode, toggleFolder, openFile, loadNote]);

  const handleNodeDelete = useCallback(async (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除 "${node.name}" 吗？`)) {
      await deleteNode(node.path);
    }
  }, [deleteNode]);

  if (!tree) {
    return (
      <div className={cn("flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary", className)}>
        <p className="text-sm">加载中...</p>
      </div>
    );
  }

  // 如果有搜索结果，只显示搜索结果
  if (searchQuery && searchResults.length > 0) {
    return (
      <div className={cn("overflow-y-auto scrollbar-thin", className)}>
        <div className="p-2">
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
            搜索结果: {searchResults.length} 项
          </p>
          {searchResults.map(result => (
            <TreeNodeComponent
              key={result.node.id}
              node={result.node as TreeNode}
              depth={0}
              isExpanded={false}
              isSelected={selectedNodeId === result.node.id}
              onNodeClick={handleNodeClick}
              onNodeDelete={handleNodeDelete}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-y-auto scrollbar-thin", className)}>
      {tree.children && tree.children.map(child => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          depth={0}
          isExpanded={expandedFolders.has(child.path)}
          isSelected={selectedNodeId === child.id}
          onNodeClick={handleNodeClick}
          onNodeDelete={handleNodeDelete}
          expandedFolders={expandedFolders}
        />
      ))}
    </div>
  );
}

interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onNodeClick: (node: TreeNode) => void;
  onNodeDelete: (node: TreeNode, e: React.MouseEvent) => void;
  expandedFolders?: Set<string>;
}

function TreeNodeComponent({ 
  node, 
  depth, 
  isExpanded, 
  isSelected,
  onNodeClick,
  onNodeDelete,
  expandedFolders = new Set()
}: TreeNodeComponentProps) {
  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'markdown':
        return <FileText size={16} />;
      case 'database':
        return <Database size={16} />;
      case 'canvas':
        return <Image size={16} />;
      case 'html':
        return <Globe size={16} />;
      case 'code':
        return <Code size={16} />;
      default:
        return <File size={16} />;
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center px-2 py-1 cursor-pointer transition-colors group",
          "hover:bg-light-hover dark:hover:bg-dark-hover",
          isSelected && "bg-light-accent/10 dark:bg-dark-accent/10"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onNodeClick(node)}
      >
        {/* 展开/收缩图标 */}
        {node.type === 'folder' && (
          <span className="mr-1 text-light-text-secondary dark:text-dark-text-secondary">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {node.type === 'file' && <span className="mr-1 w-[14px]" />}

        {/* 文件/文件夹图标 */}
        <span className={cn(
          "mr-2 flex-shrink-0",
          isSelected 
            ? "text-light-accent dark:text-dark-accent" 
            : "text-light-text-secondary dark:text-dark-text-secondary"
        )}>
          {node.type === 'folder' 
            ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)
            : getFileIcon(node.fileType)
          }
        </span>

        {/* 名称 */}
        <span className={cn(
          "text-sm truncate flex-1",
          isSelected 
            ? "text-light-accent dark:text-dark-accent font-medium" 
            : "text-light-text dark:text-dark-text"
        )}>
          {node.name}
        </span>

        {/* 操作按钮（悬停时显示） */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {/* TODO: 添加更多操作按钮 */}
        </div>
      </div>

      {/* 子节点 */}
      {node.type === 'folder' && isExpanded && node.children && (
        <>
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={expandedFolders.has(child.path)}
              isSelected={selectedNodeId === child.id}
              onNodeClick={onNodeClick}
              onNodeDelete={onNodeDelete}
              expandedFolders={expandedFolders}
            />
          ))}
        </>
      )}
    </>
  );
}