package internal

import (
	"fmt"
	"go/types"
	"regexp"
	"strings"

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
		return nil, err
	}

	cursorPos := fset.File(file.Pos()).Pos(cursor)

	ctx := igop.NewContext(0)
	gopCtx := gopbuild.NewContext(ctx)
	conf := &types.Config{Importer: gopCtx}
	chkOpts := initTypeConfig(file, fset, initSPXMod())

	info := initTypeInfo()
	checker := typesutil.NewChecker(conf, chkOpts, nil, info)
	if err = checker.Files(nil, []*ast.File{file}); err != nil {
		return nil, err
	}

	items := &scopeItems{}

	smallScope := findSmallestScopeAtPosition(info, cursorPos)
	traverseToRoot(smallScope, items, info)
	extractFileScopeItems(info, items, file)

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
		if scope.Pos() == 0 {
			break
		}
		obj := scope.Lookup(name)
		fmt.Printf("%T \n", obj)
		scopeItem := &scopeItem{
			Label: name,
			Type:  obj.Type().String(),
		}
		if strings.HasPrefix(obj.Type().String(), "func") {
			scopeItem.InsertText = convertFuncToInsertText(obj.Type().String())
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

func extractFileScopeItems(info *typesutil.Info, scopeItems *scopeItems, file *ast.File) {
	for _, def := range info.Defs {
		if def.Pos() == 0 || def.Name() == "Main" {
			continue
		}
		if def.Parent() == nil || def.Parent() == info.Scopes[file] {
			switch def.(type) {
			case *types.Func:
				scopeItem := &scopeItem{
					Label:      def.Name(),
					InsertText: convertFuncToInsertText(def.Type().String()),
					Type:       "func",
				}
				if !scopeItems.Contains(def.Name()) {
					*scopeItems = append(*scopeItems, scopeItem)
				}
				continue
			case *types.Var:
				scopeItem := &scopeItem{
					Label:      def.Name(),
					InsertText: def.Name(),
					Type:       "var",
				}
				if !scopeItems.Contains(def.Name()) {
					*scopeItems = append(*scopeItems, scopeItem)
				}
				continue
			}
		}
	}
}

func convertFuncToInsertText(funcSignature string) string {
	re := regexp.MustCompile(`\((.*?)\)\s*(.*)`)

	matches := re.FindStringSubmatch(funcSignature)

	if len(matches) > 1 {
		params := matches[1]

		paramParts := strings.Split(params, ",")
		for i, param := range paramParts {
			trimParam := strings.TrimSpace(param)
			paramParts[i] = strings.TrimSpace(strings.Split(trimParam, " ")[0])
		}

		insertText := fmt.Sprintf("func(%s)", strings.Join(paramParts, ", "))

		insertText += "{\n\n}"

		return insertText
	}

	return funcSignature
}
