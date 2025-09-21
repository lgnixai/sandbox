import { useCallback } from 'react';
import { useFileSystemEvents } from '@/hooks/useEventBus';
import { useAppStore } from '@/stores';
import { FileNode, FolderNode } from '@/stores/fileTreeStore';

/**
 * 事件驱动的文件树组件示例
 * 展示如何使用新的事件系统来处理文件操作
 */
export function EventDrivenFileTree() {
  const { nodes, getChildNodes } = useAppStore();
  const {
    publishFileNodeCreated,
    publishFileNodeDeleted,
    publishFileNodeRenamed,
    publishFolderExpanded,
    publishFolderCollapsed,
    publishNodeSelected
  } = useFileSystemEvents();

  // 创建新文件的事件驱动方式
  const handleCreateFile = useCallback((parentPath: string, fileName: string) => {
    const newFile: FileNode = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      type: 'file',
      fileType: 'markdown',
      path: `${parentPath}/${fileName}`,
      parentPath,
      content: `# ${fileName}\n\n新建文件的内容...`
    };

    // 发布文件创建事件，而不是直接调用 store 方法
    publishFileNodeCreated(newFile);
  }, [publishFileNodeCreated]);

  // 删除文件的事件驱动方式
  const handleDeleteFile = useCallback((nodeId: string) => {
    const node = nodes[nodeId];
    if (node && node.type === 'file') {
      // 发布文件删除事件
      publishFileNodeDeleted(nodeId, node);
    }
  }, [nodes, publishFileNodeDeleted]);

  // 重命名文件的事件驱动方式
  const handleRenameFile = useCallback((nodeId: string, newName: string) => {
    const node = nodes[nodeId];
    if (node && node.type === 'file') {
      const oldPath = node.path;
      const newPath = `${node.parentPath}/${newName}`;
      
      // 发布文件重命名事件
      publishFileNodeRenamed(nodeId, node.name, newName, oldPath, newPath);
    }
  }, [nodes, publishFileNodeRenamed]);

  // 文件夹展开/折叠的事件驱动方式
  const handleToggleFolder = useCallback((folderId: string) => {
    const folder = nodes[folderId];
    if (folder && folder.type === 'folder') {
      const folderNode = folder as FolderNode;
      
      if (folderNode.isExpanded) {
        publishFolderCollapsed(folder.path);
      } else {
        publishFolderExpanded(folder.path);
      }
    }
  }, [nodes, publishFolderExpanded, publishFolderCollapsed]);

  // 选择节点的事件驱动方式
  const handleSelectNode = useCallback((nodeId: string) => {
    const currentSelected = Object.values(nodes).find(node => node.isSelected)?.id || null;
    
    // 发布节点选择事件
    publishNodeSelected(nodeId, currentSelected);
  }, [nodes, publishNodeSelected]);

  // 渲染文件树节点
  const renderNode = useCallback((node: FileNode | FolderNode, level: number = 0) => {
    const isSelected = node.isSelected;
    const indent = level * 20;

    return (
      <div key={node.id} style={{ marginLeft: indent }}>
        <div 
          className={`
            flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
            ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
          `}
          onClick={() => handleSelectNode(node.id)}
        >
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFolder(node.id);
              }}
              className="text-sm"
            >
              {(node as FolderNode).isExpanded ? '📂' : '📁'}
            </button>
          )}
          
          {node.type === 'file' && (
            <span className="text-sm">📄</span>
          )}
          
          <span className="flex-1">{node.name}</span>
          
          {/* 操作按钮 */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            {node.type === 'file' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('重命名文件:', node.name);
                    if (newName && newName !== node.name) {
                      handleRenameFile(node.id, newName);
                    }
                  }}
                  className="text-xs px-1 py-0.5 bg-yellow-500 text-white rounded"
                >
                  重命名
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除文件 "${node.name}" 吗？`)) {
                      handleDeleteFile(node.id);
                    }
                  }}
                  className="text-xs px-1 py-0.5 bg-red-500 text-white rounded"
                >
                  删除
                </button>
              </>
            )}
            
            {node.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const fileName = prompt('新建文件名:');
                  if (fileName) {
                    handleCreateFile(node.path, fileName);
                  }
                }}
                className="text-xs px-1 py-0.5 bg-green-500 text-white rounded"
              >
                新建文件
              </button>
            )}
          </div>
        </div>
        
        {/* 递归渲染子节点 */}
        {node.type === 'folder' && (node as FolderNode).isExpanded && (
          <div>
            {getChildNodes(node.path).map(childNode => 
              renderNode(childNode, level + 1)
            )}
          </div>
        )}
      </div>
    );
  }, [
    handleSelectNode,
    handleToggleFolder,
    handleCreateFile,
    handleRenameFile,
    handleDeleteFile,
    getChildNodes
  ]);

  const rootNodes = getChildNodes('/workspace');

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">事件驱动文件树</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          这个组件使用事件系统来处理文件操作，所有操作都通过事件发布，由事件处理器统一处理。
        </p>
      </div>
      
      <div className="border rounded-lg p-2 bg-white dark:bg-gray-900">
        {rootNodes.length > 0 ? (
          rootNodes.map(node => renderNode(node))
        ) : (
          <div className="text-center text-gray-500 py-4">
            没有文件或文件夹
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button
          onClick={() => handleCreateFile('/workspace', `新文件${Date.now()}.md`)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          在根目录创建文件
        </button>
      </div>
    </div>
  );
}
