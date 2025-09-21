// 文档API客户端
export interface DocumentType {
  id: number;
  title: string;
  type: 'markdown' | 'text' | 'code' | 'json' | 'yaml' | 'html';
  status: number;
  description: string;
  tags: string;
  file_path: string;
  file_name: string;
  file_size: number;
  parent_path: string;
  is_directory: boolean;
  user_id: number;
  is_public: boolean;
  share_token?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  last_viewed?: string;
  last_sync?: string;
}

export interface DocumentContentResponse {
  document: DocumentType;
  content: string;
}

export interface CreateDocumentRequest {
  title: string;
  type: 'markdown' | 'text' | 'code' | 'json' | 'yaml' | 'html';
  content?: string;
  description?: string;
  tags?: string;
  parent_path?: string;
  is_directory?: boolean;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  description?: string;
  tags?: string;
  status?: number;
}

export interface FileTreeNode {
  id: number;
  name: string;
  path: string;
  type: 'file' | 'directory';
  document_type?: string;
  size: number;
  modified_at: string;
  children?: FileTreeNode[];
  is_expanded: boolean;
  has_children: boolean;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

class DocumentApi {
  private baseUrl = 'http://localhost:6066/v1';

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // 如果无法解析错误响应，使用默认错误信息
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // 创建文档
  async createDocument(data: CreateDocumentRequest): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 获取文档信息
  async getDocument(id: number): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>(`/documents/${id}`);
  }

  // 获取文档内容
  async getDocumentContent(id: number): Promise<ApiResponse<DocumentContentResponse>> {
    return this.request<DocumentContentResponse>(`/documents/${id}/content`);
  }

  // 更新文档
  async updateDocument(id: number, data: UpdateDocumentRequest): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除文档
  async deleteDocument(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取文件树
  async getFileTree(): Promise<ApiResponse<{ nodes: FileTreeNode[] }>> {
    return this.request<{ nodes: FileTreeNode[] }>('/documents/tree');
  }

  // 创建目录
  async createDirectory(data: { name: string; parent_path?: string }): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>('/documents/directories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 移动文档
  async moveDocument(id: number, newParentPath: string): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>(`/documents/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ new_parent_path: newParentPath }),
    });
  }

  // 重命名文档
  async renameDocument(id: number, newName: string): Promise<ApiResponse<DocumentType>> {
    return this.request<DocumentType>(`/documents/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify({ new_name: newName }),
    });
  }

  // 同步文件系统
  async syncWithFileSystem(): Promise<ApiResponse<void>> {
    return this.request<void>('/documents/sync', {
      method: 'POST',
    });
  }

}

export const documentApi = new DocumentApi();
