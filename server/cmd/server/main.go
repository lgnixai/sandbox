package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"server/internal/api"
	"server/internal/filesystem"
	"server/internal/ws"
)

func main() {
	// 获取工作区根目录
	root := os.Getenv("OBSIDIAN_FS_ROOT")
	if root == "" {
		root = filepath.Join("./workspace", "data")
	}
	fmt.Printf("Workspace root: %s\n", root)

	// 确保工作区目录存在
	if err := os.MkdirAll(root, 0755); err != nil {
		log.Fatalf("Failed to create workspace directory: %v", err)
	}

	// 设置路由
	router, err := api.SetupRouter(root)
	if err != nil {
		log.Fatalf("Failed to setup router: %v", err)
	}

	// 启动文件监听器
	hub := ws.NewHub()
	go hub.Run()

	watcher, err := filesystem.NewWatcher(root, hub)
	if err != nil {
		log.Printf("File watcher disabled: %v", err)
	} else {
		go watcher.Run()
		defer watcher.Close()
	}

	// 启动服务器
	addr := ":8787"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	log.Printf("Server starting on %s, workspace root: %s", addr, root)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}