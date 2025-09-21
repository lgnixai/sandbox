import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useFileSystemStore, useNoteStore, useTagStore } from './stores/unified';

// Mock API
jest.mock('./api/unified', () => ({
  fileSystemAPI: {
    getTree: jest.fn().mockResolvedValue({
      id: 'root',
      name: 'workspace',
      path: '/workspace',
      type: 'folder',
      children: [
        {
          id: 'notes',
          name: 'notes',
          path: '/workspace/notes',
          type: 'folder',
          children: []
        }
      ]
    }),
    createFile: jest.fn().mockResolvedValue({}),
    updateFile: jest.fn().mockResolvedValue({}),
    deleteNode: jest.fn().mockResolvedValue({}),
  },
  noteAPI: {
    getNote: jest.fn().mockResolvedValue({
      id: 'test-note',
      name: 'test.md',
      path: '/workspace/notes/test.md',
      type: 'file',
      fileType: 'markdown',
      content: '# Test Note\n\nThis is a test note with #tag1 and #tag2',
      tags: ['tag1', 'tag2'],
      links: [],
      backlinks: []
    }),
    createNote: jest.fn().mockResolvedValue({
      id: 'new-note',
      name: 'new.md',
      path: '/workspace/notes/new.md',
      type: 'file',
      fileType: 'markdown',
      content: '# New Note',
      tags: [],
      links: [],
      backlinks: []
    })
  },
  tagAPI: {
    listTags: jest.fn().mockResolvedValue([
      {
        id: 'tag1',
        name: 'tag1',
        usageCount: 5
      },
      {
        id: 'tag2',
        name: 'tag2',
        usageCount: 3
      }
    ]),
    createTag: jest.fn().mockResolvedValue({
      id: 'new-tag',
      name: 'newtag',
      usageCount: 0
    })
  }
}));

describe('Unified File Management System', () => {
  beforeEach(() => {
    // 重置 Store
    useFileSystemStore.setState({
      nodes: new Map(),
      tree: null,
      expandedFolders: new Set(['/workspace']),
      selectedNodeId: null,
      searchQuery: '',
      searchResults: [],
      loading: false,
      error: null
    });

    useNoteStore.setState({
      notes: new Map(),
      activeNoteId: null,
      loadingNotes: new Set(),
      error: null
    });

    useTagStore.setState({
      tags: new Map(),
      fileTagMap: new Map(),
      tagFileMap: new Map(),
      selectedTagId: null,
      loading: false,
      error: null
    });
  });

  test('应该正确加载文件树', async () => {
    render(<App />);

    await waitFor(() => {
      const fileTreeStore = useFileSystemStore.getState();
      expect(fileTreeStore.tree).not.toBeNull();
      expect(fileTreeStore.nodes.size).toBeGreaterThan(0);
    });
  });

  test('应该能创建新文件', async () => {
    const { createFile } = useFileSystemStore.getState();
    
    await createFile('/workspace/notes', 'test.md', 'markdown');
    
    expect(fileSystemAPI.createFile).toHaveBeenCalledWith(
      '/workspace/notes/test.md',
      '',
      'markdown'
    );
  });

  test('应该能创建和加载笔记', async () => {
    const { createNote, loadNote } = useNoteStore.getState();
    
    // 创建笔记
    const note = await createNote('/workspace/notes/new.md', 'New Note', '# New Note');
    expect(note).toBeTruthy();
    expect(note?.title).toBe('New Note');
    
    // 加载笔记
    const loadedNote = await loadNote('/workspace/notes/test.md');
    expect(loadedNote).toBeTruthy();
    expect(loadedNote?.content).toContain('#tag1');
  });

  test('应该能管理标签', async () => {
    const { loadTags, createTag, getTagByName } = useTagStore.getState();
    
    // 加载标签
    await loadTags();
    const tags = useTagStore.getState().tags;
    expect(tags.size).toBe(2);
    
    // 创建新标签
    await createTag('newtag');
    expect(tagAPI.createTag).toHaveBeenCalledWith({ name: 'newtag' });
    
    // 查找标签
    const tag = getTagByName('tag1');
    expect(tag).toBeTruthy();
    expect(tag?.usageCount).toBe(5);
  });

  test('应该能搜索文件', async () => {
    const { search } = useFileSystemStore.getState();
    
    await search('test');
    
    // 由于使用了防抖，需要等待
    await waitFor(() => {
      const { searchQuery } = useFileSystemStore.getState();
      expect(searchQuery).toBe('test');
    }, { timeout: 500 });
  });

  test('应该能同步文件标签', async () => {
    const { syncFileTags, extractTagsFromContent } = useTagStore.getState();
    
    const content = '# Note\n\nThis has #tag1 and #tag2 and #newtag';
    const tags = extractTagsFromContent(content);
    
    expect(tags).toEqual(['tag1', 'tag2', 'newtag']);
    
    // 同步标签
    await syncFileTags('file-id', content);
    // 验证标签关联被正确更新
  });

  test('性能：应该缓存搜索结果', async () => {
    const { search } = useFileSystemStore.getState();
    
    // 第一次搜索
    await search('cached');
    
    // 第二次相同搜索应该使用缓存
    await search('cached');
    
    // API 应该只被调用一次
    expect(fileSystemAPI.search).toHaveBeenCalledTimes(1);
  });
});

describe('组件集成测试', () => {
  test('文件浏览器应该正确渲染', async () => {
    render(<App />);
    
    // 等待文件树加载
    await waitFor(() => {
      expect(screen.getByText('notes')).toBeInTheDocument();
    });
    
    // 点击展开文件夹
    const folderNode = screen.getByText('notes');
    await userEvent.click(folderNode);
    
    // 验证文件夹展开状态
    const { expandedFolders } = useFileSystemStore.getState();
    expect(expandedFolders.has('/workspace/notes')).toBe(true);
  });

  test('标签面板应该显示标签列表', async () => {
    render(<App />);
    
    // 切换到标签面板
    const tagsTab = screen.getByText('标签');
    await userEvent.click(tagsTab);
    
    // 等待标签加载
    await waitFor(() => {
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });
  });
});