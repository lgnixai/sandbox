package services

import (
	"github.com/spf13/afero"
)

// ReadFile 读取文件内容（公开方法）
func (s *FileSystemService) ReadFile(relPath string) (string, error) {
	absPath, err := s.abs(relPath)
	if err != nil {
		return "", err
	}
	
	content, err := afero.ReadFile(s.fs, absPath)
	if err != nil {
		return "", err
	}
	
	return string(content), nil
}