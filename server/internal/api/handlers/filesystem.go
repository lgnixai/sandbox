package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"server/internal/models"
	"server/internal/services"
)

// FileSystemHandler 文件系统处理器
type FileSystemHandler struct {
	fsSvc *services.FileSystemService
}

// NewFileSystemHandler 创建文件系统处理器
func NewFileSystemHandler(fsSvc *services.FileSystemService) *FileSystemHandler {
	return &FileSystemHandler{fsSvc: fsSvc}
}

// GetTree 获取文件树
func (h *FileSystemHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}
	
	depthStr := r.URL.Query().Get("depth")
	depth := -1 // 默认获取完整树
	if depthStr != "" {
		if d, err := strconv.Atoi(depthStr); err == nil {
			depth = d
		}
	}
	
	tree, err := h.fsSvc.GetTree(path, depth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tree)
}

// GetNode 获取单个节点
func (h *FileSystemHandler) GetNode(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}
	
	node, err := h.fsSvc.GetNode(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(node)
}

// CreateFile 创建文件
func (h *FileSystemHandler) CreateFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path     string `json:"path"`
		Content  string `json:"content"`
		FileType string `json:"fileType"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if req.FileType == "" {
		req.FileType = "markdown"
	}
	
	if err := h.fsSvc.CreateFile(req.Path, req.Content, req.FileType); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// UpdateFile 更新文件
func (h *FileSystemHandler) UpdateFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.fsSvc.UpdateFile(req.Path, req.Content); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// DeleteNode 删除节点
func (h *FileSystemHandler) DeleteNode(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}
	
	if err := h.fsSvc.DeleteNode(path); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// MoveNode 移动/重命名节点
func (h *FileSystemHandler) MoveNode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.fsSvc.MoveNode(req.OldPath, req.NewPath); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// SearchFiles 搜索文件
func (h *FileSystemHandler) SearchFiles(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query is required", http.StatusBadRequest)
		return
	}
	
	results, err := h.fsSvc.SearchFiles(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}