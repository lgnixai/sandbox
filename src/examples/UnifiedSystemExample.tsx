import React, { useEffect } from 'react';
import { 
  useFileSystemStore, 
  useNoteStore, 
  useTagStore, 
  useEditorStore,
  syncManager
} from '@/stores/unified';

/**
 * 统一文件管理系统使用示例
 */
export function UnifiedSystemExample() {
  const fileSystem = useFileSystemStore();
  const notes = useNoteStore();
  const tags = useTagStore();
  const editor = useEditorStore();

  useEffect(() => {
    // 初始化应用
    syncManager.initialize();

    // 演示功能
    demonstrateFeatures();

    return () => {
      syncManager.destroy();
    };
  }, []);

  async function demonstrateFeatures() {
    console.log('=== 统一文件管理系统演示 ===');

    // 1. 文件系统操作
    console.log('\n1. 文件系统操作:');
    
    // 加载文件树
    await fileSystem.loadTree();
    console.log('- 文件树已加载，节点数:', fileSystem.nodes.size);

    // 创建文件夹
    await fileSystem.createFolder('/workspace/notes', 'demo-folder');
    console.log('- 创建文件夹: demo-folder');

    // 2. 笔记操作
    console.log('\n2. 笔记操作:');
    
    // 创建笔记
    const note = await notes.createNote(
      '/workspace/notes/demo.md',
      'Demo Note',
      `# Demo Note

This is a demo note with #important and #example tags.

## Features

- Automatic tag extraction
- Real-time sync
- Performance optimization

[[Link to another note]]`
    );
    console.log('- 创建笔记:', note?.name);

    // 3. 标签管理
    console.log('\n3. 标签管理:');
    
    // 加载标签
    await tags.loadTags();
    console.log('- 标签数量:', tags.tags.size);

    // 提取标签
    const extractedTags = tags.extractTagsFromContent(note?.content || '');
    console.log('- 提取的标签:', extractedTags);

    // 同步标签
    if (note) {
      await tags.syncFileTags(note.id, note.content);
      console.log('- 标签已同步');
    }

    // 4. 编辑器操作
    console.log('\n4. 编辑器操作:');
    
    // 打开文件
    if (note) {
      editor.openFile(note.id, note.name);
      console.log('- 在编辑器中打开文件');
    }

    // 获取活跃标签页
    const activeTab = editor.getActiveTab();
    console.log('- 活跃标签页:', activeTab?.title);

    // 5. 搜索功能
    console.log('\n5. 搜索功能:');
    
    // 搜索文件
    await fileSystem.search('demo');
    console.log('- 搜索结果数:', fileSystem.searchResults.length);

    // 6. 性能优化
    console.log('\n6. 性能优化特性:');
    console.log('- LRU 缓存已启用');
    console.log('- 防抖搜索已配置 (300ms)');
    console.log('- 批量更新队列已就绪');
    console.log('- WebSocket 实时同步已连接');

    console.log('\n=== 演示完成 ===');
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">统一文件管理系统示例</h2>
      
      <div className="space-y-4">
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">文件系统状态</h3>
          <p>节点数: {fileSystem.nodes.size}</p>
          <p>展开的文件夹: {fileSystem.expandedFolders.size}</p>
          <p>搜索查询: {fileSystem.searchQuery || '无'}</p>
        </div>

        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">笔记状态</h3>
          <p>加载的笔记: {notes.notes.size}</p>
          <p>活跃笔记: {notes.activeNoteId || '无'}</p>
        </div>

        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">标签状态</h3>
          <p>标签总数: {tags.tags.size}</p>
          <p>选中的标签: {tags.selectedTagId || '无'}</p>
        </div>

        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">编辑器状态</h3>
          <p>面板数: {editor.panes.length}</p>
          <p>打开的标签页: {editor.panes.reduce((sum, pane) => sum + pane.tabs.length, 0)}</p>
          <p>编辑模式: {editor.editorMode}</p>
        </div>

        <div className="mt-6">
          <button
            onClick={demonstrateFeatures}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新运行演示
          </button>
        </div>
      </div>
    </div>
  );
}