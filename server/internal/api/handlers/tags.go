package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"server/internal/models"
	"server/internal/services"
)

// TagHandler 标签处理器
type TagHandler struct {
	tagSvc *services.TagService
}

// NewTagHandler 创建标签处理器
func NewTagHandler(tagSvc *services.TagService) *TagHandler {
	return &TagHandler{tagSvc: tagSvc}
}

// ListTags 列出所有标签
func (h *TagHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.tagSvc.ListTags()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

// CreateTag 创建标签
func (h *TagHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var tag models.Tag
	
	if err := json.NewDecoder(r.Body).Decode(&tag); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.tagSvc.CreateTag(&tag); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

// UpdateTag 更新标签
func (h *TagHandler) UpdateTag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.tagSvc.UpdateTag(id, updates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// 返回更新后的标签
	tag, err := h.tagSvc.GetTag(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

// DeleteTag 删除标签
func (h *TagHandler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	if err := h.tagSvc.DeleteTag(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// GetTagFiles 获取标签关联的文件
func (h *TagHandler) GetTagFiles(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	fileIDs, err := h.tagSvc.GetTagFiles(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fileIDs)
}

// AddFileToTag 关联文件到标签
func (h *TagHandler) AddFileToTag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	var req struct {
		FileID string `json:"fileId"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// 获取标签
	tag, err := h.tagSvc.GetTag(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	
	if err := h.tagSvc.AddTagToFile(tag.Name, req.FileID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}