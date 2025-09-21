package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"obsidianfs/internal/api"
	"obsidianfs/internal/filesystem"
	"obsidianfs/internal/ws"
)

func main() {
	root := os.Getenv("OBSIDIAN_FS_ROOT")
	if root == "" {
		root = filepath.Join("./workspace", "data")
	}
	fmt.Println("root", root)

	if err := os.MkdirAll(root, 0o755); err != nil {
		log.Fatalf("failed to ensure data root: %v", err)
	}

	// Init services
	fsService, err := filesystem.NewService(root)
	if err != nil {
		log.Fatalf("failed to init filesystem service: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	// Start watcher for external changes
	watcher, err := filesystem.NewWatcher(root, hub)
	if err != nil {
		log.Printf("fs watcher disabled: %v", err)
	} else {
		go watcher.Run()
		defer watcher.Close()
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health
	r.GET("/api/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	// API routes
	api.RegisterRoutes(r.Group("/api"), fsService, hub)

	// WebSocket endpoint
	r.GET("/ws", func(c *gin.Context) {
		ws.ServeWS(hub, c.Writer, c.Request)
	})

	addr := ":8787"
	if env := os.Getenv("PORT"); env != "" {
		addr = ":" + env
	}
	log.Printf("server listening on %s, root=%s", addr, root)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
