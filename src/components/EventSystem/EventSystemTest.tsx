import React, { useState, useEffect } from 'react';
import { useEventListener, useFileSystemEvents } from '@/hooks/useEventBus';
import { EventDrivenFileTree } from '@/components/FileExplorer/EventDrivenFileTree';
import { Event } from '@/types/events';

/**
 * 事件系统测试组件
 * 用于测试和演示事件系统的功能
 */
export function EventSystemTest() {
  const [eventLog, setEventLog] = useState<Event[]>([]);
  const [maxLogEntries] = useState(50);

  // 监听所有事件用于日志记录
  useEventListener(
    [
      'file.node.created',
      'file.node.deleted',
      'file.node.renamed',
      'file.node.moved',
      'folder.node.created',
      'folder.node.deleted',
      'folder.expanded',
      'folder.collapsed',
      'node.selected',
      'note.created',
      'note.deleted',
      'note.renamed',
      'editor.tab.opened',
      'editor.tab.closed'
    ],
    (event) => {
      setEventLog(prev => {
        const newLog = [event, ...prev];
        return newLog.slice(0, maxLogEntries);
      });
    },
    []
  );

  const clearLog = () => {
    setEventLog([]);
  };

  const formatEventData = (event: Event) => {
    const { type, ...data } = event;
    return JSON.stringify(data, null, 2);
  };

  const getEventColor = (eventType: string) => {
    if (eventType.startsWith('file.')) return 'text-blue-600 dark:text-blue-400';
    if (eventType.startsWith('folder.')) return 'text-green-600 dark:text-green-400';
    if (eventType.startsWith('note.')) return 'text-purple-600 dark:text-purple-400';
    if (eventType.startsWith('editor.')) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">事件系统测试</h1>
        <p className="text-gray-600 dark:text-gray-400">
          这个页面用于测试和演示新的事件驱动架构。左侧是事件驱动的文件树组件，右侧是实时的事件日志。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：事件驱动文件树 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">事件驱动文件树</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              使用事件系统处理文件操作
            </p>
          </div>
          <div className="p-4">
            <EventDrivenFileTree />
          </div>
        </div>

        {/* 右侧：事件日志 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">事件日志</h2>
              <button
                onClick={clearLog}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                清空日志
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              实时显示系统中发生的所有事件 (最近 {maxLogEntries} 条)
            </p>
          </div>
          
          <div className="p-4 h-96 overflow-y-auto">
            {eventLog.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无事件日志
                <br />
                <span className="text-sm">在左侧文件树中进行操作来生成事件</span>
              </div>
            ) : (
              <div className="space-y-3">
                {eventLog.map((event, index) => (
                  <div
                    key={`${event.type}-${index}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-mono text-sm font-semibold ${getEventColor(event.type)}`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                      {formatEventData(event)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部：事件统计 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-3">事件统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { prefix: 'file.', label: '文件事件', color: 'text-blue-600' },
            { prefix: 'folder.', label: '文件夹事件', color: 'text-green-600' },
            { prefix: 'note.', label: '笔记事件', color: 'text-purple-600' },
            { prefix: 'editor.', label: '编辑器事件', color: 'text-orange-600' }
          ].map(({ prefix, label, color }) => {
            const count = eventLog.filter(event => event.type.startsWith(prefix)).length;
            return (
              <div key={prefix} className="text-center">
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">使用说明</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>• 点击文件夹图标可以展开/折叠文件夹</li>
          <li>• 点击文件或文件夹名称可以选择节点</li>
          <li>• 使用"新建文件"按钮创建新文件</li>
          <li>• 使用"重命名"按钮重命名文件</li>
          <li>• 使用"删除"按钮删除文件</li>
          <li>• 所有操作都会在右侧事件日志中实时显示</li>
        </ul>
      </div>
    </div>
  );
}
