#!/usr/bin/env node

const API_BASE_URL = 'http://localhost:6066/v1';

async function testDirectoryCreation() {
  console.log('测试目录创建API...');
  
  const data = {
    name: 'api-test-directory',
    parent_path: ''
  };
  
  console.log('请求数据:', JSON.stringify(data, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/documents/directories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.code === 0) {
      console.log('✅ 目录创建成功');
    } else {
      console.log('❌ 目录创建失败');
    }
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
  }
}

testDirectoryCreation();

