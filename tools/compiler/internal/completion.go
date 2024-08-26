package internal

import (
	"go/types"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
)

func getScopesItems(fileName, fileCode string, cursorLine int) (map[string]string, error) {
	fset := token.NewFileSet()
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}

	cursorPos := fset.File(file.Pos()).LineStart(cursorLine)

	ctx := igop.NewContext(0)
	gopCtx := gopbuild.NewContext(ctx)
	conf := &types.Config{}
	conf.Importer = gopCtx
	chkOpts := initTypeConfig(file, fset, initSPXMod())

	info := initTypeInfo()
	checker := typesutil.NewChecker(conf, chkOpts, nil, info)
	err = checker.Files(nil, []*ast.File{file})
	if err != nil {
		return nil, err
	}

	scopeItems := make(map[string]string)
	var scopeNodes []ast.Node

	for n, scope := range info.Scopes {
		if n.Pos() == 0 {
			continue
		}

		if n.Pos() == 1 {
			if f, ok := n.(*ast.File); ok {
				for _, v := range f.Scope.Objects {
					scopeItems[v.Name] = v.Kind.String()
					scopeNodes = append(scopeNodes, n)
				}
			}
		}

		if scope.Contains(cursorPos) && scope.Names() != nil {
			for _, name := range scope.Names() {
				obj := scope.Lookup(name)
				if name == "this" && obj.Type().String() == "*main.test" {
					continue
				}
				if _, ok := obj.(*types.Var); ok {
					scopeItems[name] = "var"
					scopeNodes = append(scopeNodes, n)
				}
			}
		}

	}

	return scopeItems, err
}
