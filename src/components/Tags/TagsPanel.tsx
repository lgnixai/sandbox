import React, { useEffect, useState } from 'react';
import { Hash, FileText, Loader, Plus, MoreHorizontal } from 'lucide-react';
import { useTagStore, useFileSystemStore, useEditorStore, Tag, FileSystemNode } from '@/stores/unified';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function TagsPanel() {
  const { 
    tags, 
    loading, 
    loadTags, 
    createTag, 
    updateTag, 
    deleteTag,
    selectTag,
    selectedTagId,
    getTagFiles 
  } = useTagStore();
  
  const { getNodeById } = useFileSystemStore();
  const { openFile } = useEditorStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 过滤标签
  const filteredTags = Array.from(tags.values())
    .filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.usageCount - a.usageCount);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    await createTag(newTagName.trim());
    setNewTagName('');
    setIsCreating(false);
  };

  const handleTagClick = (tagId: string) => {
    selectTag(tagId === selectedTagId ? null : tagId);
  };

  const handleFileClick = (fileId: string) => {
    const node = getNodeById(fileId);
    if (node) {
      openFile(fileId, node.name);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (confirm('确定要删除这个标签吗？')) {
      await deleteTag(tagId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border">
        <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          标签
        </span>
        <div className="flex items-center space-x-1">
          <button
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="新建标签"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="p-2 border-b border-light-border dark:border-dark-border">
        <Input
          type="text"
          placeholder="搜索标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      {/* 新建标签输入 */}
      {isCreating && (
        <div className="p-2 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTag();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewTagName('');
                }
              }}
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCreateTag}
              className="h-7"
            >
              创建
            </Button>
          </div>
        </div>
      )}

      {/* 标签列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredTags.length === 0 ? (
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
              {filteredTags.map(tag => (
                <TagItem
                  key={tag.id}
                  tag={tag}
                  isSelected={tag.id === selectedTagId}
                  onTagClick={handleTagClick}
                  onFileClick={handleFileClick}
                  onDeleteTag={handleDeleteTag}
                  getTagFiles={getTagFiles}
                  getNodeById={getNodeById}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TagItemProps {
  tag: Tag;
  isSelected: boolean;
  onTagClick: (tagId: string) => void;
  onFileClick: (fileId: string) => void;
  onDeleteTag: (tagId: string) => void;
  getTagFiles: (tagId: string) => string[];
  getNodeById: (id: string) => FileSystemNode | undefined;
}

function TagItem({ 
  tag, 
  isSelected,
  onTagClick, 
  onFileClick,
  onDeleteTag,
  getTagFiles,
  getNodeById
}: TagItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileIds = isExpanded ? getTagFiles(tag.id) : [];

  return (
    <div 
      className={`
        border rounded-lg p-2 transition-colors
        ${isSelected 
          ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10' 
          : 'border-light-border dark:border-dark-border'
        }
      `}
    >
      {/* 标签头部 */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center flex-1 cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover p-1 rounded transition-colors"
          onClick={() => {
            onTagClick(tag.id);
            setIsExpanded(!isExpanded);
          }}
        >
          <Hash 
            size={14} 
            className="mr-2 text-light-accent dark:text-dark-accent flex-shrink-0" 
            style={{ color: tag.color }}
          />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            {tag.name}
          </span>
          <Badge variant="secondary" className="ml-2">
            {tag.usageCount}
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* TODO: 编辑标签 */}}>
              编辑标签
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDeleteTag(tag.id)}
              className="text-red-600"
            >
              删除标签
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 展开的文件列表 */}
      {isExpanded && fileIds.length > 0 && (
        <div className="mt-2 ml-4 space-y-1">
          {fileIds.map(fileId => {
            const node = getNodeById(fileId);
            if (!node) return null;
            
            return (
              <div
                key={fileId}
                className="flex items-center p-1 rounded cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                onClick={() => onFileClick(fileId)}
              >
                <FileText size={12} className="mr-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                <span className="text-xs text-light-text dark:text-dark-text truncate">
                  {node.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}