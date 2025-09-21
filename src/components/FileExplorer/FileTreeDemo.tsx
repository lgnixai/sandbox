import React from 'react';
import { IntegratedFileExplorer } from './IntegratedFileExplorer';

export function FileTreeDemo() {
  return (
    <div className="w-full h-screen bg-light-background dark:bg-dark-background">
      <div className="flex h-full">
        {/* 左侧文件树 */}
        <div className="w-80 border-r border-light-border dark:border-dark-border">
          <IntegratedFileExplorer />
        </div>
        
        {/* 右侧内容区域 */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-light-text-primary dark:text-dark-text-primary">
              文件系统演示
            </h1>
            
            <div className="space-y-6">
              <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg border border-light-border dark:border-dark-border">
                <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
                  功能特性
                </h2>
                <ul className="space-y-2 text-light-text-secondary dark:text-dark-text-secondary">
                  <li>• 📁 支持前端内存数据和后端数据库数据两种数据源</li>
                  <li>• 🔄 可以在两种数据源之间切换</li>
                  <li>• ➕ 支持创建文件和文件夹</li>
                  <li>• ✏️ 支持重命名和删除操作</li>
                  <li>• 📄 显示文件大小和修改时间</li>
                  <li>• 🎯 右键菜单和下拉菜单操作</li>
                  <li>• 🔍 与现有编辑器系统集成</li>
                </ul>
              </div>
              
              <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg border border-light-border dark:border-dark-border">
                <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
                  使用说明
                </h2>
                <div className="space-y-3 text-light-text-secondary dark:text-dark-text-secondary">
                  <div>
                    <strong className="text-light-text-primary dark:text-dark-text-primary">前端数据：</strong>
                    显示存储在浏览器内存中的笔记数据，这是之前的实现方式。
                  </div>
                  <div>
                    <strong className="text-light-text-primary dark:text-dark-text-primary">后端数据：</strong>
                    直接从后端API获取文档数据，支持实时的CRUD操作。
                  </div>
                  <div>
                    <strong className="text-light-text-primary dark:text-dark-text-primary">操作方式：</strong>
                    点击标签页切换数据源，使用工具栏按钮进行文件操作，右键菜单提供更多选项。
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
                  测试建议
                </h2>
                <ol className="space-y-2 text-blue-800 dark:text-blue-200 list-decimal list-inside">
                  <li>切换到"后端数据"标签页</li>
                  <li>点击"+"按钮创建新文件</li>
                  <li>点击文件夹图标创建新文件夹</li>
                  <li>右键点击文件/文件夹查看操作菜单</li>
                  <li>点击刷新按钮重新加载数据</li>
                  <li>点击设置按钮打开文档管理器</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

