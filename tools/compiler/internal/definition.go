package internal

import (
	"go/types"
	"sort"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
)

type definitionItem struct {
	BasePos
	PkgName string  `json:"pkg_name"`
	PkgPath string  `json:"pkg_path"`
	Name    string  `json:"name"` // This is the token name
	Content string  `json:"content"`
	Usages  []usage `json:"usages"` // contains 1 or n usage for matches.
	From    BasePos
}

type usage struct {
	Declaration string  `json:"declaration"`
	Params      []param `json:"samples"`
	Type        string  `json:"type"`
}

type param struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
	Type string `json:"type"`
}

type definitions []*definitionItem

func extractFuncDetails(fun *funcItem, infoList *typesutil.Info) {
	fun.Name = exprString(token.NewFileSet(), fun.fnExpr)
	fun.StartPos = int(fun.fnExpr.Pos())
	fun.EndPos = int(fun.fnExpr.End())
	if tv, ok := infoList.Types[fun.fnExpr]; ok {
		if obj, ok := fun.fnExpr.(*ast.Ident); ok {
			fun.Overload = obj.Name
			fun.PkgName = infoList.Uses[obj].Pkg().Name()
			fun.PkgPath = infoList.Uses[obj].Pkg().Path()
		}
		if selectExpr, ok := fun.fnExpr.(*ast.SelectorExpr); ok {
			obj := selectExpr.Sel
			fun.Overload = obj.Name
			fun.PkgName = infoList.Uses[obj].Pkg().Name()
			fun.PkgPath = infoList.Uses[obj].Pkg().Path()
		}
		signature := tv.Type.(*types.Signature)
		parameters := make([]*funcParameter, signature.Params().Len())
		for i := 0; i < signature.Params().Len(); i++ {
			parameter := &funcParameter{
				Name: signature.Params().At(i).Name(),
				Type: signature.Params().At(i).Type().String(),
				BasePos: BasePos{
					StartPos: int(fun.argsExpr[i].Pos()),
					EndPos:   int(fun.argsExpr[i].End())},
			}
			basicLit, ok := fun.argsExpr[i].(*ast.BasicLit)
			if ok {
				parameter.Value = basicLit.Value
			}
			parameters[i] = parameter
		}
		fun.Parameters = parameters
		fun.Signature = signature.String()
	}
}

func (d definitions) Position(fset *token.FileSet) {
	for _, def := range d {
		def.StartPosition = fset.Position(token.Pos(def.StartPos))
		def.EndPosition = fset.Position(token.Pos(def.StartPos))
		def.From.StartPosition = fset.Position(token.Pos(def.From.StartPos))
		def.From.EndPosition = fset.Position(token.Pos(def.From.EndPos))
	}
}

func getDefinitionList(info *typesutil.Info) definitions {
	var definitionList definitions

	defs := info.Defs
	uses := info.Uses

	for ident, obj := range defs {
		if ident.Pos() == 0 || ident.Obj == nil {
			continue
		}
		definition := &definitionItem{
			BasePos: BasePos{
				StartPos: int(ident.Pos()),
				EndPos:   int(ident.End()),
			},
			PkgName: obj.Pkg().Name(),
			PkgPath: obj.Pkg().Path(),
			Name:    ident.Name,
			Content: obj.String(),
		}
		definitionList = append(definitionList, definition)
	}

	for ident, obj := range uses {
		if ident.Pos() == 0 || obj.Pkg() == nil {
			continue
		}
		definition := &definitionItem{
			BasePos: BasePos{
				StartPos: int(ident.Pos()),
				EndPos:   int(ident.End()),
			},
			PkgName: obj.Pkg().Name(),
			PkgPath: obj.Pkg().Path(),
			Name:    ident.Name,
			Content: obj.String(),
		}
		definition.From.StartPos, definition.From.EndPos = findDef(defs, obj)
		definitionList = append(definitionList, definition)
	}

	sort.Slice(definitionList, func(i, j int) bool {
		return definitionList[i].StartPos < definitionList[j].StartPos
	})
	return definitionList
}

func findDef(defs map[*ast.Ident]types.Object, obj types.Object) (int, int) {
	for def, dObj := range defs {
		if dObj == obj {
			return int(def.Pos()), int(def.End())
		}
	}
	return 0, 0
}
