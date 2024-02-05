package core

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"sort"
)

type FileInfo struct {
	Path string `json:"path"`
	MD5  string `json:"md5"`
}

type FileInfoWrapper struct {
	FileInfo []FileInfo `json:"fileInfo"`
}

type FileStorage interface {
	SaveFile(path string, data io.Reader) error
	DeleteFile(path string) error
	ListFiles(path string) ([]FileInfo, error)
	CalculateMD5(filePath string) (string, error)
}

type LocalFileStorage struct {
	BasePath string
}

func (lfs *LocalFileStorage) SaveFile(path string, data io.Reader) error {
	fullPath := filepath.Join(lfs.BasePath, path)
	if err := os.MkdirAll(filepath.Dir(fullPath), os.ModePerm); err != nil {
		return err
	}
	dst, err := os.Create(fullPath)
	if err != nil {
		return err
	}
	defer dst.Close()
	_, err = io.Copy(dst, data)
	return err
}

func (lfs *LocalFileStorage) DeleteFile(path string) error {
	fullPath := filepath.Join(lfs.BasePath, path)
	err := os.Remove(fullPath)
	if err != nil {
		return err
	}

	lfs.deleteEmptyParentDirs(filepath.Dir(fullPath))
	return nil
}

func (lfs *LocalFileStorage) deleteEmptyParentDirs(dirPath string) {
	for dirPath != lfs.BasePath {
		isEmpty, err := isDirEmpty(dirPath)
		if err != nil || !isEmpty {
			break
		}

		os.Remove(dirPath)
		dirPath = filepath.Dir(dirPath)
	}
}

func (lfs *LocalFileStorage) CalculateMD5(filePath string) (string, error) {
	var result string
	file, err := os.Open(filePath)
	if err != nil {
		return result, err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return result, err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func isDirEmpty(dirPath string) (bool, error) {
	f, err := os.Open(dirPath)
	if err != nil {
		return false, err
	}
	defer f.Close()

	_, err = f.Readdirnames(1)
	if err == io.EOF {
		return true, nil
	}
	return false, err
}

func (lfs *LocalFileStorage) ListFiles(path string) ([]FileInfo, error) {
	var files []FileInfo
	fullPath := filepath.Join(lfs.BasePath, path)
	err := filepath.Walk(fullPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			md5, err := lfs.CalculateMD5(path)
			if err != nil {
				return err
			}
			relativePath, _ := filepath.Rel(lfs.BasePath, path)
			files = append(files, FileInfo{Path: relativePath, MD5: md5})
		}
		return nil
	})
	return files, err
}

func (p *Project) CheckUpdate(ctx context.Context, clientFiles []FileInfo) ([]string, error) {
	serverFiles, err := p.fileStorage.ListFiles("")
	if err != nil {
		return nil, err
	}
	filesToUpdate, filesToDelete := checkFilesToUpdate(clientFiles, serverFiles)
	for _, filePath := range filesToDelete {
		err := p.fileStorage.DeleteFile(filePath)
		if err != nil {
			return nil, err
		}
	}
	return filesToUpdate, nil
}

func checkFilesToUpdate(clientFiles, serverFiles []FileInfo) ([]string, []string) {
	var filesToUpdate, filesToDelete []string
	serverFilesMap := make(map[string]FileInfo)
	for _, file := range serverFiles {
		serverFilesMap[file.Path] = file
	}
	for _, clientFile := range clientFiles {
		serverFile, exists := serverFilesMap[clientFile.Path]
		if !exists || serverFile.MD5 != clientFile.MD5 {
			filesToUpdate = append(filesToUpdate, clientFile.Path)
		}
		delete(serverFilesMap, clientFile.Path)
	}
	for path := range serverFilesMap {
		filesToDelete = append(filesToDelete, path)
	}
	sort.Strings(filesToDelete)
	return filesToUpdate, filesToDelete
}
