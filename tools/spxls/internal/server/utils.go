package server

import gopast "github.com/goplus/gop/ast"

// gopASTFileMapToSlice converts a map of [gopast.File] to a slice of [gopast.File].
func gopASTFileMapToSlice(fileMap map[string]*gopast.File) []*gopast.File {
	files := make([]*gopast.File, 0, len(fileMap))
	for _, file := range fileMap {
		files = append(files, file)
	}
	return files
}
