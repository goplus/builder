package internal

import "github.com/goplus/gop/token"

// GetDiagnostics return a json object with error info.
func GetDiagnostics(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	_, err := spxInfo(initSPXMod(), fset, fileName, fileCode)
	return error2List(err)
}
