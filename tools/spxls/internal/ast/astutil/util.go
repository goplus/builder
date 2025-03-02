package astutil

import "github.com/goplus/gop/ast"

// Unparen returns e with any enclosing parentheses stripped.
// TODO(adonovan): use go1.22's ast.Unparen.
func Unparen(e ast.Expr) ast.Expr {
	for {
		p, ok := e.(*ast.ParenExpr)
		if !ok {
			return e
		}
		e = p.X
	}
}
