package internal

import (
	"fmt"

	"github.com/goplus/gop/token"
	"github.com/goplus/igop/gopbuild"
)

// GetDiagnostics return error info list.
func GetDiagnostics(fileName, fileCode string) (interface{}, error) {
	// new file set
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}
	_, err = codeInfo(initSPXMod(), file, fset)
	list := parseErrorLines(error2List(err))
	return list, nil
}

// GetDefinition return user's code definition.
func GetDefinition(fileName, fileCode string) (interface{}, error) {
	fset := token.NewFileSet()
	file, _ := initParser(fset, fileName, fileCode)

	// get user code info
	info, _ := codeInfo(initSPXMod(), file, fset)
	definitionList := getDefinitionList(info)
	definitionList.Position(fset)

	return definitionList, nil
}

// GetSPXFileType return a json object with spx type info.
func GetSPXFileType(fileName, fileCode string) (interface{}, error) {
	// new file set
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}
	info, err := codeInfo(initSPXMod(), file, fset)
	if err != nil {
		return nil, err
	}
	list := info2List(fset, info.Types)
	defs := def2List(fset, info.Defs)
	uses := usesList(fset, info.Uses)
	m := make(map[string]interface{})
	m["list"] = list
	m["defs"] = defs
	m["uses"] = uses
	return m, nil
}

// GetInlayHint get hint for user code.
func GetInlayHint(fileName, fileCode string) (interface{}, error) {
	fset := token.NewFileSet()
	file, _ := initParser(fset, fileName, fileCode)

	// get function list
	fnList, _ := getCodeFunctionList(file)

	// get user code info
	infoList, _ := codeInfo(initSPXMod(), file, fset)

	// set function list signature
	for _, fun := range fnList {
		extractFuncDetails(fun, infoList)
	}
	fnList.Position(fset)

	var inlayHintList []*inlayHint

	for _, fun := range fnList {
		if isSpxPlay(fun.fnExpr, infoList.Uses) {
			hint := &inlayHint{
				funcParameter: &funcParameter{
					Name: fun.Name,
					BasePos: BasePos{
						StartPos:      fun.StartPos,
						EndPos:        fun.EndPos,
						StartPosition: fun.StartPosition,
						EndPosition:   fun.EndPosition},
				},
				Type: hintPlay,
			}
			inlayHintList = append(inlayHintList, hint)
		}
		if len(fun.Parameters) != 0 {
			for _, param := range fun.Parameters {
				if param == nil {
					continue
				}
				if param.Type == "func()" || param.Name == "__gop_overload_args__" {
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

	return inlayHintList, nil
}

func GetCompletions(fileName, fileCode string, line int) (interface{}, error) {
	list, err := getScopesItems(fileName, fileCode, line)
	if err != nil {
		return nil, err
	}
	items := goKeywords
	items = append(items, list...)
	return items, nil
}

func GetTokenDetail(token string) (interface{}, error) {
	pkg, ok := gopbuild.LookupPackageFromLib("github.com/goplus/spx")
	if !ok {
		return nil, fmt.Errorf("can't find lib")
	}
	return tokenDetail(pkg, token), nil
}
