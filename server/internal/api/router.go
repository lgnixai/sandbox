package api

import (
	"encoding/json"
	"net/http"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"server/internal/api/handlers"
	"server/internal/models"
	"server/internal/services"
	"server/internal/ws"
)

// SetupRouter 设置路由
func SetupRouter(workspaceRoot string) (*mux.Router, error) {
	r := mux.NewRouter()
	
	// 初始化服务
	dataPath := filepath.Join(workspaceRoot, ".obsidian")
	tagSvc, err := services.NewTagService(dataPath)
	if err != nil {
		return nil, err
	}
	
	fsSvc, err := services.NewFileSystemService(workspaceRoot, tagSvc)
	if err != nil {
		return nil, err
	}
	
	noteSvc := services.NewNoteService(fsSvc, tagSvc)
	
	// 初始化处理器
	fsHandler := handlers.NewFileSystemHandler(fsSvc)
	noteHandler := handlers.NewNoteHandler(noteSvc)
	tagHandler := handlers.NewTagHandler(tagSvc)
	
	// API 路由
	api := r.PathPrefix("/api").Subrouter()
	
	// 文件系统 API
	api.HandleFunc("/fs/tree", fsHandler.GetTree).Methods("GET")
	api.HandleFunc("/fs/node", fsHandler.GetNode).Methods("GET")
	api.HandleFunc("/fs/file", fsHandler.CreateFile).Methods("POST")
	api.HandleFunc("/fs/file", fsHandler.UpdateFile).Methods("PUT")
	api.HandleFunc("/fs/node", fsHandler.DeleteNode).Methods("DELETE")
	api.HandleFunc("/fs/move", fsHandler.MoveNode).Methods("POST")
	api.HandleFunc("/search", fsHandler.SearchFiles).Methods("GET")
	
	// 笔记 API
	api.HandleFunc("/notes", noteHandler.CreateNote).Methods("POST")
	api.HandleFunc("/notes/{id}", noteHandler.GetNote).Methods("GET")
	api.HandleFunc("/notes/{id}", noteHandler.UpdateNote).Methods("PUT")
	api.HandleFunc("/notes/{id}/backlinks", noteHandler.GetBacklinks).Methods("GET")
	
	// 标签 API
	api.HandleFunc("/tags", tagHandler.ListTags).Methods("GET")
	api.HandleFunc("/tags", tagHandler.CreateTag).Methods("POST")
	api.HandleFunc("/tags/{id}", tagHandler.UpdateTag).Methods("PUT")
	api.HandleFunc("/tags/{id}", tagHandler.DeleteTag).Methods("DELETE")
	api.HandleFunc("/tags/{id}/files", tagHandler.GetTagFiles).Methods("GET")
	api.HandleFunc("/tags/{id}/files", tagHandler.AddFileToTag).Methods("POST")
	
	// WebSocket
	hub := ws.NewHub()
	go hub.Run()
	
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 允许所有来源，生产环境应该更严格
			},
		}
		
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		client := &ws.Client{
			Hub:  hub,
			Conn: conn,
			Send: make(chan []byte, 256),
		}
		
		hub.Register <- client
		
		go client.WritePump()
		go client.ReadPump()
	})
	
	// 兼容旧 API（逐步迁移）
	setupLegacyRoutes(r, fsSvc)
	
	// CORS 中间件
	r.Use(corsMiddleware)
	
	return r, nil
}

// setupLegacyRoutes 设置旧版 API 路由（保持兼容性）
func setupLegacyRoutes(r *mux.Router, fsSvc *services.FileSystemService) {
	// 旧版文件树 API
	r.HandleFunc("/api/tree", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		if path == "" {
			path = "/"
		}
		
		tree, err := fsSvc.GetTree(path, -1)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		// 转换为旧版格式
		legacyTree := convertToLegacyTree(tree)
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(legacyTree)
	}).Methods("GET")
	
	// 旧版文件 API
	r.HandleFunc("/api/file", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			path := r.URL.Query().Get("path")
			node, err := fsSvc.GetNode(path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}
			
			if node.Type != "file" {
				http.Error(w, "not a file", http.StatusBadRequest)
				return
			}
			
			// 读取内容
			content, err := fsSvc.ReadFile(path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"path":    path,
				"content": string(content),
			})
			
		case "POST", "PUT":
			var req struct {
				Path    string `json:"path"`
				Content string `json:"content"`
			}
			
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			
			var err error
			if r.Method == "POST" {
				err = fsSvc.CreateFile(req.Path, req.Content, "markdown")
			} else {
				err = fsSvc.UpdateFile(req.Path, req.Content)
			}
			
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]bool{"ok": true})
		}
	}).Methods("GET", "POST", "PUT")
	
	// 其他旧版 API...
}

// convertToLegacyTree 转换为旧版树格式
func convertToLegacyTree(tree *models.TreeNode) interface{} {
	// 实现新旧格式转换逻辑
	return tree
}

// corsMiddleware CORS 中间件
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}