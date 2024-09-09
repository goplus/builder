package internal

import (
	"fmt"
	"go/types"

	"github.com/goplus/gop/token"
	"github.com/goplus/igop/gopbuild"
)

const PKG = "main"

// GetDiagnostics return error info list.
func GetDiagnostics(fileName string, fileMap map[string]string) (interface{}, error) {
	// new file set
	fset := token.NewFileSet()
	pkg, err := initProjectParser(fset, fileMap)
	if err != nil {
		list := parseErrorLines(error2List(err))
		return list, nil
	}
	_, err = codeInfo(pkg[PKG].Files[fileName], fset, pkg)
	list := parseErrorLines(error2List(err))
	return list, nil
}

// GetDefinition return user's code definition.
func GetDefinition(fileName string, fileMap map[string]string) (interface{}, error) {
	fset := token.NewFileSet()
	pkg, err := initProjectParser(fset, fileMap)
	if err != nil {
		fmt.Println("Internal error: ", err)
	}
	// get user code info
	info, err := codeInfo(pkg[PKG].Files[fileName], fset, pkg)
	if err != nil {
		fmt.Println("Internal error: ", err)
	}
	definitionList := getDefinitionList(info)
	definitionList.Position(fset)

	return definitionList, nil
}

// GetSPXFileType return a json object with spx type info.
func GetSPXFileType(fileName string, fileMap map[string]string) (interface{}, error) {
	// new file set
	fset := token.NewFileSet()
	pkg, err := initProjectParser(fset, fileMap)
	if err != nil {
		return nil, err
	}
	info, err := codeInfo(pkg[PKG].Files[fileName], fset, pkg)
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
func GetInlayHint(currentFileName string, fileMap map[string]string) (interface{}, error) {
	fset := token.NewFileSet()
	pkg, err := initProjectParser(fset, fileMap)
	if err != nil {
		fmt.Println("Internal error: ", err)
	}

	// get function list
	fnList, err := getCodeFunctionList(pkg[PKG].Files[currentFileName])
	if err != nil {
		fmt.Println("Internal error: ", err)
	}

	// get user code info
	infoList, err := codeInfo(pkg[PKG].Files[currentFileName], fset, pkg)
	if err != nil {
		fmt.Println("Internal error: ", err)
	}

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

func GetCompletions(fileName string, fileMap map[string]string, line, column int) (interface{}, error) {
	list, err := getScopesItems(fileName, fileMap, line, column)
	if err != nil {
		fmt.Println("Internal error: ", err)
	}
	items := goKeywords
	items = append(items, list...)
	return items, nil
}

func GetTokenDetail(token, pkgPath string) (interface{}, error) {
	pkg, ok := gopbuild.LookupPackageFromLib(pkgPath)
	if !ok {
		return nil, fmt.Errorf("can't find lib")
	}
	return tokenDetail(pkg, token), nil
}

func GetTokensDetail(tokenMap []TokenID) (interface{}, error) {
	pkgMap := make(map[string]*types.Package)
	spxPrepare, ok := gopbuild.LookupPackageFromLib("github.com/goplus/spx")
	if !ok {
		return nil, fmt.Errorf("can't find spx lib")
	}
	pkgMap["github.com/goplus/spx"] = spxPrepare
	var detailList []definitionItem
	for _, tok := range tokenMap {
		if pkg, ok := pkgMap[tok.TokenPkg]; ok {
			detailList = append(detailList, tokenDetail(pkg, tok.TokenName))
		} else {
			pkg, ok := gopbuild.LookupPackageFromLib(tok.TokenPkg)
			if !ok {
				return nil, fmt.Errorf("can't find lib %s", tok.TokenPkg)
			}
			pkgMap[tok.TokenPkg] = pkg
			detailList = append(detailList, tokenDetail(pkg, tok.TokenName))
		}
	}
	return detailList, nil
}
