package services

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/spf13/afero"
	"server/internal/models"
)

// FileSystemService 文件系统服务
type FileSystemService struct {
	fs       afero.Fs
	root     string
	tagSvc   *TagService
}

// NewFileSystemService 创建文件系统服务
func NewFileSystemService(root string, tagSvc *TagService) (*FileSystemService, error) {
	afs := afero.NewOsFs()
	
	// 确保根目录存在
	if err := afs.MkdirAll(root, 0755); err != nil {
		return nil, err
	}
	
	return &FileSystemService{
		fs:     afs,
		root:   root,
		tagSvc: tagSvc,
	}, nil
}

// GetNode 获取单个节点
func (s *FileSystemService) GetNode(relPath string) (*models.FileSystemNode, error) {
	absPath, err := s.abs(relPath)
	if err != nil {
		return nil, err
	}

	info, err := s.fs.Stat(absPath)
	if err != nil {
		return nil, err
	}

	node := s.fileInfoToNode(absPath, info)
	
	// 如果是文件夹，不加载子节点
	if node.Type == "folder" {
		node.Children = nil
	}
	
	return node, nil
}

// ListNodes 列出节点
func (s *FileSystemService) ListNodes(parentPath string) ([]*models.FileSystemNode, error) {
	absPath, err := s.abs(parentPath)
	if err != nil {
		return nil, err
	}

	entries, err := afero.ReadDir(s.fs, absPath)
	if err != nil {
		return nil, err
	}

	nodes := make([]*models.FileSystemNode, 0, len(entries))
	
	// 排序：文件夹在前，文件在后，按名称排序
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	for _, entry := range entries {
		// 跳过隐藏文件
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		
		entryPath := filepath.Join(absPath, entry.Name())
		node := s.fileInfoToNode(entryPath, entry)
		nodes = append(nodes, node)
	}

	return nodes, nil
}

// GetTree 获取文件树
func (s *FileSystemService) GetTree(relPath string, depth int) (*models.TreeNode, error) {
	node, err := s.GetNode(relPath)
	if err != nil {
		return nil, err
	}

	treeNode := &models.TreeNode{
		FileSystemNode: node,
	}

	if node.Type == "folder" && depth != 0 {
		children, err := s.ListNodes(relPath)
		if err == nil {
			treeNode.Children = make([]*models.TreeNode, 0, len(children))
			for _, child := range children {
				childRelPath := s.rel(child.Path)
				if child.Type == "folder" && depth > 1 {
					childTree, err := s.GetTree(childRelPath, depth-1)
					if err == nil {
						treeNode.Children = append(treeNode.Children, childTree)
					}
				} else {
					treeNode.Children = append(treeNode.Children, &models.TreeNode{
						FileSystemNode: child,
					})
				}
			}
		}
	}

	return treeNode, nil
}

// CreateFile 创建文件
func (s *FileSystemService) CreateFile(relPath string, content string, fileType string) error {
	absPath, err := s.abs(relPath)
	if err != nil {
		return err
	}

	// 确保父目录存在
	if err := s.fs.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		return err
	}

	// 检查文件是否已存在
	if _, err := s.fs.Stat(absPath); err == nil {
		return errors.New("file already exists")
	}

	// 写入文件
	if err := afero.WriteFile(s.fs, absPath, []byte(content), 0644); err != nil {
		return err
	}

	// 如果是 Markdown 文件，提取标签
	if fileType == "markdown" {
		tags := s.extractTagsFromContent(content)
		fileID := s.generateFileID(relPath)
		for _, tagName := range tags {
			s.tagSvc.AddTagToFile(tagName, fileID)
		}
	}

	return nil
}

