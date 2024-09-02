package internal

import (
	"fmt"
	"go/types"
	"strconv"
	"strings"
	"unicode"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
)

type scopeItem struct {
	Label      string `json:"label"`
	InsertText string `json:"insertText"`
	Type       string `json:"type"`
}

type scopeItems []*scopeItem

func (s *scopeItems) Contains(name string) bool {
	for _, item := range *s {
		if item.Label == name {
			return true
		}
	}
	return false
}

func getScopesItems(fileName, fileCode string, cursor int) (scopeItems, error) {
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

	items := &scopeItems{}

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

	smallestScope := scopeList[0]
	for _, scope := range scopeList {
		if scope.Pos() > smallestScope.Pos() && scope.End() < smallestScope.End() {
			smallestScope = scope
		}
	}

	return smallestScope
}

func traverseToRoot(scope *types.Scope, items *scopeItems, info *typesutil.Info) {
	for _, name := range scope.Names() {
		obj := scope.Lookup(name)

		if name == "this" {
			varObj := obj.(*types.Var)
			pointerType := varObj.Type().Underlying().(*types.Pointer)
			structType := pointerType.Elem().Underlying().(*types.Struct)

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
					mname, _ := convertOverloadToSimple(method.Name())
					scopeItem := &scopeItem{
						Label: mname,
						Type:  "func",
					}
					sign := method.Type().(*types.Signature)
					signList := []string{}
					for j := range sign.Params().Len() {
						signList = append(signList, "${"+strconv.Itoa(j+1)+":"+sign.Params().At(j).Name()+"}")
					}
					scopeItem.InsertText = mname + " " + strings.Join(signList, ", ")
					*items = append(*items, scopeItem)
				}

			}
		}

		if named, ok := obj.Type().(*types.Named); ok {
			for i := 0; i < named.NumMethods(); i++ {
				method := named.Method(i)
				if method.Name() == "Main" || method.Name() == "Classfname" {
					continue
				}
				scopeItem := &scopeItem{
					Label: method.Name(),
					Type:  "func",
				}
				sign := method.Type().(*types.Signature)
				signList := []string{}
				for j := range sign.Params().Len() {
					signList = append(signList, "${"+strconv.Itoa(j+1)+":"+sign.Params().At(j).Name()+"}")
				}
				scopeItem.InsertText = name + " " + strings.Join(signList, ", ")
			}
		}

		scopeItem := &scopeItem{
			Label: name,
			Type:  obj.Type().String(),
		}

		if strings.HasPrefix(obj.Type().String(), "func") {
			sign := obj.Type().(*types.Signature)
			signList := []string{}
			for j := range sign.Params().Len() {
				signList = append(signList, "${"+strconv.Itoa(j+1)+":"+sign.Params().At(j).Name()+"}")
			}
			scopeItem.Type = "func"
			scopeItem.InsertText = name + " " + strings.Join(signList, ", ")
		} else {
			scopeItem.InsertText = name
		}
		if !items.Contains(name) {
			*items = append(*items, scopeItem)
		}
	}
	if scope.Parent() != nil {
		traverseToRoot(scope.Parent(), items, info)
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
