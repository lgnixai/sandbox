import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Note } from './types';
import { noteAPI } from '@/api/unified';

interface NoteState {
  // 笔记数据
  notes: Map<string, Note>;
  
  // 当前活跃笔记
  activeNoteId: string | null;
  
  // 加载状态
  loadingNotes: Set<string>;
  error: string | null;
}

interface NoteActions {
  // 笔记操作
  loadNote: (path: string) => Promise<Note | null>;
  createNote: (path: string, title: string, content?: string) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  // 内容操作
  saveNoteContent: (id: string, content: string) => Promise<void>;
  
  // 链接操作
  getBacklinks: (id: string) => Promise<Note[]>;
  
  // 批量操作
  loadMultipleNotes: (paths: string[]) => Promise<void>;
  
  // UI 操作
  setActiveNote: (id: string | null) => void;
  
  // 工具方法
  getNoteById: (id: string) => Note | undefined;
  getNoteByPath: (path: string) => Note | undefined;
}

export const useNoteStore = create<NoteState & NoteActions>()(
  immer((set, get) => ({
    // 初始状态
    notes: new Map(),
    activeNoteId: null,
    loadingNotes: new Set(),
    error: null,

    // 笔记操作
    loadNote: async (path: string) => {
      // 先检查缓存
      const cached = get().getNoteByPath(path);
      if (cached) {
        return cached;
      }

      set((state) => {
        state.loadingNotes.add(path);
      });

      try {
        const note = await noteAPI.getNote(path);
        
        set((state) => {
          state.notes.set(note.id, note);
          state.loadingNotes.delete(path);
        });
        
        return note;
      } catch (error) {
        set((state) => {
          state.error = error.message;
          state.loadingNotes.delete(path);
        });
        return null;
      }
    },

    createNote: async (path: string, title: string, content = '') => {
      try {
        const note = await noteAPI.createNote(path, title, content);
        
        set((state) => {
          state.notes.set(note.id, note);
          state.activeNoteId = note.id;
        });
        
        return note;
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
        return null;
      }
    },

    updateNote: async (id: string, updates: Partial<Note>) => {
      const note = get().notes.get(id);
      if (!note) return;

      try {
        const updatedNote = await noteAPI.updateNote(note.path, updates);
        
        set((state) => {
          state.notes.set(id, updatedNote);
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    deleteNote: async (id: string) => {
      const note = get().notes.get(id);
      if (!note) return;

      try {
        await noteAPI.deleteNote(note.path);
        
        set((state) => {
          state.notes.delete(id);
          if (state.activeNoteId === id) {
            state.activeNoteId = null;
          }
        });
      } catch (error) {
        set((state) => {
          state.error = error.message;
        });
      }
    },

    // 内容操作
    saveNoteContent: async (id: string, content: string) => {
      const note = get().notes.get(id);
      if (!note) return;

      // 立即更新本地状态
      set((state) => {
        const note = state.notes.get(id);
        if (note) {
          note.content = content;
          note.updatedAt = new Date();
        }
      });

      try {
        await noteAPI.updateNote(note.path, { content });
      } catch (error) {
        // 恢复原状态
        await get().loadNote(note.path);
        throw error;
      }
    },

    // 链接操作
    getBacklinks: async (id: string) => {
      const note = get().notes.get(id);
      if (!note) return [];

      try {
        const backlinks = await noteAPI.getBacklinks(note.path);
        
        // 缓存反向链接的笔记
        backlinks.forEach(backlink => {
          set((state) => {
            state.notes.set(backlink.id, backlink);
          });
        });
        
        return backlinks;
      } catch (error) {
        console.error('Failed to get backlinks:', error);
        return [];
      }
    },

    // 批量操作
    loadMultipleNotes: async (paths: string[]) => {
      const promises = paths.map(path => get().loadNote(path));
      await Promise.all(promises);
    },

    // UI 操作
    setActiveNote: (id: string | null) => {
      set((state) => {
        state.activeNoteId = id;
      });
    },

    // 工具方法
    getNoteById: (id: string) => {
      return get().notes.get(id);
    },

    getNoteByPath: (path: string) => {
      const notes = get().notes;
      for (const note of notes.values()) {
        if (note.path === path) {
          return note;
        }
      }
      return undefined;
    }
  }))
);