// UpdateFile 更新文件
func (s *FileSystemService) UpdateFile(relPath string, content string) error {
	absPath, err := s.abs(relPath)
	if err != nil {
		return err
	}

	// 检查文件是否存在
	info, err := s.fs.Stat(absPath)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return errors.New("cannot update directory")
	}

	// 写入文件
	if err := afero.WriteFile(s.fs, absPath, []byte(content), 0644); err != nil {
		return err
	}

	// 更新标签
	if s.detectFileType(filepath.Base(absPath)) == "markdown" {
		fileID := s.generateFileID(relPath)
		
		// 获取旧标签
		oldTags, _ := s.tagSvc.GetFileTags(fileID)
		oldTagSet := make(map[string]bool)
		for _, tag := range oldTags {
			oldTagSet[tag.Name] = true
		}
		
		// 提取新标签
		newTags := s.extractTagsFromContent(content)
		newTagSet := make(map[string]bool)
		for _, tag := range newTags {
			newTagSet[tag] = true
		}
		
		// 添加新标签
		for tag := range newTagSet {
			if !oldTagSet[tag] {
				s.tagSvc.AddTagToFile(tag, fileID)
			}
		}
		
		// 删除旧标签
		for tag := range oldTagSet {
			if !newTagSet[tag] {
				s.tagSvc.RemoveTagFromFile(tag, fileID)
			}
		}
	}

	return nil
}

// DeleteNode 删除节点
func (s *FileSystemService) DeleteNode(relPath string) error {
	absPath, err := s.abs(relPath)
	if err != nil {
		return err
	}

	// 获取节点信息
	info, err := s.fs.Stat(absPath)
	if err != nil {
		return err
	}

	// 创建回收站目录
	trashDir := filepath.Join(s.root, ".trash")
	if err := s.fs.MkdirAll(trashDir, 0755); err != nil {
		return err
	}

	// 生成回收站路径
	timestamp := time.Now().Format("20060102-150405")
	trashName := fmt.Sprintf("%s-%s", timestamp, filepath.Base(absPath))
	trashPath := filepath.Join(trashDir, trashName)

	// 移动到回收站
	if err := s.fs.Rename(absPath, trashPath); err != nil {
		return err
	}

	// 如果是文件，清理标签关联
	if !info.IsDir() {
		fileID := s.generateFileID(relPath)
		tags, _ := s.tagSvc.GetFileTags(fileID)
		for _, tag := range tags {
			s.tagSvc.RemoveTagFromFile(tag.Name, fileID)
		}
	}

	return nil
}

// MoveNode 移动/重命名节点
func (s *FileSystemService) MoveNode(oldRelPath, newRelPath string) error {
	oldAbsPath, err := s.abs(oldRelPath)
	if err != nil {
		return err
	}

	newAbsPath, err := s.abs(newRelPath)
	if err != nil {
		return err
	}

	// 确保目标父目录存在
	if err := s.fs.MkdirAll(filepath.Dir(newAbsPath), 0755); err != nil {
		return err
	}

	// 执行移动
	if err := s.fs.Rename(oldAbsPath, newAbsPath); err != nil {
		return err
	}

	// 更新文件ID（如果是文件）
	info, _ := s.fs.Stat(newAbsPath)
	if info != nil && !info.IsDir() {
		oldFileID := s.generateFileID(oldRelPath)
		newFileID := s.generateFileID(newRelPath)
		s.tagSvc.UpdateFileID(oldFileID, newFileID)
	}

	return nil
}

// SearchFiles 搜索文件
func (s *FileSystemService) SearchFiles(query string) ([]*models.SearchResult, error) {
	results := make([]*models.SearchResult, 0)
	
	searchRegex, err := regexp.Compile("(?i)" + regexp.QuoteMeta(query))
	if err != nil {
		return nil, err
	}

	err = afero.Walk(s.fs, s.root, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// 跳过隐藏文件和目录
		if strings.Contains(path, "/.") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// 文件名匹配
		if searchRegex.MatchString(info.Name()) {
			node := s.fileInfoToNode(path, info)
			results = append(results, &models.SearchResult{
				Node:    node,
				Matches: []models.Match{},
			})
		}

		// 文件内容搜索（仅文本文件）
		if !info.IsDir() && s.isTextFile(path) {
			content, err := afero.ReadFile(s.fs, path)
			if err == nil {
				lines := strings.Split(string(content), "\n")
				for i, line := range lines {
					if searchRegex.MatchString(line) {
						if len(results) == 0 || results[len(results)-1].Node.Path != path {
							node := s.fileInfoToNode(path, info)
							results = append(results, &models.SearchResult{
								Node:    node,
								Matches: []models.Match{},
							})
						}
						
						result := results[len(results)-1]
						result.Matches = append(result.Matches, models.Match{
							Line:    i + 1,
							Column:  searchRegex.FindStringIndex(line)[0] + 1,
							Text:    line,
							Context: s.getContext(lines, i),
						})
					}
				}
			}
		}

		return nil
	})

	return results, err
}

