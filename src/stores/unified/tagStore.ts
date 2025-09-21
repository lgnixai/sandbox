import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Tag, TagFileRelation } from './types';
import { tagAPI } from '@/api/unified';

interface TagState {
  // 标签数据
  tags: Map<string, Tag>;
  
  // 关联关系
  fileTagMap: Map<string, Set<string>>; // fileId -> tagIds
  tagFileMap: Map<string, Set<string>>; // tagId -> fileIds
  
  // UI 状态
  selectedTagId: string | null;
  
  // 加载状态
  loading: boolean;
  error: string | null;
}

interface TagActions {
  // 标签操作
  loadTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag | null>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  
  // 关联操作
  addTagToFile: (tagName: string, fileId: string) => Promise<void>;
  removeTagFromFile: (tagName: string, fileId: string) => Promise<void>;
  getFileTags: (fileId: string) => Tag[];
  getTagFiles: (tagId: string) => string[];
  
  // 标签提取
  extractTagsFromContent: (content: string) => string[];
  syncFileTags: (fileId: string, content: string) => Promise<void>;
  
  // UI 操作
  selectTag: (tagId: string | null) => void;
  
  // 工具方法
  getTagById: (id: string) => Tag | undefined;
  getTagByName: (name: string) => Tag | undefined;
}

export const useTagStore = create<TagState & TagActions>()(
  immer((set, get) => ({
    // 初始状态
    tags: new Map(),
    fileTagMap: new Map(),
    tagFileMap: new Map(),
    selectedTagId: null,
    loading: false,
    error: null,

    // 标签操作
    loadTags: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const tags = await tagAPI.listTags();
        
        set((state) => {
          state.tags.clear();
          tags.forEach(tag => {
            state.tags.set(tag.id, tag);
          });
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
          state.loading = false;
        });
      }
    },

    createTag: async (name: string, color?: string) => {
      try {
        const tag = await tagAPI.createTag({ name, color });
        
        set((state) => {
          state.tags.set(tag.id, tag);
          state.tagFileMap.set(tag.id, new Set());
        });
        
        return tag;
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
        return null;
      }
    },

    updateTag: async (id: string, updates: Partial<Tag>) => {
      try {
        const updatedTag = await tagAPI.updateTag(id, updates);
        
        set((state) => {
          state.tags.set(id, updatedTag);
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    deleteTag: async (id: string) => {
      try {
        await tagAPI.deleteTag(id);
        
        set((state) => {
          // 删除标签
          state.tags.delete(id);
          
          // 清理关联关系
          const fileIds = state.tagFileMap.get(id);
          if (fileIds) {
            fileIds.forEach(fileId => {
              const tagIds = state.fileTagMap.get(fileId);
              if (tagIds) {
                tagIds.delete(id);
              }
            });
          }
          state.tagFileMap.delete(id);
          
          // 清理选中状态
          if (state.selectedTagId === id) {
            state.selectedTagId = null;
          }
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    // 关联操作
    addTagToFile: async (tagName: string, fileId: string) => {
      let tag = get().getTagByName(tagName);
      
      // 如果标签不存在，创建新标签
      if (!tag) {
        tag = await get().createTag(tagName);
        if (!tag) return;
      }

      try {
        await tagAPI.addTagToFile(tag.id, fileId);
        
        set((state) => {
          // 更新文件标签映射
          if (!state.fileTagMap.has(fileId)) {
            state.fileTagMap.set(fileId, new Set());
          }
          state.fileTagMap.get(fileId)!.add(tag.id);
          
          // 更新标签文件映射
          if (!state.tagFileMap.has(tag.id)) {
            state.tagFileMap.set(tag.id, new Set());
          }
          state.tagFileMap.get(tag.id)!.add(fileId);
          
          // 更新使用计数
          const tagData = state.tags.get(tag.id);
          if (tagData) {
            tagData.usageCount++;
          }
        });
      } catch (error) {
        console.error('Failed to add tag to file:', error);
      }
    },

    removeTagFromFile: async (tagName: string, fileId: string) => {
      const tag = get().getTagByName(tagName);
      if (!tag) return;

      try {
        await tagAPI.removeTagFromFile(tag.id, fileId);
        
        set((state) => {
          // 更新文件标签映射
          const tagIds = state.fileTagMap.get(fileId);
          if (tagIds) {
            tagIds.delete(tag.id);
          }
          
          // 更新标签文件映射
          const fileIds = state.tagFileMap.get(tag.id);
          if (fileIds) {
            fileIds.delete(fileId);
          }
          
          // 更新使用计数
          const tagData = state.tags.get(tag.id);
          if (tagData && tagData.usageCount > 0) {
            tagData.usageCount--;
          }
        });
      } catch (error) {
        console.error('Failed to remove tag from file:', error);
      }
    },

    getFileTags: (fileId: string) => {
      const tagIds = get().fileTagMap.get(fileId);
      if (!tagIds) return [];
      
      const tags: Tag[] = [];
      tagIds.forEach(tagId => {
        const tag = get().tags.get(tagId);
        if (tag) {
          tags.push(tag);
        }
      });
      
      return tags;
    },

    getTagFiles: (tagId: string) => {
      const fileIds = get().tagFileMap.get(tagId);
      return fileIds ? Array.from(fileIds) : [];
    },

    // 标签提取
    extractTagsFromContent: (content: string) => {
      const tagRegex = /#(\w+)/g;
      const matches = content.match(tagRegex);
      
      if (!matches) return [];
      
      const tagSet = new Set<string>();
      matches.forEach(match => {
        tagSet.add(match.substring(1)); // 移除 # 号
      });
      
      return Array.from(tagSet);
    },

    syncFileTags: async (fileId: string, content: string) => {
      // 提取内容中的标签
      const contentTags = get().extractTagsFromContent(content);
      const contentTagSet = new Set(contentTags);
      
      // 获取当前文件的标签
      const currentTags = get().getFileTags(fileId);
      const currentTagSet = new Set(currentTags.map(t => t.name));
      
      // 找出需要添加的标签
      const tagsToAdd = contentTags.filter(tag => !currentTagSet.has(tag));
      
      // 找出需要删除的标签
      const tagsToRemove = currentTags.filter(tag => !contentTagSet.has(tag.name));
      
      // 执行添加和删除操作
      const promises: Promise<void>[] = [];
      
      tagsToAdd.forEach(tagName => {
        promises.push(get().addTagToFile(tagName, fileId));
      });
      
      tagsToRemove.forEach(tag => {
        promises.push(get().removeTagFromFile(tag.name, fileId));
      });
      
      await Promise.all(promises);
    },

    // UI 操作
    selectTag: (tagId: string | null) => {
      set((state) => {
        state.selectedTagId = tagId;
      });
    },

    // 工具方法
    getTagById: (id: string) => {
      return get().tags.get(id);
    },

    getTagByName: (name: string) => {
      const tags = get().tags;
      for (const tag of tags.values()) {
        if (tag.name === name) {
          return tag;
        }
      }
      return undefined;
    }
  }))
);