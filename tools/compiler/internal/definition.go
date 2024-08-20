package internal

import (
	"github.com/goplus/gop/token"
)

type definition struct {
	funList []*codeFunction
	//declList []*declItem
}

func GetDefinitionFromASTAndTypesInfo(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	// get function list
	fList, err := getCodeFunctionList(fset, fileName, fileCode)
	if err != nil {
		return nil
	}

	info, err := spxInfo(initSPXMod(), fset, fileName, fileCode)
	if err != nil {
	}
	list := info2List(fset, info.Types)

	// set function list signature
	for _, fun := range fList {
		fun.Signature = contains(list, fun.Name)
	}
	return fList
}

func contains(list []tokenInfo, funName string) string {
	for _, t := range list {
		if t.ExprName == funName {
			return t.Type
		}
	}
	return ""
}
