package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"server/internal/models"
)

// TagService 标签服务
type TagService struct {
	dataPath string
	tags     map[string]*models.Tag
	relations map[string]map[string]*models.TagFileRelation // tagID -> fileID -> relation
	fileTags  map[string][]string // fileID -> tagIDs
	mu       sync.RWMutex
}

// NewTagService 创建标签服务
func NewTagService(dataPath string) (*TagService, error) {
	s := &TagService{
		dataPath:  dataPath,
		tags:      make(map[string]*models.Tag),
		relations: make(map[string]map[string]*models.TagFileRelation),
		fileTags:  make(map[string][]string),
	}
	
	// 确保数据目录存在
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		return nil, err
	}
	
	// 加载标签数据
	if err := s.loadData(); err != nil {
		// 如果文件不存在，创建空数据
		if os.IsNotExist(err) {
			if err := s.saveData(); err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	
	return s, nil
}

// GetTag 获取标签
func (s *TagService) GetTag(id string) (*models.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	tag, exists := s.tags[id]
	if !exists {
		return nil, errors.New("tag not found")
	}
	
	return tag, nil
}

// GetTagByName 通过名称获取标签
func (s *TagService) GetTagByName(name string) (*models.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	for _, tag := range s.tags {
		if tag.Name == name {
			return tag, nil
		}
	}
	
	return nil, errors.New("tag not found")
}

// ListTags 列出所有标签
func (s *TagService) ListTags() ([]*models.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	tags := make([]*models.Tag, 0, len(s.tags))
	for _, tag := range s.tags {
		tags = append(tags, tag)
	}
	
	return tags, nil
}

// CreateTag 创建标签
func (s *TagService) CreateTag(tag *models.Tag) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 检查名称是否已存在
	for _, existingTag := range s.tags {
		if existingTag.Name == tag.Name {
			return errors.New("tag name already exists")
		}
	}
	
	// 生成ID
	if tag.ID == "" {
		tag.ID = uuid.New().String()
	}
	
	// 设置时间戳
	now := time.Now()
	tag.CreatedAt = now
	tag.UpdatedAt = now
	tag.UsageCount = 0
	
	// 保存标签
	s.tags[tag.ID] = tag
	s.relations[tag.ID] = make(map[string]*models.TagFileRelation)
	
	return s.saveData()
}

// UpdateTag 更新标签
func (s *TagService) UpdateTag(id string, updates map[string]interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	tag, exists := s.tags[id]
	if !exists {
		return errors.New("tag not found")
	}
	
	// 应用更新
	if name, ok := updates["name"].(string); ok {
		// 检查新名称是否已存在
		for _, existingTag := range s.tags {
			if existingTag.ID != id && existingTag.Name == name {
				return errors.New("tag name already exists")
			}
		}
		tag.Name = name
	}
	
	if color, ok := updates["color"].(string); ok {
		tag.Color = color
	}
	
	if description, ok := updates["description"].(string); ok {
		tag.Description = description
	}
	
	tag.UpdatedAt = time.Now()
	
	return s.saveData()
}

// DeleteTag 删除标签
func (s *TagService) DeleteTag(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if _, exists := s.tags[id]; !exists {
		return errors.New("tag not found")
	}
	
	// 删除标签和所有关联
	delete(s.tags, id)
	delete(s.relations, id)
	
	// 从文件标签映射中删除
	for fileID, tagIDs := range s.fileTags {
		newTagIDs := make([]string, 0)
		for _, tagID := range tagIDs {
			if tagID != id {
				newTagIDs = append(newTagIDs, tagID)
			}
		}
		if len(newTagIDs) == 0 {
			delete(s.fileTags, fileID)
		} else {
			s.fileTags[fileID] = newTagIDs
		}
	}
	
	return s.saveData()
}

// GetFileTags 获取文件的标签
func (s *TagService) GetFileTags(fileID string) ([]*models.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	tagIDs, exists := s.fileTags[fileID]
	if !exists {
		return []*models.Tag{}, nil
	}
	
	tags := make([]*models.Tag, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		if tag, exists := s.tags[tagID]; exists {
			tags = append(tags, tag)
		}
	}
	
	return tags, nil
}

// GetTagFiles 获取标签关联的文件ID列表
func (s *TagService) GetTagFiles(tagID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	if _, exists := s.tags[tagID]; !exists {
		return nil, errors.New("tag not found")
	}
	
	fileRelations, exists := s.relations[tagID]
	if !exists {
		return []string{}, nil
	}
	
	fileIDs := make([]string, 0, len(fileRelations))
	for fileID := range fileRelations {
		fileIDs = append(fileIDs, fileID)
	}
	
	return fileIDs, nil
}

