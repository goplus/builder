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
}

type completionList []*completionItem

func (list *completionList) Contains(name string) bool {
	for _, item := range *list {
		if item.Label == name {
			return true
		}
	}
	return false
}

func getScopesItems(fileName, fileCode string, cursor int) (completionList, error) {
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		fmt.Println("Compiler error: ", err)
	}

	cursorPos := fset.File(file.Pos()).Pos(cursor)

	ctx := igop.NewContext(0)
	gopCtx := gopbuild.NewContext(ctx)
	conf := &types.Config{Importer: gopCtx}
	chkOpts := initTypeConfig(file, fset, initSPXMod())

	info := initTypeInfo()
	checker := typesutil.NewChecker(conf, chkOpts, nil, info)
	if err = checker.Files(nil, []*ast.File{file}); err != nil {
		fmt.Println("Compiler error: ", err)
	}

	items := &completionList{}

	smallScope := findSmallestScopeAtPosition(info, cursorPos)
	traverseToRoot(smallScope, items, info)

	return *items, nil
}

func findSmallestScopeAtPosition(info *typesutil.Info, pos token.Pos) *types.Scope {
	var scopeList []*types.Scope

	for _, scope := range info.Scopes {
		if scope.Contains(pos) {
			scopeList = append(scopeList, scope)
		}
	}

	if len(scopeList) == 0 {
		return nil
	}

	sort.Slice(scopeList, func(i, j int) bool {
		return scopeList[i].Pos() < scopeList[j].Pos() && scopeList[i].End() > scopeList[j].End()
	})

	return scopeList[0]
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
	}

	if strings.HasPrefix(obj.Type().String(), "func") {
		signature := obj.Type().(*types.Signature)
		signList, _, _ := extractParams(signature)
		scopeItem.Type = "func"
		scopeItem.InsertText = name + " " + strings.Join(signList, ", ")
	} else {
		scopeItem.InsertText = name
	}
	if !items.Contains(name) {
		*items = append(*items, scopeItem)
	}
}

func handleType(obj types.Object, name string, items *completionList) {
	if named, ok := obj.Type().(*types.Named); ok {
		for i := 0; i < named.NumMethods(); i++ {
			method := named.Method(i)
			if method.Name() == "Main" || method.Name() == "Classfname" {
				continue
			}
			item := &completionItem{
				Label: method.Name(),
				Type:  "func",
			}
			signature := method.Type().(*types.Signature)
			signList, _, _ := extractParams(signature)
			item.InsertText = name + " " + strings.Join(signList, ", ")
			*items = append(*items, item)

		}
	}
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
			}
			signature := method.Type().(*types.Signature)
			signList, _, _ := extractParams(signature)
			item.InsertText = methodName + " " + strings.Join(signList, ", ")
			*items = append(*items, item)
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
