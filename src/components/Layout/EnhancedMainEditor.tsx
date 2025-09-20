import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabBar, type TabType } from '../Obeditor/Tab';
import { EnhancedMarkdownEditor } from '../Editor/EnhancedMarkdownEditor';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

export function EnhancedMainEditor() {
  const {
    notes,
    panes,
    activePaneId,
    openNoteInTab,
    closeTab,
    setActiveTab,
    createPane,
    closePane,
    setActivePane,
    splitTab,
    updateNote,
    selectedNodeId,
    selectNode
  } = useAppStore();

  // 监听文件树选中状态变化
  useEffect(() => {
    if (selectedNodeId && notes[selectedNodeId]) {
      // 在当前活跃面板打开笔记
      openNoteInTab(selectedNodeId, activePaneId || undefined);
    }
  }, [selectedNodeId, openNoteInTab, activePaneId, notes]);

  // 监听标签页激活状态变化，同步到文件树
  useEffect(() => {
    const activePane = panes.find(p => p.id === activePaneId);
    if (activePane?.activeTabId) {
      const activeTab = activePane.tabs.find(t => t.id === activePane.activeTabId);
      if (activeTab) {
        selectNode(activeTab.noteId);
      }
    }
  }, [activePaneId, panes, selectNode]);

  // 处理标签页关闭
  const handleCloseTab = useCallback((paneId: string) => (tabId: string) => {
    closeTab(tabId, paneId);
  }, [closeTab]);

  // 处理标签页激活
  const handleActivateTab = useCallback((paneId: string) => (tabId: string) => {
    setActiveTab(tabId, paneId);
    setActivePane(paneId);
    
    // 同步选中状态到文件树
    const pane = panes.find(p => p.id === paneId);
    const tab = pane?.tabs.find(t => t.id === tabId);
    if (tab) {
      selectNode(tab.noteId);
    }
  }, [setActiveTab, setActivePane, panes, selectNode]);

  // 处理添加新标签页
  const handleAddTab = useCallback((paneId: string) => () => {
    // 创建新的空白笔记
    const newNoteId = `note-${Date.now()}`;
    const newNote = {
      id: newNoteId,
      title: '新笔记',
      content: '# 新笔记\n\n开始编写...',
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: 'markdown' as const,
      folder: '/workspace/笔记'
    };
    
    updateNote(newNoteId, newNote);
    openNoteInTab(newNoteId, paneId);
  }, [updateNote, openNoteInTab]);

  // 处理分屏
  const handleSplitHorizontal = useCallback((paneId: string) => (tabId: string) => {
    splitTab(tabId, paneId, 'horizontal');
  }, [splitTab]);

  const handleSplitVertical = useCallback((paneId: string) => (tabId: string) => {
    splitTab(tabId, paneId, 'vertical');
  }, [splitTab]);

  // 处理笔记内容变化
  const handleNoteChange = useCallback((noteId: string, content: string) => {
    updateNote(noteId, { content });
  }, [updateNote]);

  // 处理笔记保存
  const handleNoteSave = useCallback((noteId: string) => {
    // 保存逻辑已经在 store 中通过自动保存处理
    console.log('Saving note:', noteId);
  }, []);

  // 渲染单个面板
  const renderPane = (pane: typeof panes[0]) => {
    const activeTab = pane.tabs.find(tab => tab.id === pane.activeTabId);
    const activeNote = activeTab ? notes[activeTab.noteId] : null;

    return (
      <div className="h-full flex flex-col bg-background">
        <TabBar
          tabs={pane.tabs.map(tab => ({
            ...tab,
            isActive: tab.id === pane.activeTabId
          }))}
          onCloseTab={handleCloseTab(pane.id)}
          onActivateTab={handleActivateTab(pane.id)}
          onAddTab={handleAddTab(pane.id)}
          onCloseOthers={(tabId) => {
            // 关闭其他标签
            pane.tabs.forEach(tab => {
              if (tab.id !== tabId) {
                closeTab(tab.id, pane.id);
              }
            });
          }}
          onCloseAll={() => {
            // 关闭所有标签
            pane.tabs.forEach(tab => {
              closeTab(tab.id, pane.id);
            });
          }}
          onSplitHorizontal={handleSplitHorizontal(pane.id)}
          onSplitVertical={handleSplitVertical(pane.id)}
          onToggleLock={(tabId) => {
            // TODO: 实现标签锁定功能
            console.log('Toggle lock:', tabId);
          }}
          onDuplicate={(tabId) => {
            // TODO: 实现标签复制功能
            console.log('Duplicate tab:', tabId);
          }}
          onRename={(tabId, newTitle) => {
            const tab = pane.tabs.find(t => t.id === tabId);
            if (tab) {
              updateNote(tab.noteId, { title: newTitle });
            }
          }}
        />
        
        {activeNote && activeTab ? (
          <div className="flex-1 overflow-hidden">
            <EnhancedMarkdownEditor
              noteId={activeTab.noteId}
              content={activeNote.content}
              onChange={(content) => handleNoteChange(activeTab.noteId, content)}
              onSave={() => handleNoteSave(activeTab.noteId)}
              isDirty={activeTab.isDirty}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">没有打开的文件</p>
              <p className="text-sm">从文件树中选择一个文件或创建新文件</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 如果没有面板，创建默认面板
  if (panes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">没有打开的编辑器</p>
          <p className="text-sm">从文件树中选择一个文件开始编辑</p>
        </div>
      </div>
    );
  }

  // 单个面板
  if (panes.length === 1) {
    return renderPane(panes[0]);
  }

  // 多个面板 - 简化布局，只支持水平分割
  return (
    <PanelGroup direction="horizontal">
      {panes.map((pane, index) => (
        <React.Fragment key={pane.id}>
          <Panel
            defaultSize={100 / panes.length}
            minSize={20}
            className={cn(
              index < panes.length - 1 && "border-r border-border"
            )}
          >
            {renderPane(pane)}
          </Panel>
          {index < panes.length - 1 && (
            <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors duration-200" />
          )}
        </React.Fragment>
      ))}
    </PanelGroup>
  );
}