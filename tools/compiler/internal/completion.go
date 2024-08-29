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

func getScopesItems(fileName, fileCode string, cursorLine int) (scopeItems, error) {
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}

	cursorPos := fset.File(file.Pos()).LineStart(cursorLine)

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

	extractFileScopeItems(info, items, file)

	for n, scope := range info.Scopes {
		if n.Pos() == 0 {
			continue
		}

		if scope.Contains(cursorPos) {
			extractScopeItems(scope, items, info)
		}
	}

	return *items, nil
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
				*scopeItems = append(*scopeItems, scopeItem)
				continue
			case *types.Var:
				scopeItem := &scopeItem{
					Label:      def.Name(),
					InsertText: def.Name(),
					Type:       "var",
				}
				*scopeItems = append(*scopeItems, scopeItem)
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

func extractScopeItems(scope *types.Scope, scopeItems *scopeItems, info *typesutil.Info) {
	for _, name := range scope.Names() {
		obj := scope.Lookup(name)
		if name == "this" && obj.Type().String() == "*main.test" {
			continue
		}
		ident, defObj := lookupDefs(info.Defs, obj.Id())
		scopeItem := &scopeItem{
			Label:      ident.Name,
			InsertText: defObj.Name(),
			Type:       convertFuncToInsertText(defObj.Type().String()),
		}
		*scopeItems = append(*scopeItems, scopeItem)
	}
}

func lookupDefs(defs map[*ast.Ident]types.Object, Id string) (*ast.Ident, types.Object) {
	for ident, obj := range defs {
		if obj.Id() == Id {
			return ident, obj
		}
	}
	return nil, nil
}
