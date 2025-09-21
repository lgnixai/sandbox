package models

import (
	"time"
)

// FileSystemNode 统一的文件/文件夹模型
type FileSystemNode struct {
	// 基础属性
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Type     string    `json:"type"` // file | folder
	FileType string    `json:"fileType,omitempty"` // markdown | database | canvas | html | code
	Size     int64     `json:"size,omitempty"`

	// 时间戳
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关系
	ParentPath string               `json:"parentPath"`
	Children   []*FileSystemNode    `json:"children,omitempty"`

	// 状态
	IsDeleted bool `json:"isDeleted,omitempty"`
}

// Note 笔记模型（扩展文件模型）
type Note struct {
	FileSystemNode
	
	// 笔记特定属性
	Content   string            `json:"content"`
	Tags      []string          `json:"tags"`
	Links     []string          `json:"links"`
	Backlinks []string          `json:"backlinks"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Tag 标签模型
type Tag struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Color       string    `json:"color,omitempty"`
	Description string    `json:"description,omitempty"`
	UsageCount  int       `json:"usageCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// TagFileRelation 标签-文件关联
type TagFileRelation struct {
	TagID     string `json:"tagId"`
	FileID    string `json:"fileId"`
	Positions []int  `json:"positions"` // 标签在文件中的位置
}

// TreeNode 用于前端显示的树形结构
type TreeNode struct {
	*FileSystemNode
	Children []*TreeNode `json:"children,omitempty"`
}

// SearchResult 搜索结果
type SearchResult struct {
	Node    *FileSystemNode `json:"node"`
	Matches []Match         `json:"matches"`
}

// Match 搜索匹配项
type Match struct {
	Line      int    `json:"line"`
	Column    int    `json:"column"`
	Text      string `json:"text"`
	Context   string `json:"context"`
}