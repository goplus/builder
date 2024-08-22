package internal

import (
	"go/types"

	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
)

func extractFuncDetails(fun *funcItem, infoList *typesutil.Info) {
	fun.Name = exprString(token.NewFileSet(), fun.fnExpr)
	fun.StartPos = int(fun.fnExpr.Pos())
	fun.EndPos = int(fun.fnExpr.End())
	for expr, tv := range infoList.Types {
		if expr == fun.fnExpr {
			signature := tv.Type.(*types.Signature)
			parameters := make([]*funcParameter, signature.Params().Len())
			for i := 0; i < signature.Params().Len(); i++ {
				parameter := &funcParameter{
					Name:     signature.Params().At(i).Name(),
					Type:     signature.Params().At(i).Type().String(),
					StartPos: int(fun.argsExpr[i].Pos()),
					EndPos:   int(fun.argsExpr[i].End()),
				}
				parameters[i] = parameter
			}
			fun.Parameters = parameters
			fun.Signature = signature.String()
		}
	}
}
