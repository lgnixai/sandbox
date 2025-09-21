package filesystem

import (
    "log"
    "path/filepath"

    "github.com/fsnotify/fsnotify"
    "obsidianfs/internal/ws"
)

type Watcher struct {
    root    string
    watcher *fsnotify.Watcher
    hub     *ws.Hub
}

func NewWatcher(root string, hub *ws.Hub) (*Watcher, error) {
    w, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    return &Watcher{root: root, watcher: w, hub: hub}, nil
}

func (w *Watcher) Run() {
    // Watch root recursively by adding directories on the fly
    _ = w.watcher.Add(w.root)
    for {
        select {
        case evt, ok := <-w.watcher.Events:
            if !ok { return }
            rel := "/"
            if p, err := filepath.Rel(w.root, evt.Name); err == nil {
                rel = "/" + filepath.ToSlash(p)
            }
            kind := "modified"
            if evt.Op&fsnotify.Create == fsnotify.Create { kind = "created" }
            if evt.Op&fsnotify.Remove == fsnotify.Remove { kind = "deleted" }
            if evt.Op&fsnotify.Rename == fsnotify.Rename { kind = "renamed" }
            w.hub.Broadcast(ws.Event{Type: "fs", Action: kind, Path: rel})
            // Add new directory watches
            if evt.Op&fsnotify.Create == fsnotify.Create {
                _ = w.watcher.Add(evt.Name)
            }
        case err, ok := <-w.watcher.Errors:
            if !ok { return }
            log.Printf("fsnotify error: %v", err)
        }
    }
}

func (w *Watcher) Close() error { return w.watcher.Close() }

