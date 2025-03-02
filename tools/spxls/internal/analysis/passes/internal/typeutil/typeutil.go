package typeutil

import (
	"go/types"

	"github.com/goplus/builder/tools/spxls/internal/ast/astutil"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	goptypesutil "github.com/goplus/gop/x/typesutil"
)

// Callee returns the named target of a function call, if any:
// a function, method, builtin, or variable.
//
// Functions and methods may potentially have type parameters.
func Callee(info *goptypesutil.Info, call *ast.CallExpr) types.Object {
	fun := astutil.Unparen(call.Fun)

	// Look through type instantiation if necessary.
	isInstance := false
	switch fun.(type) {
	case *ast.IndexExpr, *ast.IndexListExpr:
		// When extracting the callee from an *IndexExpr, we need to check that
		// it is a *types.Func and not a *types.Var.
		// Example: Don't match a slice m within the expression `m[0]()`.
		isInstance = true
		fun, _, _, _ = UnpackIndexExpr(fun)
	}

	var obj types.Object
	switch fun := fun.(type) {
	case *ast.Ident:
		obj = info.Uses[fun] // type, var, builtin, or declared func
	case *ast.SelectorExpr:
		if sel, ok := info.Selections[fun]; ok {
			obj = sel.Obj() // method or field
		} else {
			obj = info.Uses[fun.Sel] // qualified identifier?
		}
	}
	if _, ok := obj.(*types.TypeName); ok {
		return nil // T(x) is a conversion, not a call
	}
	// A Func is required to match instantiations.
	if _, ok := obj.(*types.Func); isInstance && !ok {
		return nil // Was not a Func.
	}
	return obj
}

// StaticCallee returns the target (function or method) of a static function
// call, if any. It returns nil for calls to builtins.
//
// Note: for calls of instantiated functions and methods, StaticCallee returns
// the corresponding generic function or method on the generic type.
func StaticCallee(info *goptypesutil.Info, call *ast.CallExpr) *types.Func {
	if f, ok := Callee(info, call).(*types.Func); ok && !interfaceMethod(f) {
		return f
	}
	return nil
}

// UnpackIndexExpr extracts data from AST nodes that represent index
// expressions.
//
// For an ast.IndexExpr, the resulting indices slice will contain exactly one
// index expression. For an ast.IndexListExpr (go1.18+), it may have a variable
// number of index expressions.
//
// For nodes that don't represent index expressions, the first return value of
// UnpackIndexExpr will be nil.
func UnpackIndexExpr(n ast.Node) (x ast.Expr, lbrack token.Pos, indices []ast.Expr, rbrack token.Pos) {
	switch e := n.(type) {
	case *ast.IndexExpr:
		return e.X, e.Lbrack, []ast.Expr{e.Index}, e.Rbrack
	case *ast.IndexListExpr:
		return e.X, e.Lbrack, e.Indices, e.Rbrack
	}
	return nil, token.NoPos, nil, token.NoPos
}

func interfaceMethod(f *types.Func) bool {
	recv := f.Type().(*types.Signature).Recv()
	return recv != nil && types.IsInterface(recv.Type())
}
