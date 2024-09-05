package internal

import (
	"errors"
	"io/fs"
	"path/filepath"
	"strings"
	"time"
)

type VirtualFileSystem struct {
	files map[string]string
}

func NewVFS() *VirtualFileSystem {
	return &VirtualFileSystem{files: make(map[string]string)}
}

func (vfs *VirtualFileSystem) AddFile(name, content string) {
	vfs.files[name] = content
}

func (vfs *VirtualFileSystem) Open(name string) (fs.File, error) {
	content, ok := vfs.files[name]
	if !ok {
		return nil, errors.New("file not found")
	}
	return &virtualFile{name: name, content: strings.NewReader(content)}, nil
}

func (vfs *VirtualFileSystem) ReadDir(dirname string) ([]fs.DirEntry, error) {
	var entries []fs.DirEntry
	prefix := filepath.Clean(dirname) + string(filepath.Separator)
	for name := range vfs.files {
		if strings.HasPrefix(filepath.Clean(name), prefix) {
			relativePath := strings.TrimPrefix(filepath.Clean(name), prefix)
			if relativePath == "" || strings.Contains(relativePath, string(filepath.Separator)) {
				continue
			}
			entries = append(entries, virtualDirEntry{name: relativePath})
		}
	}
	return entries, nil
}

func (vfs *VirtualFileSystem) Join(elem ...string) string {
	return filepath.Join(elem...)
}

func (vfs *VirtualFileSystem) Base(filename string) string {
	return filepath.Base(filename)
}

func (vfs *VirtualFileSystem) ReadFile(filename string) ([]byte, error) {
	content, ok := vfs.files[filepath.Clean(filename)]
	if !ok {
		return nil, errors.New("file not found")
	}
	return []byte(content), nil
}

func (vfs *VirtualFileSystem) Abs(path string) (string, error) {
	return filepath.Abs(path)
}

type virtualFile struct {
	name    string
	content *strings.Reader
}

func (vf *virtualFile) Read(p []byte) (n int, err error) {
	return vf.content.Read(p)
}

func (vf *virtualFile) Stat() (fs.FileInfo, error) {
	return &virtualFileInfo{name: vf.name, size: int64(vf.content.Size())}, nil
}

func (vf *virtualFile) Close() error {
	return nil
}

type virtualFileInfo struct {
	name string
	size int64
}

func (vfi *virtualFileInfo) Name() string       { return vfi.name }
func (vfi *virtualFileInfo) Size() int64        { return vfi.size }
func (vfi *virtualFileInfo) Mode() fs.FileMode  { return 0444 }
func (vfi *virtualFileInfo) ModTime() time.Time { return time.Time{} }
func (vfi *virtualFileInfo) IsDir() bool        { return false }
func (vfi *virtualFileInfo) Sys() interface{}   { return nil }

type virtualDirEntry struct {
	name string
}

func (vde virtualDirEntry) Name() string      { return vde.name }
func (vde virtualDirEntry) IsDir() bool       { return false }
func (vde virtualDirEntry) Type() fs.FileMode { return fs.FileMode(0) }
func (vde virtualDirEntry) Info() (fs.FileInfo, error) {
	return &virtualFileInfo{name: vde.name, size: 0}, nil
}
