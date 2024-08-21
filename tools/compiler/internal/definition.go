package internal

import (
	"regexp"
	"strings"

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
		fun.Signature, fun.Parameters = contains(list, fun.Name)
	}
	return fList
}

func contains(list []tokenInfo, funName string) (string, []parameter) {
	for i, t := range list {
		if t.ExprName == funName {
			param := parseFuncParams(t.Type)
			if len(param) > 0 {
				index := 1
				for j := range param {
					if param[j].Type == "func()" {
						continue
					}

					for i+index < len(list) {
						if list[i+index].ExprType == "*ast.BasicLit" {
							param[j].Position = list[i+index].Position
							index++
							break
						}
						index++
					}
				}
			}
			return t.Type, param
		}
	}
	return "", []parameter{}
}

func parseFuncParams(signature string) []parameter {
	re := regexp.MustCompile(`func\((.*)\)`)
	matches := re.FindStringSubmatch(signature)

	if len(matches) < 2 {
		return []parameter{}
	}

	var p []parameter

	paramsStr := matches[1]

	params := strings.Split(paramsStr, ",")

	for i, param := range params {
		params[i] = strings.TrimSpace(param)
		split := strings.Split(params[i], " ")
		if len(split) != 2 {
			continue
		}
		p = append(p, parameter{Name: split[0], Type: split[1]})
	}

	return p
}
