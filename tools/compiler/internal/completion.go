package internal

import (
	"fmt"
	"go/types"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
)

type completionItem struct {
	Label      string `json:"label"`
	InsertText string `json:"insertText"`
	Type       string `json:"type"`
	TokenID
}

type completionList []*completionItem

var goKeywords = completionList{
	{
		Label:      "break",
		InsertText: "break",
		Type:       "keyword",
	}, {
		Label:      "case",
		InsertText: "case ${1}:",
		Type:       "keyword",
	}, {
		Label:      "chan",
		InsertText: "chan ${1}",
		Type:       "keyword",
	}, {
		Label:      "const",
		InsertText: "const ${1}",
		Type:       "keyword",
	}, {
		Label:      "continue",
		InsertText: "continue",
		Type:       "keyword",
	}, {
		Label:      "default",
		InsertText: "default:",
		Type:       "keyword",
	}, {
		Label:      "defer",
		InsertText: "defer ${1}",
		Type:       "keyword",
	}, {
		Label:      "else",
		InsertText: "else",
		Type:       "keyword",
	}, {
		Label:      "fallthrough",
		InsertText: "fallthrough",
		Type:       "keyword",
	}, {
		Label:      "for",
		InsertText: "for",
		Type:       "keyword",
	}, {
		Label:      "for condition",
		InsertText: "for ${1:condition} {\n\t${2}\n}",
		Type:       "keyword",
	}, {
		Label:      "for with range",
		InsertText: "for ${1:i} <- ${2:start}:${3:end} {\n\t${4}\n}",
		Type:       "keyword",
	}, {
		Label:      "for range",
		InsertText: "for ${1:i}, ${2:v} := range ${3:set} {\n\t${4}\n}",
		Type:       "keyword",
	}, {
		Label:      "func",
		InsertText: "func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}",
		Type:       "keyword",
	}, {
		Label:      "go",
		InsertText: "go ${1}",
		Type:       "keyword",
	}, {
		Label:      "goto",
		InsertText: "goto ${1}",
		Type:       "keyword",
	}, {
		Label:      "if",
		InsertText: "if",
		Type:       "keyword",
	}, {
		Label:      "if statement",
		InsertText: "if ${1:condition} {\n\t${2}\n}",
		Type:       "keyword",
	}, {
		Label:      "if else if statement",
		InsertText: "if ${1:condition} {\n\t${2}\n} else if ${3:condition} {\n\t${4}\n} ",
		Type:       "keyword",
	}, {
		Label:      "if else statement",
		InsertText: "if ${1:condition} {\n\t${2}\n} else {\n\t${3}\n} ",
		Type:       "keyword",
	}, {
		Label:      "import",
		InsertText: "import \"${1}\"",
		Type:       "keyword",
	}, {
		Label:      "interface",
		InsertText: "interface {\n\t${1}\n}",
		Type:       "keyword",
	}, {
		Label:      "map",
		InsertText: "map[${1}]${2}",
		Type:       "keyword",
	}, {
		Label:      "package",
		InsertText: "package ${1}",
		Type:       "keyword",
	}, {
		Label:      "range",
		InsertText: "range ${1}",
		Type:       "keyword",
	}, {
		Label:      "return",
		InsertText: "return ${1}",
		Type:       "keyword",
	}, {
		Label:      "select",
		InsertText: "select {\n\t${1}\n}",
		Type:       "keyword",
	}, {
		Label:      "struct",
		InsertText: "struct {\n\t${1}\n}",
		Type:       "keyword",
	}, {
		Label:      "switch",
		InsertText: "switch ${1} {\n\tcase ${2}:\n\t\t${3}\n}",
		Type:       "keyword",
	}, {
		Label:      "type",
		InsertText: "type ${1} ${2}",
		Type:       "keyword",
	}, {
		Label:      "var",
		InsertText: "var ${1:name} ${2:type}",
		Type:       "keyword",
	},
}

