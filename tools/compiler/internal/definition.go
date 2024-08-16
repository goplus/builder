package internal

import "github.com/goplus/gop/token"

func GetDefinitionFromASTAndTypesInfo(fileName, fileCode string) interface{} {
	fList, err := spxCodeFuncList(fileName, fileCode)
	if err != nil {
		return nil
	}

	// new file set
	fset := token.NewFileSet()
	info, err := spxInfo(initSPXMod(), fset, fileName, fileCode)
	if err != nil {
	}
	list := info2List(fset, info.Types)

	for _, fun := range fList {
		fun.Signature = contains(list, fun.Name)
	}
	return fList
}

func contains(list []tokenInfo, funName string) string {
	for _, token := range list {
		if token.ExprName == funName {
			return token.Type
		}
	}
	return ""
}
