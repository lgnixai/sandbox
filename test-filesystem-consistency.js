#!/usr/bin/env node
/**
 * 文件系统一致性测试脚本
 * 测试前后端文件系统操作的一致性
 */

const API_BASE_URL = 'http://localhost:6066/v1';

class FileSystemTester {
  constructor() {
    this.testResults = [];
    this.createdDocuments = [];
  }

  async request(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || response.statusText}`);
    }
    
    return data;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async test(name, testFn) {
    this.log(`开始测试: ${name}`);
    try {
      const result = await testFn();
      this.testResults.push({ name, status: 'success', result });
      this.log(`测试通过: ${name}`, 'success');
      return result;
    } catch (error) {
      this.testResults.push({ name, status: 'error', error: error.message });
      this.log(`测试失败: ${name} - ${error.message}`, 'error');
      throw error;
    }
  }

  // 测试1: 文件创建功能
  async testFileCreation() {
    return await this.test('文件创建功能', async () => {
      // 创建一个新文档
      const createData = {
        title: 'test-document',
        type: 'markdown',
        content: '# Test Document\n\nThis is a test document.',
        description: 'Test document for consistency testing',
        parent_path: ''
      };

      const response = await this.request('/documents', {
        method: 'POST',
        body: JSON.stringify(createData)
      });

      if (response.code !== 0) {
        throw new Error(`创建文档失败: ${response.message}`);
      }

      const document = response.data;
      this.createdDocuments.push(document.id);

      // 验证文档属性
      if (document.title !== createData.title) {
        throw new Error(`标题不匹配: 期望 ${createData.title}, 实际 ${document.title}`);
      }

      if (document.type !== createData.type) {
        throw new Error(`类型不匹配: 期望 ${createData.type}, 实际 ${document.type}`);
      }

      // 验证文件是否在文件系统中创建
      const fileTreeResponse = await this.request('/documents/tree');
      const createdFile = fileTreeResponse.data.nodes.find(node => 
        node.id === document.id.toString() || node.id === document.id
      );
      
      if (!createdFile) {
        throw new Error(`文档在文件树中不存在，期望ID: ${document.id}, 文件树节点: ${fileTreeResponse.data.nodes.map(n => n.id).join(', ')}`);
      }

      return { document, fileExists: !!createdFile };
    });
  }

  // 测试2: 文件内容读取功能
  async testFileReading() {
    return await this.test('文件内容读取功能', async () => {
      if (this.createdDocuments.length === 0) {
        throw new Error('没有可测试的文档');
      }

      const docId = this.createdDocuments[0];
      
      // 获取文档内容
      const response = await this.request(`/documents/${docId}/content`);
      
      if (response.code !== 0) {
        throw new Error(`读取文档内容失败: ${response.message}`);
      }

      const { document, content } = response.data;
      
      if (!document) {
        throw new Error('文档信息为空');
      }

      if (typeof content !== 'string') {
        throw new Error('文档内容格式错误');
      }

      return { document, contentLength: content.length };
    });
  }

  // 测试3: 文件更新功能
  async testFileUpdate() {
    return await this.test('文件更新功能', async () => {
      if (this.createdDocuments.length === 0) {
        throw new Error('没有可测试的文档');
      }

      const docId = this.createdDocuments[0];
      const newContent = '# Updated Test Document\n\nThis content has been updated.';
      
      // 更新文档内容
      const response = await this.request(`/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: newContent
        })
      });

      if (response.code !== 0) {
        throw new Error(`更新文档失败: ${response.message}`);
      }

      // 验证更新是否成功
      const contentResponse = await this.request(`/documents/${docId}/content`);
      const actualContent = contentResponse.data.content;

      if (actualContent !== newContent) {
        throw new Error('文档内容更新失败');
      }

      return { updated: true, contentLength: actualContent.length };
    });
  }

  // 测试4: 文件重命名功能
  async testFileRename() {
    return await this.test('文件重命名功能', async () => {
      if (this.createdDocuments.length === 0) {
        throw new Error('没有可测试的文档');
      }

      const docId = this.createdDocuments[0];
      const newName = 'renamed-test-document';
      
      // 重命名文档
      const response = await this.request(`/documents/${docId}/rename`, {
        method: 'POST',
        body: JSON.stringify({
          new_name: newName
        })
      });

      if (response.code !== 0) {
        throw new Error(`重命名文档失败: ${response.message}`);
      }

      const updatedDocument = response.data;
      
      if (updatedDocument.title !== newName) {
        throw new Error(`重命名失败: 期望 ${newName}, 实际 ${updatedDocument.title}`);
      }

      // 验证文件树中的名称是否更新
      const fileTreeResponse = await this.request('/documents/tree');
      const renamedFile = fileTreeResponse.data.nodes.find(node => 
        node.id === docId.toString() || node.id === docId
      );
      
      if (!renamedFile || renamedFile.name !== newName) {
        throw new Error(`文件树中的文件名未更新，期望: ${newName}, 实际: ${renamedFile?.name || '未找到'}`);
      }

      return { renamed: true, newName };
    });
  }

  // 测试5: 目录创建功能
  async testDirectoryCreation() {
    return await this.test('目录创建功能', async () => {
      const dirData = {
        name: 'test-directory',
        parent_path: ''
      };

      const response = await this.request('/documents/directories', {
        method: 'POST',
        body: JSON.stringify(dirData)
      });

      if (response.code !== 0) {
        throw new Error(`创建目录失败: ${response.message}`);
      }

      const directory = response.data;
      this.createdDocuments.push(directory.id);

      // 验证目录属性
      if (!directory.is_directory) {
        throw new Error('创建的不是目录');
      }

      if (directory.title !== dirData.name) {
        throw new Error(`目录名不匹配: 期望 ${dirData.name}, 实际 ${directory.title}`);
      }

      // 验证目录是否在文件树中
      const fileTreeResponse = await this.request('/documents/tree');
      const createdDir = fileTreeResponse.data.nodes.find(node => 
        (node.id === directory.id.toString() || node.id === directory.id)
      );
      
      if (!createdDir || (createdDir.type !== 'directory' && createdDir.type !== 'folder')) {
        throw new Error(`目录在文件树中不存在或类型错误，期望类型: directory/folder, 实际类型: ${createdDir?.type || '未找到'}`);
      }

      return { directory, exists: !!createdDir };
    });
  }

  // 测试6: 文件移动功能
  async testFileMove() {
    return await this.test('文件移动功能', async () => {
      // 需要至少有一个文件和一个目录
      if (this.createdDocuments.length < 2) {
        throw new Error('需要至少创建一个文件和一个目录才能测试移动功能');
      }

      // 获取文件树以找到文件和目录
      const fileTreeResponse = await this.request('/documents/tree');
      const nodes = fileTreeResponse.data.nodes;
      
      const file = nodes.find(node => node.type === 'file');
      const directory = nodes.find(node => node.type === 'folder' || node.type === 'directory');

      if (!file || !directory) {
        throw new Error(`找不到可移动的文件或目标目录，可用节点: ${nodes.map(n => `${n.name}(${n.type})`).join(', ')}`);
      }

      // 移动文件到目录中
      const response = await this.request(`/documents/${file.id}/move`, {
        method: 'POST',
        body: JSON.stringify({
          new_parent_path: directory.name
        })
      });

      if (response.code !== 0) {
        throw new Error(`移动文件失败: ${response.message}`);
      }

      // 验证文件是否移动成功
      const updatedTreeResponse = await this.request('/documents/tree');
      const movedFile = updatedTreeResponse.data.nodes
        .find(node => node.type === 'directory' && node.name === directory.name);

      // 注意：这里需要检查目录的children，但API可能不返回children
      // 所以我们通过文档API来验证
      const fileResponse = await this.request(`/documents/${file.id}`);
      const updatedFile = fileResponse.data;

      if (updatedFile.parent_path !== directory.name) {
        throw new Error(`文件移动失败: 期望父路径 ${directory.name}, 实际 ${updatedFile.parent_path}`);
      }

      return { moved: true, newParentPath: updatedFile.parent_path };
    });
  }

  // 测试7: 文件删除功能
  async testFileDeletion() {
    return await this.test('文件删除功能', async () => {
      if (this.createdDocuments.length === 0) {
        throw new Error('没有可删除的文档');
      }

      const docId = this.createdDocuments[0];
      
      // 删除文档
      const response = await this.request(`/documents/${docId}`, {
        method: 'DELETE'
      });

      if (response.code !== 0) {
        throw new Error(`删除文档失败: ${response.message}`);
      }

      // 验证文档是否已删除
      try {
        await this.request(`/documents/${docId}`);
        throw new Error('文档仍然存在，删除失败');
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('不存在')) {
          // 这是期望的结果
        } else {
          throw error;
        }
      }

      // 验证文件是否从文件树中移除
      const fileTreeResponse = await this.request('/documents/tree');
      const deletedFile = fileTreeResponse.data.nodes.find(node => 
        node.id === docId.toString() || node.id === docId
      );
      
      if (deletedFile) {
        throw new Error('文件仍在文件树中，删除失败');
      }

      // 从测试记录中移除
      this.createdDocuments = this.createdDocuments.filter(id => id !== docId);

      return { deleted: true };
    });
  }

  // 测试8: 文件系统同步功能
  async testFileSystemSync() {
    return await this.test('文件系统同步功能', async () => {
      const response = await this.request('/documents/sync', {
        method: 'POST'
      });

      if (response.code !== 0) {
        throw new Error(`文件系统同步失败: ${response.message}`);
      }

      // 获取同步后的文件树
      const fileTreeResponse = await this.request('/documents/tree');
      const nodes = fileTreeResponse.data.nodes;

      return { synced: true, nodeCount: nodes.length };
    });
  }

  // 清理测试数据
  async cleanup() {
    this.log('开始清理测试数据...');
    
    for (const docId of this.createdDocuments) {
      try {
        await this.request(`/documents/${docId}`, { method: 'DELETE' });
        this.log(`已删除文档: ${docId}`);
      } catch (error) {
        this.log(`删除文档失败: ${docId} - ${error.message}`, 'error');
      }
    }
    
    this.createdDocuments = [];
  }

  // 运行所有测试
  async runAllTests() {
    this.log('开始文件系统一致性测试...');
    
    try {
      // 基础功能测试
      await this.testFileCreation();
      await this.testFileReading();
      await this.testFileUpdate();
      await this.testFileRename();
      
      // 目录功能测试
      await this.testDirectoryCreation();
      await this.testFileMove();
      
      // 删除功能测试
      await this.testFileDeletion();
      
      // 同步功能测试
      await this.testFileSystemSync();
      
    } catch (error) {
      this.log(`测试中断: ${error.message}`, 'error');
    } finally {
      // 清理测试数据
      await this.cleanup();
      
      // 生成测试报告
      this.generateReport();
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('文件系统一致性测试报告');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'success').length;
    const failedTests = totalTests - passedTests;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests} ✅`);
    console.log(`失败: ${failedTests} ❌`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n详细结果:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      if (result.status === 'error') {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (failedTests > 0) {
      console.log('\n发现的问题:');
      this.testResults
        .filter(r => r.status === 'error')
        .forEach(result => {
          console.log(`- ${result.name}: ${result.error}`);
        });
    } else {
      console.log('\n🎉 所有测试通过！前后端文件系统功能一致。');
    }
  }
}

// 运行测试
async function main() {
  const tester = new FileSystemTester();
  await tester.runAllTests();
}

// 检查是否有必要的依赖
if (typeof fetch === 'undefined') {
  console.error('❌ 需要 Node.js 18+ 或安装 node-fetch');
  process.exit(1);
}

main().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