func (list *completionList) Contains(text string) bool {
	for _, item := range *list {
		if item.InsertText == text {
			return true
		}
	}
	return false
}

func getScopesItems(fileName string, fileMap map[string]string, line, column int) (completionList, error) {
	fset := token.NewFileSet()
	pkg, err := initProjectParser(fset, fileMap)
	if err != nil {
		fmt.Println("Compiler error: ", err)
	}
	file := pkg[PKG].Files[fileName]

	cursorOffset := int(fset.File(file.Pos()).LineStart(line)) + column - 1
	cursorPos := token.Pos(cursorOffset)

	ctx := igop.NewContext(0)
	gopCtx := gopbuild.NewContext(ctx)
	conf := &types.Config{Importer: gopCtx}
	chkOpts := initTypeConfig(file, fset)

	info := initTypeInfo()
	checker := typesutil.NewChecker(conf, chkOpts, nil, info)
	if err = checker.Files(nil, []*ast.File{file}); err != nil {
		fmt.Println("Compiler error: ", err)
	}

	items := &completionList{}

	smallScopes := findSmallestScopesAtPosition(info, cursorPos)
	for _, scope := range smallScopes {
		traverseToRoot(scope, items, info)
	}

	return *items, nil
}

func findSmallestScopesAtPosition(info *typesutil.Info, pos token.Pos) []*types.Scope {
	var scopeList []*types.Scope
	var smallList []*types.Scope

	for _, scope := range info.Scopes {
		if scope.Contains(pos) {
			scopeList = append(scopeList, scope)
		}
	}

	if len(scopeList) == 0 {
		return nil
	}

	sort.Slice(scopeList, func(i, j int) bool {
		return scopeList[i].Pos() >= scopeList[j].Pos() && scopeList[i].End() <= scopeList[j].End()
	})

	for _, scope := range scopeList {
		if !checkScopeChildrenContainsPos(scope, pos) {
			smallList = append(smallList, scope)
		}
	}

	return smallList
}

func checkScopeChildrenContainsPos(scope *types.Scope, pos token.Pos) bool {
	for i := range scope.NumChildren() {
		if scope.Child(i).Contains(pos) {
			return true
		}
	}
	return false
}

func traverseToRoot(scope *types.Scope, items *completionList, info *typesutil.Info) {
	for _, name := range scope.Names() {
		obj := scope.Lookup(name)
		handleObject(obj, name, items)
	}

	if scope.Parent() != nil {
		traverseToRoot(scope.Parent(), items, info)
	}
}

func handleObject(obj types.Object, name string, items *completionList) {
	handleThis(obj, name, items)
	handleFunc(obj, name, items)
	handleType(obj, name, items)
}

func handleThis(obj types.Object, name string, items *completionList) {
	if name != "this" {
		return
	}

	variable, ok := obj.(*types.Var)
	if !ok {
		return
	}

	structType, ok := variable.Type().Underlying().(*types.Pointer).Elem().Underlying().(*types.Struct)
	if !ok {
		return
	}

	structMethodsToCompletion(structType, items)

}

func handleFunc(obj types.Object, name string, items *completionList) {
	scopeItem := &completionItem{
		Label: name,
		Type:  obj.Type().String(),
		TokenID: TokenID{
			TokenName: name,
		},
	}

	if obj.Pkg() != nil {
		scopeItem.TokenPkg = obj.Pkg().Path()
	}

	if strings.HasPrefix(obj.Type().String(), "func") {
		signature := obj.Type().(*types.Signature)
		signList, _, _ := extractParams(signature)
		scopeItem.Type = "func"
		scopeItem.InsertText = name
		if len(signList) != 0 {
			scopeItem.InsertText += " " + strings.Join(signList, ", ")
		}
	} else {
		scopeItem.InsertText = name
	}
	if !items.Contains(scopeItem.InsertText) {
		*items = append(*items, scopeItem)
	}
}

