package api

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "obsidianfs/internal/filesystem"
    "obsidianfs/internal/ws"
)

type filePayload struct {
    Path    string `json:"path"`    // "/folder/file.md"
    Content string `json:"content"`
}

type movePayload struct {
    From string `json:"from"`
    To   string `json:"to"`
}

func RegisterRoutes(r *gin.RouterGroup, fsSvc *filesystem.Service, hub *ws.Hub) {
    r.GET("/tree", func(c *gin.Context) {
        p := c.Query("path")
        node, err := fsSvc.ListTree(p, 8)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, node)
    })

    r.GET("/file", func(c *gin.Context) {
        p := c.Query("path")
        content, err := fsSvc.ReadFile(p)
        if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"path": p, "content": content})
    })

    r.POST("/file", func(c *gin.Context) {
        var req filePayload
        if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        if err := fsSvc.CreateFile(req.Path, req.Content); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        hub.Broadcast(ws.Event{Type: "fs", Action: "created", Path: req.Path})
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })

    r.PUT("/file", func(c *gin.Context) {
        var req filePayload
        if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        if err := fsSvc.WriteFile(req.Path, req.Content); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        hub.Broadcast(ws.Event{Type: "fs", Action: "modified", Path: req.Path})
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })

    r.POST("/folder", func(c *gin.Context) {
        var req struct{ Path string `json:"path"` }
        if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        if err := fsSvc.CreateFolder(req.Path); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        hub.Broadcast(ws.Event{Type: "fs", Action: "created", Path: req.Path})
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })

    r.DELETE("/path", func(c *gin.Context) {
        p := c.Query("path")
        if err := fsSvc.DeletePath(p); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        hub.Broadcast(ws.Event{Type: "fs", Action: "deleted", Path: p})
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })

    r.POST("/move", func(c *gin.Context) {
        var req movePayload
        if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        if err := fsSvc.RenamePath(req.From, req.To); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
        hub.Broadcast(ws.Event{Type: "fs", Action: "renamed", Path: req.To, From: req.From, To: req.To})
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })
}

