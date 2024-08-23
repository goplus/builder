package internal

import (
	"regexp"
	"strings"

	"github.com/goplus/gop/token"
)

func GetDefinitionFromASTAndTypesInfo(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()

	// get function list
	funcList, err := getCodeFunctionListWithArgs(fset, fileName, fileCode)
	if err != nil {
		return nil
	}

	// get user code info
	info, err := codeInfo(initSPXMod(), fset, fileName, fileCode)
	if err != nil {
		return nil
	}
	list := info2List(fset, info.Types)

	// set function list signature
	for _, fun := range funcList {
		fun.Signature = getSignature(list, fun.Name)
		fun.Parameters = parseFuncParams(fun.Signature, fun.Parameters)
	}

	// set return json
	definition := make(map[string]interface{})
	definition["functionList"] = funcList
	return definition
}

// getSignature return function's signature.
func getSignature(list []nodeItem, funName string) string {
	for _, t := range list {
		if t.ExprName == funName {
			return t.Type
		}
	}
	return ""
}

// parseFuncParams will complete funcParams name and type.
func parseFuncParams(signature string, funcParams []*funcParameter) []*funcParameter {
	re := regexp.MustCompile(`func\((.*)\)`)
	matches := re.FindStringSubmatch(signature)

	if len(matches) < 2 {
		return funcParams
	}

	paramsStr := matches[1]

	params := strings.Split(paramsStr, ",")

	if len(params) != len(funcParams) {
		return funcParams
	}

	for i, paramPair := range params {
		params[i] = strings.TrimSpace(paramPair)
		param := strings.Split(params[i], " ")
		if len(param) != 2 {
			continue
		}
		funcParams[i].Name = param[0]
		funcParams[i].Type = param[1]
	}

	return funcParams
}
