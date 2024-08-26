package internal

import (
	"fmt"
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
	conf := &types.Config{Importer: gopCtx}
	chkOpts := initTypeConfig(file, fset, initSPXMod())

	info := initTypeInfo()
	checker := typesutil.NewChecker(conf, chkOpts, nil, info)
	if err = checker.Files(nil, []*ast.File{file}); err != nil {
		return nil, err
	}

	scopeItems := make(map[string]string)

	for n, scope := range info.Scopes {
		if n.Pos() == 0 {
			continue
		}

		if isFileScope(n) {
			extractFileScopeItems(n.(*ast.File), scopeItems)
		}

		if scope.Contains(cursorPos) {
			extractScopeItems(scope, scopeItems)
		}
	}

	pkg, _ := gopbuild.GetSPXFunc()
	for _, name := range pkg.Scope().Names() {
		obj := pkg.Scope().Lookup(name)
		if obj.Exported() {
			fmt.Println(obj)
		}
	}
	fmt.Println(pkg.Scope().String())

	return scopeItems, nil
}

func isFileScope(n ast.Node) bool {
	return n.Pos() == 1
}

func extractFileScopeItems(file *ast.File, scopeItems map[string]string) {
	for _, v := range file.Scope.Objects {
		scopeItems[v.Name] = v.Kind.String()
	}
}

func extractScopeItems(scope *types.Scope, scopeItems map[string]string) {
	for _, name := range scope.Names() {
		obj := scope.Lookup(name)
		if name == "this" && obj.Type().String() == "*main.test" {
			continue
		}
		if _, ok := obj.(*types.Var); ok {
			scopeItems[name] = "var"
		}
	}
}
