package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"server/internal/services"
)

// NoteHandler 笔记处理器
type NoteHandler struct {
	noteSvc *services.NoteService
}

// NewNoteHandler 创建笔记处理器
func NewNoteHandler(noteSvc *services.NoteService) *NoteHandler {
	return &NoteHandler{noteSvc: noteSvc}
}

// GetNote 获取笔记
func (h *NoteHandler) GetNote(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// ID 是 base64 编码的路径
	path := "/" + strings.ReplaceAll(id, "-", "/")
	
	note, err := h.noteSvc.GetNote(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}

// CreateNote 创建笔记
func (h *NoteHandler) CreateNote(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string `json:"path"`
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.noteSvc.CreateNote(req.Path, req.Title, req.Content); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// 获取创建的笔记
	note, err := h.noteSvc.GetNote(req.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}

// UpdateNote 更新笔记
func (h *NoteHandler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// ID 是 base64 编码的路径
	path := "/" + strings.ReplaceAll(id, "-", "/")
	
	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if err := h.noteSvc.UpdateNote(path, updates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// 返回更新后的笔记
	note, err := h.noteSvc.GetNote(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}

// GetBacklinks 获取反向链接
func (h *NoteHandler) GetBacklinks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// ID 是 base64 编码的路径
	path := "/" + strings.ReplaceAll(id, "-", "/")
	
	backlinks, err := h.noteSvc.GetBacklinks(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(backlinks)
}