// 辅助方法

func (s *FileSystemService) abs(relPath string) (string, error) {
	if relPath == "" || relPath == "/" {
		return s.root, nil
	}
	clean := filepath.Clean(relPath)
	if strings.HasPrefix(clean, "..") {
		return "", errors.New("invalid path")
	}
	if strings.HasPrefix(clean, s.root) {
		return clean, nil
	}
	return filepath.Join(s.root, strings.TrimPrefix(clean, "/")), nil
}

func (s *FileSystemService) rel(absPath string) string {
	rel, err := filepath.Rel(s.root, absPath)
	if err != nil || rel == "." {
		return "/"
	}
	return "/" + filepath.ToSlash(rel)
}

func (s *FileSystemService) fileInfoToNode(absPath string, info os.FileInfo) *models.FileSystemNode {
	relPath := s.rel(absPath)
	nodeType := "file"
	if info.IsDir() {
		nodeType = "folder"
	}

	node := &models.FileSystemNode{
		ID:         s.generateFileID(relPath),
		Name:       info.Name(),
		Path:       relPath,
		Type:       nodeType,
		Size:       info.Size(),
		CreatedAt:  info.ModTime(), // 使用修改时间作为创建时间
		UpdatedAt:  info.ModTime(),
		ParentPath: filepath.Dir(relPath),
	}

	if nodeType == "file" {
		node.FileType = s.detectFileType(info.Name())
	}

	return node
}

func (s *FileSystemService) generateFileID(relPath string) string {
	h := md5.New()
	h.Write([]byte(relPath))
	return hex.EncodeToString(h.Sum(nil))
}

func (s *FileSystemService) detectFileType(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".md":
		return "markdown"
	case ".db", ".sqlite":
		return "database"
	case ".canvas":
		return "canvas"
	case ".html", ".htm":
		return "html"
	case ".js", ".ts", ".tsx", ".jsx", ".go", ".py", ".rs", ".java", ".cpp", ".c":
		return "code"
	default:
		if mt := mime.TypeByExtension(ext); strings.HasPrefix(mt, "text/") {
			return "code"
		}
		return "file"
	}
}

func (s *FileSystemService) isTextFile(path string) bool {
	ext := filepath.Ext(path)
	textExts := []string{".md", ".txt", ".js", ".ts", ".tsx", ".jsx", ".go", ".py", ".rs", ".java", ".cpp", ".c", ".html", ".css", ".json", ".xml", ".yaml", ".yml"}
	for _, textExt := range textExts {
		if strings.EqualFold(ext, textExt) {
			return true
		}
	}
	return false
}

func (s *FileSystemService) extractTagsFromContent(content string) []string {
	tagRegex := regexp.MustCompile(`#(\w+)`)
	matches := tagRegex.FindAllStringSubmatch(content, -1)
	
	tagSet := make(map[string]bool)
	for _, match := range matches {
		if len(match) > 1 {
			tagSet[match[1]] = true
		}
	}
	
	tags := make([]string, 0, len(tagSet))
	for tag := range tagSet {
		tags = append(tags, tag)
	}
	
	return tags
}

func (s *FileSystemService) getContext(lines []string, index int) string {
	start := index - 2
	if start < 0 {
		start = 0
	}
	
	end := index + 3
	if end > len(lines) {
		end = len(lines)
	}
	
	contextLines := lines[start:end]
	return strings.Join(contextLines, "\n")
}