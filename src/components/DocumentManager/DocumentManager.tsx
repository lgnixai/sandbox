import React, { useState, useEffect } from 'react';
import { documentApi, DocumentType, FileTreeNode } from '@/lib/api/documentApi';

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取文件树
  const loadFileTree = async () => {
    try {
      setLoading(true);
      const response = await documentApi.getFileTree();
      if (response.code === 0 && response.data) {
        setFileTree(response.data.nodes || []);
      } else {
        setError(response.message || '获取文件树失败');
      }
    } catch (err) {
      setError('网络错误：无法获取文件树');
      console.error('Failed to load file tree:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建新文档
  const createDocument = async () => {
    const title = prompt('请输入文档标题:');
    if (!title) return;

    try {
      setLoading(true);
      const response = await documentApi.createDocument({
        title,
        type: 'markdown',
        content: `# ${title}\n\n这是一个新建的文档。`,
        description: '新建文档',
        parent_path: ''
      });

      if (response.code === 0) {
        await loadFileTree(); // 重新加载文件树
        alert('文档创建成功！');
      } else {
        setError(response.message || '创建文档失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`创建文档失败：${errorMessage}`);
      console.error('Failed to create document:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载文档内容
  const loadDocumentContent = async (docId: number) => {
    try {
      setLoading(true);
      const response = await documentApi.getDocumentContent(docId);
      if (response.code === 0 && response.data) {
        setSelectedDocument(response.data.document);
        setDocumentContent(response.data.content);
      } else {
        setError(response.message || '获取文档内容失败');
      }
    } catch (err) {
      setError('网络错误：无法获取文档内容');
      console.error('Failed to load document content:', err);
    } finally {
      setLoading(false);
    }
  };

  // 保存文档内容
  const saveDocument = async () => {
    if (!selectedDocument) return;

    try {
      setLoading(true);
      const response = await documentApi.updateDocument(selectedDocument.id, {
        content: documentContent
      });

      if (response.code === 0) {
        alert('文档保存成功！');
      } else {
        setError(response.message || '保存文档失败');
      }
    } catch (err) {
      setError('网络错误：无法保存文档');
      console.error('Failed to save document:', err);
    } finally {
      setLoading(false);
    }
  };

  // 删除文档
  const deleteDocument = async (docId: number) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      setLoading(true);
      const response = await documentApi.deleteDocument(docId);
      if (response.code === 0) {
        await loadFileTree(); // 重新加载文件树
        if (selectedDocument?.id === docId) {
          setSelectedDocument(null);
          setDocumentContent('');
        }
        alert('文档删除成功！');
      } else {
        setError(response.message || '删除文档失败');
      }
    } catch (err) {
      setError('网络错误：无法删除文档');
      console.error('Failed to delete document:', err);
    } finally {
      setLoading(false);
    }
  };

  // 同步文件系统
  const syncFileSystem = async () => {
    try {
      setLoading(true);
      const response = await documentApi.syncWithFileSystem();
      if (response.code === 0) {
        await loadFileTree();
        alert('文件系统同步成功！');
      } else {
        setError(response.message || '同步失败');
      }
    } catch (err) {
      setError('网络错误：无法同步文件系统');
      console.error('Failed to sync file system:', err);
    } finally {
      setLoading(false);
    }
  };

  // 渲染文件树节点
  const renderTreeNode = (node: FileTreeNode, level = 0) => {
    return (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <div 
          className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => {
            if (node.type === 'file') {
              loadDocumentContent(node.id);
            }
          }}
        >
          <span className="text-sm">
            {node.type === 'directory' ? '📁' : '📄'}
          </span>
          <span className="flex-1">{node.name}</span>
          {node.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDocument(node.id);
              }}
              className="text-xs px-1 py-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100"
            >
              删除
            </button>
          )}
        </div>
        {node.children && node.children.map(child => renderTreeNode(child, level + 1))}
      </div>
    );
  };

  useEffect(() => {
    loadFileTree();
  }, []);

  return (
    <div className="flex h-full">
      {/* 左侧文件树 */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">文档管理器</h3>
          <div className="flex gap-2 mb-4">
            <button
              onClick={createDocument}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              新建文档
            </button>
            <button
              onClick={syncFileSystem}
              disabled={loading}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              同步文件系统
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="mb-4 text-center text-gray-500">
            加载中...
          </div>
        )}

        <div className="border rounded-lg p-2 bg-white dark:bg-gray-900">
          {fileTree.length > 0 ? (
            fileTree.map(node => renderTreeNode(node))
          ) : (
            <div className="text-center text-gray-500 py-4">
              没有文档
            </div>
          )}
        </div>
      </div>

      {/* 右侧文档编辑器 */}
      <div className="flex-1 p-4">
        {selectedDocument ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold">{selectedDocument.title}</h2>
              <p className="text-gray-500 text-sm">
                类型: {selectedDocument.type} | 
                大小: {selectedDocument.file_size} 字节 | 
                更新时间: {new Date(selectedDocument.updated_at).toLocaleString()}
              </p>
            </div>
            
            <div className="mb-4">
              <button
                onClick={saveDocument}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                保存文档
              </button>
            </div>

            <textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="在这里编辑文档内容..."
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            请选择一个文档进行编辑
          </div>
        )}
      </div>
    </div>
  );
}
