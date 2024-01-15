package ifs

import (
	"errors"
	"io/fs"
	"log"
	"path"
	"strings"
)

// IndexedDBFileSystem is the implementation of a fsx.FileSystem
type IndexedDBFileSystem struct{}

func NewIndexedDBFileSystem() IndexedDBFileSystem {
	return IndexedDBFileSystem{}
}

// ReadDir Read directory contents
func (IndexedDBFileSystem) ReadDir(dirname string) ([]fs.DirEntry, error) {
	var entries []fs.DirEntry
	dirname = path.Clean(dirname)
	if dirname != "." && !strings.HasSuffix(dirname, "/") {
		dirname += "/"
	}

	uniqueEntries := make(map[string]bool)

	filesList, err := getFilesStartingWith(dirname)
	if err != nil {
		log.Fatalln("read dir error:", err)
		return nil, err
	}

	for _, filePath := range filesList {
		// Get relative path
		relativePath := strings.TrimPrefix(filePath, dirname)

		// Split path to get possible direct subdirectories or files
		splitPath := strings.Split(relativePath, "/")
		if len(splitPath) > 0 {
			entry := splitPath[0]
			if _, exists := uniqueEntries[entry]; !exists {
				isDir := len(splitPath) > 1 // If the length after splitting the path is greater than 1, it is a directory
				fileProperties, err := GetFileProperties(filePath)
				if err != nil {
					return nil, err
				}

				entries = append(entries, IndexedDBDirEntry{
					Path:        entry,
					IsDirectory: isDir,
					Size:        fileProperties.Size,
					ModTime:     fileProperties.LastModified,
				})
				uniqueEntries[entry] = true
			}
		}

	}

	return entries, nil
}

// ReadFile Read file contents
func (IndexedDBFileSystem) ReadFile(filename string) ([]byte, error) {
	content, err := ReadFileFromIndexedDB(filename)
	if err != nil {
		return nil, errors.New("file not found")
	}
	return content, nil
}

// Join Connect path elements
func (IndexedDBFileSystem) Join(elem ...string) string {
	return path.Join(elem...)
}
