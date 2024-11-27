package server

import (
	"go/types"

	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// gopASTFileMapToSlice converts a map of [gopast.File] to a slice of [gopast.File].
func gopASTFileMapToSlice(fileMap map[string]*gopast.File) []*gopast.File {
	files := make([]*gopast.File, 0, len(fileMap))
	for _, file := range fileMap {
		files = append(files, file)
	}
	return files
}

// getStringLitOrConstValue attempts to get the value from a string literal or
// constant. It returns the string value and true if successful, or empty string
// and false if the expression is not a string literal or constant, or if the
// value cannot be determined.
func getStringLitOrConstValue(expr gopast.Expr, tv types.TypeAndValue) (string, bool) {
	switch e := expr.(type) {
	case *gopast.BasicLit:
		if e.Kind != goptoken.STRING {
			return "", false
		}
		s := e.Value[1 : len(e.Value)-1] // Unquote the string.
		return s, true
	case *gopast.Ident:
		if tv.Value != nil {
			// If it's a constant, we can get its value.
			s := tv.Value.String()
			s = s[1 : len(s)-1] // Unquote the string.
			return s, true
		}
		// There is nothing we can do for string variables.
		return "", false
	default:
		return "", false
	}
}
