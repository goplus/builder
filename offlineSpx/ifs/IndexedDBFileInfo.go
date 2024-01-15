package ifs

import (
	"os"
	"time"
)

// indexedDBFileInfo is the implementation of an os.FileInfo
type indexedDBFileInfo struct {
	name    string
	size    int64
	modTime time.Time
	isDir   bool
}

func (fi indexedDBFileInfo) Name() string { return fi.name }
func (fi indexedDBFileInfo) Size() int64  { return fi.size }
func (fi indexedDBFileInfo) Mode() os.FileMode {
	if fi.isDir {
		return os.ModeDir
	}
	return 0
}
func (fi indexedDBFileInfo) ModTime() time.Time { return fi.modTime }
func (fi indexedDBFileInfo) IsDir() bool        { return fi.isDir }
func (fi indexedDBFileInfo) Sys() interface{}   { return nil }
