package xgoexec

import (
	"fmt"
	"io/fs"
	"path"
	"strings"
)

type MapFS map[string][]byte

func (p MapFS) ReadFile(name string) ([]byte, error) {
	value, ok := p[name]
	if !ok {
		return nil, fs.ErrNotExist
	}
	return value, nil
}

func (p MapFS) ReadDir(dirname string) ([]fs.DirEntry, error) {
	prefix := ""
	if dirname != "." {
		prefix = dirname + "/"
	}
	entries := map[string]bool{}
	for filename := range p {
		if !strings.HasPrefix(filename, prefix) {
			continue
		}
		name := strings.TrimPrefix(filename, prefix)
		if i := strings.IndexByte(name, '/'); i >= 0 {
			entries[name[:i]] = true
		} else {
			entries[name] = false
		}
	}
	result := make([]fs.DirEntry, 0, len(entries))
	for name, isDir := range entries {
		result = append(result, mapDirEntry{name: name, dir: isDir})
	}
	return result, nil
}

func (p MapFS) Join(elem ...string) string          { return path.Join(elem...) }
func (p MapFS) Base(filename string) string         { return path.Base(filename) }
func (p MapFS) Abs(filename string) (string, error) { return path.Join("/", filename), nil }

type mapDirEntry struct {
	name string
	dir  bool
}

func (p mapDirEntry) Name() string { return p.name }
func (p mapDirEntry) IsDir() bool  { return p.dir }
func (p mapDirEntry) Type() fs.FileMode {
	if p.dir {
		return fs.ModeDir
	}
	return 0
}
func (p mapDirEntry) Info() (fs.FileInfo, error) { return nil, fmt.Errorf("not implemented") }
