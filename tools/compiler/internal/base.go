package internal

import (
	"github.com/goplus/gop/token"
)

// GetDiagnostics return error info list.
func GetDiagnostics(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil
	}
	_, err = codeInfo(initSPXMod(), file, fset)
	list := parseErrorLines(error2List(err))
	return list
}

// GetDefinition return user's code definition.
func GetDefinition(fileName, fileCode string) interface{} {
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil
	}

	// get function list
	fnList, err := getCodeFunctionList(file)
	if err != nil {
		return nil
	}

	// get user code info
	infoList, err := codeInfo(initSPXMod(), file, fset)
	if err != nil {
		return nil
	}

	// set function list signature
	for _, fun := range fnList {
		extractFuncDetails(fun, infoList)
	}
	fnList.Position(fset)

	// set return json
	definition := make(map[string]interface{})
	definition["functionList"] = fnList
	return definition
}

// GetSPXFileType return a json object with spx type info.
func GetSPXFileType(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil
	}
	info, err := codeInfo(initSPXMod(), file, fset)
	if err != nil {
		return []nodeItem{}
	}
	list := info2List(fset, info.Types)
	defs := def2List(fset, info.Defs)
	m := make(map[string]interface{})
	m["list"] = list
	m["defs"] = defs
	return m
}

// GetInlayHint get hint for user code.
func GetInlayHint(fileName, fileCode string) interface{} {
	definition, ok := GetDefinition(fileName, fileCode).(map[string]interface{})
	if !ok {
		return nil
	}
	funcList := definition["functionList"].(funcList)

	var inlayHintList []*inlayHint

	for _, fun := range funcList {
		if checkFuncNameInList(fun.Name) {
			hint := &inlayHint{
				funcParameter: &funcParameter{
					Name:          fun.Name,
					StartPos:      fun.StartPos,
					EndPos:        fun.EndPos,
					StartPosition: fun.StartPosition,
					EndPosition:   fun.EndPosition,
				},
				Type: hintFunction,
			}
			inlayHintList = append(inlayHintList, hint)
		}
		if len(fun.Parameters) != 0 {
			for _, param := range fun.Parameters {
				if param.Type == "func()" {
					continue
				}
				hint := &inlayHint{
					funcParameter: param,
					Type:          hintParameter,
				}
				inlayHintList = append(inlayHintList, hint)
			}
		}
	}

	return inlayHintList
}
