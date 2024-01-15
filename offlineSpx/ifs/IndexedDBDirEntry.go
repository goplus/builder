package ifs

import (
	"io/fs"
	"os"
	"time"
)

// IndexedDBDirEntry is the implementation of a fs.DirEntry
type IndexedDBDirEntry struct {
	Path        string
	IsDirectory bool
	Size        int64
	ModTime     time.Time
}

func (e IndexedDBDirEntry) Name() string { return e.Path }
func (e IndexedDBDirEntry) IsDir() bool  { return e.IsDirectory }
func (e IndexedDBDirEntry) Type() fs.FileMode {
	if e.IsDir() {
		return os.ModeDir
	}
	return 0 // file
}
func (e IndexedDBDirEntry) Info() (fs.FileInfo, error) {
	return indexedDBFileInfo{
		name:    e.Path,
		size:    e.Size,
		modTime: e.ModTime,
		isDir:   e.IsDirectory,
	}, nil
}