// AddTagToFile 添加标签到文件
func (s *TagService) AddTagToFile(tagName string, fileID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 查找或创建标签
	var tag *models.Tag
	for _, t := range s.tags {
		if t.Name == tagName {
			tag = t
			break
		}
	}
	
	if tag == nil {
		// 创建新标签
		tag = &models.Tag{
			ID:   uuid.New().String(),
			Name: tagName,
		}
		s.CreateTag(tag)
	}
	
	// 检查是否已关联
	if relations, exists := s.relations[tag.ID]; exists {
		if _, exists := relations[fileID]; exists {
			return nil // 已经关联
		}
	} else {
		s.relations[tag.ID] = make(map[string]*models.TagFileRelation)
	}
	
	// 创建关联
	relation := &models.TagFileRelation{
		TagID:  tag.ID,
		FileID: fileID,
	}
	s.relations[tag.ID][fileID] = relation
	
	// 更新文件标签映射
	if _, exists := s.fileTags[fileID]; !exists {
		s.fileTags[fileID] = []string{}
	}
	
	// 检查是否已在列表中
	found := false
	for _, tid := range s.fileTags[fileID] {
		if tid == tag.ID {
			found = true
			break
		}
	}
	if !found {
		s.fileTags[fileID] = append(s.fileTags[fileID], tag.ID)
	}
	
	// 更新使用计数
	tag.UsageCount++
	tag.UpdatedAt = time.Now()
	
	return s.saveData()
}

// RemoveTagFromFile 从文件移除标签
func (s *TagService) RemoveTagFromFile(tagName string, fileID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 查找标签
	var tag *models.Tag
	for _, t := range s.tags {
		if t.Name == tagName {
			tag = t
			break
		}
	}
	
	if tag == nil {
		return nil // 标签不存在，无需移除
	}
	
	// 删除关联
	if relations, exists := s.relations[tag.ID]; exists {
		delete(relations, fileID)
	}
	
	// 更新文件标签映射
	if tagIDs, exists := s.fileTags[fileID]; exists {
		newTagIDs := make([]string, 0)
		for _, tid := range tagIDs {
			if tid != tag.ID {
				newTagIDs = append(newTagIDs, tid)
			}
		}
		if len(newTagIDs) == 0 {
			delete(s.fileTags, fileID)
		} else {
			s.fileTags[fileID] = newTagIDs
		}
	}
	
	// 更新使用计数
	if tag.UsageCount > 0 {
		tag.UsageCount--
	}
	tag.UpdatedAt = time.Now()
	
	return s.saveData()
}

// UpdateFileID 更新文件ID（用于文件移动/重命名）
func (s *TagService) UpdateFileID(oldFileID, newFileID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 更新文件标签映射
	if tagIDs, exists := s.fileTags[oldFileID]; exists {
		s.fileTags[newFileID] = tagIDs
		delete(s.fileTags, oldFileID)
		
		// 更新所有标签的关联
		for _, tagID := range tagIDs {
			if relations, exists := s.relations[tagID]; exists {
				if relation, exists := relations[oldFileID]; exists {
					relation.FileID = newFileID
					relations[newFileID] = relation
					delete(relations, oldFileID)
				}
			}
		}
	}
	
	return s.saveData()
}

// ExtractTagsFromContent 从内容中提取标签
func (s *TagService) ExtractTagsFromContent(content string) ([]string, error) {
	// 这个功能已经在 FileSystemService 中实现
	// 这里只是提供一个接口
	return []string{}, nil
}

// 数据持久化

type tagData struct {
	Tags      map[string]*models.Tag                          `json:"tags"`
	Relations map[string]map[string]*models.TagFileRelation   `json:"relations"`
	FileTags  map[string][]string                            `json:"fileTags"`
}

func (s *TagService) loadData() error {
	dataFile := filepath.Join(s.dataPath, "tags.json")
	
	data, err := ioutil.ReadFile(dataFile)
	if err != nil {
		return err
	}
	
	var td tagData
	if err := json.Unmarshal(data, &td); err != nil {
		return err
	}
	
	s.tags = td.Tags
	s.relations = td.Relations
	s.fileTags = td.FileTags
	
	if s.tags == nil {
		s.tags = make(map[string]*models.Tag)
	}
	if s.relations == nil {
		s.relations = make(map[string]map[string]*models.TagFileRelation)
	}
	if s.fileTags == nil {
		s.fileTags = make(map[string][]string)
	}
	
	return nil
}

func (s *TagService) saveData() error {
	dataFile := filepath.Join(s.dataPath, "tags.json")
	
	td := tagData{
		Tags:      s.tags,
		Relations: s.relations,
		FileTags:  s.fileTags,
	}
	
	data, err := json.MarshalIndent(td, "", "  ")
	if err != nil {
		return err
	}
	
	// 写入临时文件
	tmpFile := fmt.Sprintf("%s.tmp", dataFile)
	if err := ioutil.WriteFile(tmpFile, data, 0644); err != nil {
		return err
	}
	
	// 原子性替换
	return os.Rename(tmpFile, dataFile)
}