package ifs

import (
	"fmt"
	"io/fs"
	"path"
	"strings"
)

// IndexedDBFileSystem is the implementation of a fsx.FileSystem
type IndexedDBFileSystem struct{}

func NewIndexedDBFileSystem() *IndexedDBFileSystem {
	return &IndexedDBFileSystem{}
}

// ReadDir Read directory contents
func (IndexedDBFileSystem) ReadDir(dirname string) (ret []fs.DirEntry, err error) {
	dirname = path.Clean(dirname)
	if dirname != "." && !strings.HasSuffix(dirname, "/") {
		dirname += "/"
	}

	uniqueEntries := make(map[string]bool)

	filesList, err := getFilesStartingWith(dirname)
	if err != nil {
		err = fmt.Errorf("error getting files starting with %s: %w", dirname, err)
		return
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
				fileProperties, err := getFileProperties(filePath)
				if err != nil {
					return nil, err
				}

				ret = append(ret, IndexedDBDirEntry{
					Path:        entry,
					IsDirectory: isDir,
					Size:        fileProperties.Size,
					ModTime:     fileProperties.LastModified,
				})
				uniqueEntries[entry] = true
			}
		}

	}

	return
}

// ReadFile Read file contents
func (IndexedDBFileSystem) ReadFile(filename string) (ret []byte, err error) {
	ret, err = readFileFromIndexedDB(filename)
	if err != nil {
		err = fmt.Errorf("error reading file from IndexedDB: %w", err)
	}
	return
}

// Join Connect path elements
func (IndexedDBFileSystem) Join(elem ...string) string {
	return path.Join(elem...)
}
