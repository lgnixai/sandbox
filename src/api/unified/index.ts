// 统一的 API 客户端

import { 
  FileSystemNode, 
  TreeNode, 
  Note, 
  Tag, 
  SearchResult 
} from '@/stores/unified/types';

const API_BASE = '/api';

// 通用请求函数
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  
  return res.json();
}

// 文件系统 API
export const fileSystemAPI = {
  // 获取文件树
  async getTree(path = '/', depth = -1): Promise<TreeNode> {
    return request<TreeNode>(
      `${API_BASE}/fs/tree?path=${encodeURIComponent(path)}&depth=${depth}`
    );
  },

  // 获取单个节点
  async getNode(path: string): Promise<FileSystemNode> {
    return request<FileSystemNode>(
      `${API_BASE}/fs/node?path=${encodeURIComponent(path)}`
    );
  },

  // 创建文件
  async createFile(path: string, content: string, fileType = 'markdown'): Promise<void> {
    await request(`${API_BASE}/fs/file`, {
      method: 'POST',
      body: JSON.stringify({ path, content, fileType })
    });
  },

  // 更新文件
  async updateFile(path: string, content: string): Promise<void> {
    await request(`${API_BASE}/fs/file`, {
      method: 'PUT',
      body: JSON.stringify({ path, content })
    });
  },

  // 删除节点
  async deleteNode(path: string): Promise<void> {
    await request(`${API_BASE}/fs/node?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
  },

  // 移动节点
  async moveNode(oldPath: string, newPath: string): Promise<void> {
    await request(`${API_BASE}/fs/move`, {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath })
    });
  },

  // 创建文件夹
  async createFolder(path: string): Promise<void> {
    await request(`${API_BASE}/fs/folder`, {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  },

  // 搜索文件
  async search(query: string): Promise<SearchResult[]> {
    return request<SearchResult[]>(
      `${API_BASE}/search?q=${encodeURIComponent(query)}`
    );
  }
};

// 笔记 API
export const noteAPI = {
  // 获取笔记
  async getNote(path: string): Promise<Note> {
    const id = path.substring(1).replace(/\//g, '-');
    return request<Note>(`${API_BASE}/notes/${id}`);
  },

  // 创建笔记
  async createNote(path: string, title: string, content: string): Promise<Note> {
    return request<Note>(`${API_BASE}/notes`, {
      method: 'POST',
      body: JSON.stringify({ path, title, content })
    });
  },

  // 更新笔记
  async updateNote(path: string, updates: Partial<Note>): Promise<Note> {
    const id = path.substring(1).replace(/\//g, '-');
    return request<Note>(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // 删除笔记
  async deleteNote(path: string): Promise<void> {
    await fileSystemAPI.deleteNode(path);
  },

  // 获取反向链接
  async getBacklinks(path: string): Promise<Note[]> {
    const id = path.substring(1).replace(/\//g, '-');
    return request<Note[]>(`${API_BASE}/notes/${id}/backlinks`);
  }
};

// 标签 API
export const tagAPI = {
  // 获取所有标签
  async listTags(): Promise<Tag[]> {
    return request<Tag[]>(`${API_BASE}/tags`);
  },

  // 创建标签
  async createTag(tag: Partial<Tag>): Promise<Tag> {
    return request<Tag>(`${API_BASE}/tags`, {
      method: 'POST',
      body: JSON.stringify(tag)
    });
  },

  // 更新标签
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    return request<Tag>(`${API_BASE}/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // 删除标签
  async deleteTag(id: string): Promise<void> {
    await request(`${API_BASE}/tags/${id}`, {
      method: 'DELETE'
    });
  },

  // 获取标签关联的文件
  async getTagFiles(tagId: string): Promise<string[]> {
    return request<string[]>(`${API_BASE}/tags/${tagId}/files`);
  },

  // 添加标签到文件
  async addTagToFile(tagId: string, fileId: string): Promise<void> {
    await request(`${API_BASE}/tags/${tagId}/files`, {
      method: 'POST',
      body: JSON.stringify({ fileId })
    });
  },

  // 从文件移除标签
  async removeTagFromFile(tagId: string, fileId: string): Promise<void> {
    await request(`${API_BASE}/tags/${tagId}/files/${fileId}`, {
      method: 'DELETE'
    });
  }
};