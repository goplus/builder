package internal

import (
	"go/types"

	"github.com/goplus/gop/ast"
)

type inlayHintType string

const (
	hintParameter inlayHintType = "parameter"
	hintPlay      inlayHintType = "play"
)

type inlayHint struct {
	*funcParameter
	Type inlayHintType `json:"type"`
}

func isSpxPlay(fnExpr ast.Expr, uses map[*ast.Ident]types.Object) bool {
	return isFuncExpected(fnExpr, uses, "play", "spx")
}

func isFuncExpected(fnExpr ast.Expr, uses map[*ast.Ident]types.Object, expectName, expectPkg string) bool {
	fnIdent, ok := fnExpr.(*ast.Ident)
	if !ok {
		return false
	}

	obj, ok := uses[fnIdent]
	if !ok {
		return false
	}

	isExpectFunctionName := fnIdent.Name == expectName
	isExpectPkgName := obj.Pkg().Name() == expectPkg
	return isExpectFunctionName && isExpectPkgName
}
