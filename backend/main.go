package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ===== API response wrapper =====
type APIResponse[T any] struct {
	Code    int     `json:"code"`
	Message string  `json:"message"`
	Data    *T      `json:"data,omitempty"`
}

func writeJSON[T any](w http.ResponseWriter, status int, payload *APIResponse[T]) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// ===== Types aligned with frontend =====
type Document struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Status      int     `json:"status"`
	Description string  `json:"description"`
	Tags        string  `json:"tags"`
	FilePath    string  `json:"file_path"`
	FileName    string  `json:"file_name"`
	FileSize    int64   `json:"file_size"`
	ParentPath  string  `json:"parent_path"`
	IsDirectory bool    `json:"is_directory"`
	UserID      int64   `json:"user_id"`
	IsPublic    bool    `json:"is_public"`
	ShareToken  *string `json:"share_token,omitempty"`
	ViewCount   int64   `json:"view_count"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
	LastViewed  *string `json:"last_viewed,omitempty"`
	LastSync    *string `json:"last_sync,omitempty"`
}

type DocumentContentResponse struct {
	Document Document `json:"document"`
	Content  string   `json:"content"`
}

type CreateDocumentRequest struct {
	Title       string `json:"title"`
	Type        string `json:"type"`
	Content     string `json:"content"`
	Description string `json:"description"`
	Tags        string `json:"tags"`
	ParentPath  string `json:"parent_path"`
	IsDirectory bool   `json:"is_directory"`
}

type UpdateDocumentRequest struct {
	Title       *string `json:"title,omitempty"`
	Content     *string `json:"content,omitempty"`
	Description *string `json:"description,omitempty"`
	Tags        *string `json:"tags,omitempty"`
	Status      *int    `json:"status,omitempty"`
}

type CreateDirectoryRequest struct {
	Name       string `json:"name"`
	ParentPath string `json:"parent_path"`
}

type MoveDocumentRequest struct {
	NewParentPath string `json:"new_parent_path"`
}

type RenameDocumentRequest struct {
	NewName string `json:"new_name"`
}

type FileTreeNode struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Path       string `json:"path"`
	ParentPath string `json:"parentPath"`
	Type       string `json:"type"` // "file" | "folder"
	FileType   string `json:"fileType,omitempty"`
	Size       int64  `json:"size"`
	ModifiedAt string `json:"modified_at"`
}

// ===== ID mapping persisted on disk (no DB) =====
type idStore struct {
	NextID int64            `json:"next_id"`
	Paths  map[string]int64 `json:"paths"` // relative path -> id
}

type server struct {
	rootDir     string
	wsPrefix    string // UI-facing prefix, e.g. "/workspace"
	idsPath     string
	ids         idStore
	revIndex    map[int64]string // id -> relative path
	lock        sync.Mutex
}

func newServer(root string, wsPrefix string) (*server, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	configDir := filepath.Join(root, ".renote")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		return nil, err
	}
	idsPath := filepath.Join(configDir, "ids.json")
	s := &server{
		rootDir:  root,
		wsPrefix: wsPrefix,
		idsPath:  idsPath,
		revIndex: make(map[int64]string),
	}
	if err := s.loadIDs(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *server) loadIDs() error {
    // default empty
    s.ids = idStore{NextID: 1, Paths: map[string]int64{}}

    f, err := os.Open(s.idsPath)
    if err != nil {
        if os.IsNotExist(err) {
            return s.saveIDs()
        }
        return err
    }
    defer f.Close()

    decoder := json.NewDecoder(f)
    if err := decoder.Decode(&s.ids); err != nil {
        return err
    }

    // rebuild reverse index
    s.revIndex = make(map[int64]string)
    for p, id := range s.ids.Paths {
        s.revIndex[id] = p
    }
    return nil
}

func (s *server) saveIDs() error {
	s.lock.Lock()
	defer s.lock.Unlock()

	tmpPath := s.idsPath + ".tmp"
	f, err := os.Create(tmpPath)
	if err != nil {
		return err
	}
	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(s.ids); err != nil {
		f.Close()
		return err
	}
	f.Close()
	return os.Rename(tmpPath, s.idsPath)
}

func (s *server) assignID(rel string) int64 {
	if id, ok := s.ids.Paths[rel]; ok {
		return id
	}
	id := s.ids.NextID
	s.ids.NextID++
	s.ids.Paths[rel] = id
	s.revIndex[id] = rel
	_ = s.saveIDs()
	return id
}

func (s *server) getRelByID(id int64) (string, bool) {
	if rel, ok := s.revIndex[id]; ok {
		return rel, true
	}
	return "", false
}

func (s *server) updateRelForID(id int64, newRel string) {
	// find old rel
	oldRel, ok := s.revIndex[id]
	if ok {
		delete(s.ids.Paths, oldRel)
	}
	s.ids.Paths[newRel] = id
	s.revIndex[id] = newRel
	_ = s.saveIDs()
}

func (s *server) removeIDByRel(rel string) {
	if id, ok := s.ids.Paths[rel]; ok {
		delete(s.ids.Paths, rel)
		delete(s.revIndex, id)
		_ = s.saveIDs()
	}
}

// recursively remove IDs within a directory
func (s *server) removeIDsUnder(prefixRel string) {
	for rel := range s.ids.Paths {
		if rel == prefixRel || strings.HasPrefix(rel, prefixRel+string(os.PathSeparator)) {
			id := s.ids.Paths[rel]
			delete(s.ids.Paths, rel)
			delete(s.revIndex, id)
		}
	}
	_ = s.saveIDs()
}

// ===== Helpers =====
func (s *server) absPath(rel string) (string, error) {
	clean := filepath.Clean(rel)
	if strings.HasPrefix(clean, "..") {
		return "", errors.New("invalid path")
	}
	abs := filepath.Join(s.rootDir, clean)
	res, err := filepath.Abs(abs)
	if err != nil {
		return "", err
	}
	// ensure within root
	relToRoot, err := filepath.Rel(s.rootDir, res)
	if err != nil || strings.HasPrefix(relToRoot, "..") {
		return "", errors.New("path escapes root")
	}
	return res, nil
}

// normalize client-provided path to a relative path within root
func (s *server) normalizeClientPath(p string) string {
    p = strings.ReplaceAll(p, "\\", "/")
    p = strings.TrimSpace(p)
    // trim workspace prefix if present
    ws := strings.TrimSuffix(s.wsPrefix, "/")
    if p == ws || p == ws+"/" {
        return ""
    }
    if strings.HasPrefix(p, ws+"/") {
        p = strings.TrimPrefix(p, ws+"/")
    }
    p = strings.TrimPrefix(p, "/")
    p = filepath.Clean(p)
    if p == "." {
        return ""
    }
    return filepath.ToSlash(p)
}

func (s *server) wsPath(rel string) string {
	// UI-facing path that starts with /workspace
	parts := strings.Split(filepath.ToSlash(rel), "/")
	joined := strings.Join(parts, "/")
	return s.wsPrefix + "/" + strings.TrimPrefix(joined, "/")
}

func isoTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func fileTypeByExt(name string, declared string) string {
	if declared != "" {
		return declared
	}
	low := strings.ToLower(name)
	switch {
	case strings.HasSuffix(low, ".md") || strings.HasSuffix(low, ".markdown"):
		return "markdown"
	case strings.HasSuffix(low, ".html") || strings.HasSuffix(low, ".htm"):
		return "html"
	case strings.HasSuffix(low, ".json"):
		return "json"
	case strings.HasSuffix(low, ".yaml") || strings.HasSuffix(low, ".yml"):
		return "yaml"
	default:
		return "text"
	}
}

func ensureExtByType(base string, typ string) string {
	low := strings.ToLower(base)
	if strings.Contains(low, ".") {
		return base // assume caller provided extension
	}
	switch typ {
	case "markdown":
		return base + ".md"
	case "html":
		return base + ".html"
	case "json":
		return base + ".json"
	case "yaml":
		return base + ".yaml"
	default:
		return base + ".txt"
	}
}

func (s *server) docFromPath(rel string, info os.FileInfo) Document {
	name := info.Name()
	isDir := info.IsDir()
    fileType := "directory"
	if !isDir {
		fileType = fileTypeByExt(name, "")
	}
	parent := filepath.Dir(rel)
	if parent == "." {
		parent = ""
	}
	id := s.assignID(rel)
	return Document{
		ID:          id,
        // Frontend tests expect title to become new_name (no extension)
        Title:       strings.TrimSuffix(name, filepath.Ext(name)),
		Type:        fileType,
		Status:      0,
		Description: "",
		Tags:        "",
		FilePath:    s.wsPrefix + "/" + filepath.ToSlash(rel),
		FileName:    name,
		FileSize:    sizeOrZero(info),
		ParentPath:  filepath.ToSlash(parent), // relative parent path for Document
		IsDirectory: isDir,
		UserID:      0,
		IsPublic:    false,
		ViewCount:   0,
		CreatedAt:   isoTime(modOrNow(info)),
		UpdatedAt:   isoTime(modOrNow(info)),
	}
}

func sizeOrZero(info os.FileInfo) int64 {
	if info.IsDir() {
		return 0
	}
	return info.Size()
}

func modOrNow(info os.FileInfo) time.Time {
	if info.ModTime().IsZero() {
		return time.Now()
	}
	return info.ModTime()
}

func (s *server) treeNodeFromPath(rel string, info os.FileInfo) FileTreeNode {
	name := info.Name()
	isDir := info.IsDir()
	fileType := ""
	typ := "folder"
	if !isDir {
		fileType = fileTypeByExt(name, "")
		typ = "file"
	}
	id := s.assignID(rel)
	parent := filepath.Dir(rel)
	if parent == "." {
        parent = ""
	}
	return FileTreeNode{
		ID:         id,
        // Frontend tests compare against new_name without extension
        Name:       strings.TrimSuffix(name, filepath.Ext(name)),
        Path:       s.wsPrefix + "/" + filepath.ToSlash(rel),
        ParentPath: func() string {
            if parent == "" {
                return s.wsPrefix
            }
            return s.wsPrefix + "/" + filepath.ToSlash(parent)
        }(),
		Type:       typ,
		FileType:   fileType,
		Size:       sizeOrZero(info),
		ModifiedAt: isoTime(modOrNow(info)),
	}
}

// ===== HTTP handlers =====
func (s *server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) handleCreateDocument(w http.ResponseWriter, r *http.Request) {
	var req CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid json"})
		return
	}
    parentRel := s.normalizeClientPath(req.ParentPath)
	parentAbs, err := s.absPath(parentRel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid parent path"})
		return
	}
	if err := os.MkdirAll(parentAbs, 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}

	if req.IsDirectory {
		name := req.Title
		if name == "" {
			writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "missing directory name"})
			return
		}
		rel := filepath.ToSlash(filepath.Join(parentRel, name))
		abs, err := s.absPath(rel)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid path"})
			return
		}
		if err := os.MkdirAll(abs, 0o755); err != nil {
			writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
			return
		}
		info, _ := os.Stat(abs)
		doc := s.docFromPath(rel, info)
		writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
		return
	}

	// file creation
	baseName := req.Title
	if baseName == "" {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "missing title"})
		return
	}
	fileName := ensureExtByType(baseName, req.Type)
    rel := filepath.ToSlash(filepath.Join(parentRel, fileName))
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid path"})
		return
	}
	// ensure parent exists
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	if err := os.WriteFile(abs, []byte(req.Content), 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	info, _ := os.Stat(abs)
	doc := s.docFromPath(rel, info)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleGetDocument(w http.ResponseWriter, r *http.Request, id int64) {
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	info, err := os.Stat(abs)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	doc := s.docFromPath(rel, info)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleGetDocumentContent(w http.ResponseWriter, r *http.Request, id int64) {
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[DocumentContentResponse]{Code: 1, Message: "document not found"})
		return
	}
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[DocumentContentResponse]{Code: 1, Message: "document not found"})
		return
	}
	info, err := os.Stat(abs)
	if err != nil || info.IsDir() {
		writeJSON(w, http.StatusBadRequest, &APIResponse[DocumentContentResponse]{Code: 1, Message: "not a file"})
		return
	}
	b, err := os.ReadFile(abs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[DocumentContentResponse]{Code: 1, Message: err.Error()})
		return
	}
	doc := s.docFromPath(rel, info)
	resp := DocumentContentResponse{Document: doc, Content: string(b)}
	writeJSON(w, http.StatusOK, &APIResponse[DocumentContentResponse]{Code: 0, Message: "ok", Data: &resp})
}

func (s *server) handleUpdateDocument(w http.ResponseWriter, r *http.Request, id int64) {
	var req UpdateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid json"})
		return
	}
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	info, err := os.Stat(abs)
	if err != nil || info.IsDir() {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "not a file"})
		return
	}
	if req.Content != nil {
		if err := os.WriteFile(abs, []byte(*req.Content), 0o644); err != nil {
			writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
			return
		}
		info, _ = os.Stat(abs)
	}
	doc := s.docFromPath(rel, info)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleDeleteDocument(w http.ResponseWriter, r *http.Request, id int64) {
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[any]{Code: 1, Message: "document not found"})
		return
	}
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[any]{Code: 1, Message: "document not found"})
		return
	}
	info, err := os.Stat(abs)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[any]{Code: 1, Message: "document not found"})
		return
	}
	if info.IsDir() {
		if err := os.RemoveAll(abs); err != nil {
			writeJSON(w, http.StatusInternalServerError, &APIResponse[any]{Code: 1, Message: err.Error()})
			return
		}
		s.removeIDsUnder(rel)
	} else {
		if err := os.Remove(abs); err != nil {
			writeJSON(w, http.StatusInternalServerError, &APIResponse[any]{Code: 1, Message: err.Error()})
			return
		}
		s.removeIDByRel(rel)
	}
	writeJSON(w, http.StatusOK, &APIResponse[any]{Code: 0, Message: "ok"})
}

func (s *server) handleGetTree(w http.ResponseWriter, r *http.Request) {
	var nodes []FileTreeNode
	// Walk root and build flat list
	_ = filepath.Walk(s.rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if path == s.rootDir {
			return nil
		}
		// skip .renote system directory
		rel, _ := filepath.Rel(s.rootDir, path)
		if strings.HasPrefix(rel, ".renote") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		n := s.treeNodeFromPath(rel, info)
		nodes = append(nodes, n)
		return nil
	})
	data := struct {
		Nodes []FileTreeNode `json:"nodes"`
	}{Nodes: nodes}
	writeJSON(w, http.StatusOK, &APIResponse[struct{ Nodes []FileTreeNode `json:"nodes"` }]{Code: 0, Message: "ok", Data: &data})
}

func (s *server) handleCreateDirectory(w http.ResponseWriter, r *http.Request) {
	var req CreateDirectoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid json"})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "missing name"})
		return
	}
    parentRel := s.normalizeClientPath(req.ParentPath)
	rel := filepath.ToSlash(filepath.Join(parentRel, name))
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid path"})
		return
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	info, _ := os.Stat(abs)
	doc := s.docFromPath(rel, info)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleMoveDocument(w http.ResponseWriter, r *http.Request, id int64) {
	var req MoveDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid json"})
		return
	}
    newParentRel := s.normalizeClientPath(req.NewParentPath)
	// locate source
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	oldAbs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	name := filepath.Base(rel)
	newRel := filepath.ToSlash(filepath.Join(newParentRel, name))
	newAbs, err := s.absPath(newRel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid destination"})
		return
	}
	if err := os.MkdirAll(filepath.Dir(newAbs), 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	// If moving a directory, we must update mapping for all children
	info, err := os.Stat(oldAbs)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	if err := os.Rename(oldAbs, newAbs); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	if info.IsDir() {
		// Update mapping for directory and all descendants
		prefix := rel
		for pth, mappedID := range s.ids.Paths {
			if pth == prefix || strings.HasPrefix(pth, prefix+"/") {
				newChildRel := strings.Replace(pth, prefix, newRel, 1)
				s.updateRelForID(mappedID, newChildRel)
			}
		}
	} else {
		s.updateRelForID(id, newRel)
	}
	info2, _ := os.Stat(newAbs)
	doc := s.docFromPath(newRel, info2)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleRenameDocument(w http.ResponseWriter, r *http.Request, id int64) {
	var req RenameDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid json"})
		return
	}
	newName := strings.TrimSpace(req.NewName)
	if newName == "" {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "missing new_name"})
		return
	}
	rel, ok := s.getRelByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	abs, err := s.absPath(rel)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	info, err := os.Stat(abs)
	if err != nil {
		writeJSON(w, http.StatusNotFound, &APIResponse[Document]{Code: 1, Message: "document not found"})
		return
	}
	parent := filepath.Dir(rel)
	finalName := newName
	if !info.IsDir() {
		// keep extension unless newName includes one
		oldExt := filepath.Ext(rel)
		if filepath.Ext(newName) == "" {
			finalName = newName + oldExt
		}
	}
	newRel := filepath.ToSlash(filepath.Join(parent, finalName))
	newAbs, err := s.absPath(newRel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, &APIResponse[Document]{Code: 1, Message: "invalid new name"})
		return
	}
	if err := os.Rename(abs, newAbs); err != nil {
		writeJSON(w, http.StatusInternalServerError, &APIResponse[Document]{Code: 1, Message: err.Error()})
		return
	}
	if info.IsDir() {
		// update mapping for directory and all descendants
		prefix := rel
		for pth, mappedID := range s.ids.Paths {
			if pth == prefix || strings.HasPrefix(pth, prefix+"/") {
				newChildRel := strings.Replace(pth, prefix, newRel, 1)
				s.updateRelForID(mappedID, newChildRel)
			}
		}
	} else {
		s.updateRelForID(id, newRel)
	}
	info2, _ := os.Stat(newAbs)
	doc := s.docFromPath(newRel, info2)
	writeJSON(w, http.StatusOK, &APIResponse[Document]{Code: 0, Message: "ok", Data: &doc})
}

func (s *server) handleSync(w http.ResponseWriter, r *http.Request) {
	// Re-scan filesystem and ensure all paths have IDs
	_ = filepath.Walk(s.rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if path == s.rootDir {
			return nil
		}
		rel, _ := filepath.Rel(s.rootDir, path)
		if strings.HasPrefix(rel, ".renote") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		s.assignID(rel)
		return nil
	})
	_ = s.saveIDs()
	writeJSON(w, http.StatusOK, &APIResponse[any]{Code: 0, Message: "ok"})
}

// ===== Router =====
func (s *server) routes() http.Handler {
	mux := http.NewServeMux()

    // health checks
    mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("pong"))
    })
    mux.HandleFunc("/v1/ping", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("pong"))
    })

	// POST /v1/documents
	mux.HandleFunc("/v1/documents", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			s.handleCreateDocument(w, r)
			return
		}
		if r.Method == http.MethodGet {
			// Optional: list documents (not used)
			writeJSON(w, http.StatusOK, &APIResponse[[]Document]{Code: 0, Message: "ok", Data: &[]Document{}})
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})

	// /v1/documents/{id} and subroutes
	mux.HandleFunc("/v1/documents/", func(w http.ResponseWriter, r *http.Request) {
		// strip prefix
		p := strings.TrimPrefix(r.URL.Path, "/v1/documents/")
		segments := strings.Split(p, "/")
		if len(segments) == 0 || segments[0] == "" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		idStr := segments[0]
		// special sub-collection: directories
		if idStr == "directories" {
			if r.Method == http.MethodPost {
				s.handleCreateDirectory(w, r)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		// special sub-collection: sync
		if idStr == "sync" {
			if r.Method == http.MethodPost {
				s.handleSync(w, r)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		// special collection: tree
		if idStr == "tree" {
			if r.Method == http.MethodGet {
				s.handleGetTree(w, r)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// parse numeric id
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, &APIResponse[any]{Code: 1, Message: "invalid id"})
			return
		}

		if len(segments) == 1 || segments[1] == "" {
			switch r.Method {
			case http.MethodGet:
				s.handleGetDocument(w, r, id)
			case http.MethodPut:
				s.handleUpdateDocument(w, r, id)
			case http.MethodDelete:
				s.handleDeleteDocument(w, r, id)
			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		sub := segments[1]
		switch sub {
		case "content":
			if r.Method == http.MethodGet {
				s.handleGetDocumentContent(w, r, id)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
		case "move":
			if r.Method == http.MethodPost {
				s.handleMoveDocument(w, r, id)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
		case "rename":
			if r.Method == http.MethodPost {
				s.handleRenameDocument(w, r, id)
				return
			}
			w.WriteHeader(http.StatusMethodNotAllowed)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	return s.withCORS(mux)
}

func main() {
    // debug log helper
    dbg := func(msg string) {
        _ = os.WriteFile("/tmp/renote-start.log", []byte(time.Now().Format(time.RFC3339)+" "+msg+"\n"), 0o644)
        // append subsequent lines
        f, err := os.OpenFile("/tmp/renote-start.log", os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o644)
        if err == nil {
            _, _ = f.WriteString(time.Now().Format(time.RFC3339) + " " + msg + "\n")
            _ = f.Close()
        }
    }
    dbg("main start")
	root := filepath.Join("/workspace", "workbase")
	wsPrefix := "/workspace"
    srv, err := newServer(root, wsPrefix)
	if err != nil {
        dbg("newServer error: "+err.Error())
		panic(err)
	}
    dbg("newServer ok")

    addr := "0.0.0.0:6066"
	httpSrv := &http.Server{
		Addr:    addr,
		Handler: srv.routes(),
	}

    fmt.Printf("ReNote FS backend running on %s (root: %s)\n", addr, root)
    fmt.Println("Starting HTTP server...")
    dbg("calling ListenAndServe")
    if err := httpSrv.ListenAndServe(); err != nil {
        if errors.Is(err, http.ErrServerClosed) {
            fmt.Println("HTTP server closed")
            dbg("server closed")
            return
        }
        fmt.Printf("ListenAndServe error: %v\n", err)
        dbg("ListenAndServe error: "+err.Error())
        panic(err)
    }
    fmt.Println("ListenAndServe returned nil (unexpected)")
    dbg("ListenAndServe returned nil")
}

