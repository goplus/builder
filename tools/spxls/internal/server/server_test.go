package server

import "github.com/goplus/builder/tools/spxls/internal/vfs"

func newMapFSWithoutModTime(files map[string][]byte) *vfs.MapFS {
	return vfs.NewMapFS(func() map[string]vfs.MapFile {
		fileMap := make(map[string]vfs.MapFile)
		for k, v := range files {
			fileMap[k] = vfs.MapFile{Content: v}
		}
		return fileMap
	})
}
