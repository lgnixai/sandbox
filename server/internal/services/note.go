package services

import (
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"

	"server/internal/models"
)

// NoteService 笔记服务
type NoteService struct {
	fsSvc  *FileSystemService
	tagSvc *TagService
}

// NewNoteService 创建笔记服务
func NewNoteService(fsSvc *FileSystemService, tagSvc *TagService) *NoteService {
	return &NoteService{
		fsSvc:  fsSvc,
		tagSvc: tagSvc,
	}
}

// GetNote 获取笔记
func (s *NoteService) GetNote(relPath string) (*models.Note, error) {
	// 获取文件节点
	node, err := s.fsSvc.GetNode(relPath)
	if err != nil {
		return nil, err
	}
	
	if node.Type != "file" || node.FileType != "markdown" {
		return nil, errors.New("not a markdown file")
	}
	
	// 读取内容
	absPath, _ := s.fsSvc.abs(relPath)
	contentBytes, err := s.fsSvc.fs.ReadFile(absPath)
	if err != nil {
		return nil, err
	}
	content := string(contentBytes)
	
	// 创建笔记对象
	note := &models.Note{
		FileSystemNode: *node,
		Content:        content,
		Tags:           s.extractTags(content),
		Links:          s.extractLinks(content),
		Backlinks:      []string{}, // 需要单独计算
		Metadata:       s.extractMetadata(content),
	}
	
	// 获取标签
	fileID := s.fsSvc.generateFileID(relPath)
	tags, _ := s.tagSvc.GetFileTags(fileID)
	tagNames := make([]string, len(tags))
	for i, tag := range tags {
		tagNames[i] = tag.Name
	}
	note.Tags = tagNames
	
	return note, nil
}

// CreateNote 创建笔记
func (s *NoteService) CreateNote(relPath string, title string, content string) error {
	// 确保路径以 .md 结尾
	if !strings.HasSuffix(relPath, ".md") {
		relPath += ".md"
	}
	
	// 如果没有内容，创建默认内容
	if content == "" {
		content = fmt.Sprintf("# %s\n\n", title)
	}
	
	// 创建文件
	return s.fsSvc.CreateFile(relPath, content, "markdown")
}

// UpdateNote 更新笔记
func (s *NoteService) UpdateNote(relPath string, updates map[string]interface{}) error {
	// 获取当前笔记
	note, err := s.GetNote(relPath)
	if err != nil {
		return err
	}
	
	// 应用更新
	if content, ok := updates["content"].(string); ok {
		note.Content = content
		
		// 更新文件
		if err := s.fsSvc.UpdateFile(relPath, content); err != nil {
			return err
		}
		
		// 更新链接
		s.UpdateLinks(relPath)
	}
	
	if title, ok := updates["title"].(string); ok && title != note.Name {
		// 重命名文件
		dir := filepath.Dir(relPath)
		newPath := filepath.Join(dir, title+".md")
		if err := s.fsSvc.MoveNode(relPath, newPath); err != nil {
			return err
		}
	}
	
	return nil
}

// UpdateLinks 更新笔记的链接
func (s *NoteService) UpdateLinks(relPath string) error {
	note, err := s.GetNote(relPath)
	if err != nil {
		return err
	}
	
	// 提取新的链接
	newLinks := s.extractLinks(note.Content)
	
	// TODO: 更新反向链接索引
	// 这需要一个专门的链接索引服务
	
	return nil
}

// GetBacklinks 获取反向链接
func (s *NoteService) GetBacklinks(relPath string) ([]*models.Note, error) {
	// TODO: 实现反向链接查询
	// 需要扫描所有笔记，查找包含当前笔记链接的笔记
	
	backlinks := make([]*models.Note, 0)
	
	// 获取当前笔记的标题
	node, err := s.fsSvc.GetNode(relPath)
	if err != nil {
		return backlinks, err
	}
	
	noteName := strings.TrimSuffix(node.Name, ".md")
	linkPattern := regexp.MustCompile(`\[\[` + regexp.QuoteMeta(noteName) + `\]\]`)
	
	// 搜索包含链接的文件
	results, err := s.fsSvc.SearchFiles(fmt.Sprintf("[[%s]]", noteName))
	if err != nil {
		return backlinks, err
	}
	
	for _, result := range results {
		if result.Node.Path != relPath && result.Node.FileType == "markdown" {
			note, err := s.GetNote(result.Node.Path)
			if err == nil && linkPattern.MatchString(note.Content) {
				backlinks = append(backlinks, note)
			}
		}
	}
	
	return backlinks, nil
}

// BatchUpdateNotes 批量更新笔记
func (s *NoteService) BatchUpdateNotes(updates []struct {
	Path    string
	Updates map[string]interface{}
}) error {
	for _, update := range updates {
		if err := s.UpdateNote(update.Path, update.Updates); err != nil {
			return err
		}
	}
	return nil
}

// 辅助方法

func (s *NoteService) extractTags(content string) []string {
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

func (s *NoteService) extractLinks(content string) []string {
	linkRegex := regexp.MustCompile(`\[\[([^\]]+)\]\]`)
	matches := linkRegex.FindAllStringSubmatch(content, -1)
	
	linkSet := make(map[string]bool)
	for _, match := range matches {
		if len(match) > 1 {
			linkSet[match[1]] = true
		}
	}
	
	links := make([]string, 0, len(linkSet))
	for link := range linkSet {
		links = append(links, link)
	}
	
	return links
}

func (s *NoteService) extractMetadata(content string) map[string]interface{} {
	metadata := make(map[string]interface{})
	
	// 检查 YAML frontmatter
	if strings.HasPrefix(content, "---\n") {
		endIndex := strings.Index(content[4:], "\n---\n")
		if endIndex > 0 {
			// TODO: 解析 YAML
			// 这里需要引入 YAML 解析库
		}
	}
	
	return metadata
}