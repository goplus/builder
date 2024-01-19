package ifs

import (
	"os"
	"time"
)

// IndexedDBFileInfo is the implementation of an os.FileInfo
type IndexedDBFileInfo struct {
	name    string
	size    int64
	modTime time.Time
	isDir   bool
}

func (fi IndexedDBFileInfo) Name() string { return fi.name }
func (fi IndexedDBFileInfo) Size() int64  { return fi.size }
func (fi IndexedDBFileInfo) Mode() os.FileMode {
	if fi.isDir {
		return os.ModeDir
	}
	return 0
}
func (fi IndexedDBFileInfo) ModTime() time.Time { return fi.modTime }
func (fi IndexedDBFileInfo) IsDir() bool        { return fi.isDir }
func (fi IndexedDBFileInfo) Sys() interface{}   { return nil }