func handleType(obj types.Object, name string, items *completionList) {
	if structType, ok := obj.Type().Underlying().(*types.Struct); ok {
		for i := 0; i < structType.NumFields(); i++ {
			if structType.Field(i).Type().String() != "*github.com/goplus/spx.Game" {
				continue
			}
			pointer, ok := structType.Field(i).Type().(*types.Pointer)
			if ok {
				stru, ok := pointer.Elem().Underlying().(*types.Struct)
				if ok {
					structMethodsToCompletion(stru, items)
				}
			}
		}
		if checkFieldExist(structType, "github.com/goplus/spx.Sprite") {
			structMethodsToCompletion(structType, items)
		}
	}
	if named, ok := obj.Type().(*types.Named); ok {
		for i := 0; i < named.NumMethods(); i++ {
			method := named.Method(i)
			if method.Name() == "Main" || method.Name() == "Classfname" {
				continue
			}
			item := &completionItem{
				Label: method.Name(),
				Type:  "func",
				TokenID: TokenID{
					TokenName: method.Name(),
					TokenPkg:  method.Pkg().Path(),
				},
			}
			signature := method.Type().(*types.Signature)
			signList, sampleList, _ := extractParams(signature)
			if listContains(sampleList, "__gop_overload_args__") {
				continue
			}
			item.InsertText = name
			if len(signList) != 0 {
				item.InsertText += " " + strings.Join(signList, ", ")
			}
			if !items.Contains(item.InsertText) {
				*items = append(*items, item)
			}
		}
	}
}

func listContains(signList []string, target string) bool {
	for _, s := range signList {
		if s == target {
			return true
		}
	}
	return false
}

func checkFieldExist(structType *types.Struct, field string) bool {
	for i := range structType.NumFields() {
		if structType.Field(i).Type().String() == field {
			return true
		}
	}
	return false
}

func structMethodsToCompletion(structType *types.Struct, items *completionList) {
	for i := 0; i < structType.NumFields(); i++ {
		named, ok := structType.Field(i).Type().(*types.Named)
		if !ok {
			continue
		}

		for i := 0; i < named.NumMethods(); i++ {
			method := named.Method(i)
			if !method.Exported() {
				continue
			}
			methodName, _ := convertOverloadToSimple(method.Name())
			item := &completionItem{
				Label: methodName,
				Type:  "func",
				TokenID: TokenID{
					TokenName: methodName,
					TokenPkg:  method.Pkg().Path(),
				},
			}
			signature := method.Type().(*types.Signature)
			signList, sampleList, _ := extractParams(signature)
			if listContains(sampleList, "__gop_overload_args__") {
				continue
			}
			item.InsertText = methodName
			if len(signList) != 0 {
				item.InsertText += " " + strings.Join(signList, ", ")
			}
			if !items.Contains(item.InsertText) {
				*items = append(*items, item)
			}
		}
	}
}

func convertOverloadToSimple(overloadName string) (string, int) {
	if !strings.Contains(overloadName, "__") {
		runeSimpleName := []rune(overloadName)
		runeSimpleName[0] = unicode.ToLower(runeSimpleName[0])
		return string(runeSimpleName), 0
	}
	overload := strings.Split(overloadName, "__")
	simpleName, overloadIDStr := overload[0], overload[1]

	runeSimpleName := []rune(simpleName)
	runeSimpleName[0] = unicode.ToLower(runeSimpleName[0])

	overloadID, _ := strconv.Atoi(overloadIDStr)

	return string(runeSimpleName), overloadID
}

func convertSimpleToOverload(simpleName string, overloadID int) string {
	if strings.Contains(simpleName, "__") {
		return simpleName
	}

	overLoadNameRune := []rune(simpleName)
	overLoadNameRune[0] = unicode.ToUpper(overLoadNameRune[0])

	overloadName := string(overLoadNameRune)
	overloadName += "__" + strconv.Itoa(overloadID)

	return overloadName
}
