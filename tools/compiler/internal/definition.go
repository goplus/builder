package internal

import (
	"go/types"
	"sort"
	"strconv"
	"strings"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
)

type definitionItem struct {
	BasePos
	PkgName string  `json:"pkg_name"`
	PkgPath string  `json:"pkg_path"`
	Name    string  `json:"name"`   // This is the token name
	Usages  []usage `json:"usages"` // contains 1 or n usage for matches.
	From    BasePos
}

type usage struct {
	UsageID     string  `json:"usageID"`
	Declaration string  `json:"declaration"`
	Sample      string  `json:"sample"`
	InsertText  string  `json:"insertText"`
	Params      []param `json:"params"`
	Type        string  `json:"type"`
}

type param struct {
	Name string `json:"name"`
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
		definition := createDefinitionItem(ident, obj)
		definition.Usages = createUsages(obj, ident.Name)
		definitionList = append(definitionList, definition)
	}

	for ident, obj := range uses {
		if ident.Pos() == 0 || obj.Pkg() == nil {
			continue
		}

		definition := createDefinitionItem(ident, obj)
		definition.From.StartPos, definition.From.EndPos = findDef(defs, obj)

		// Check for overloads
		if strings.Contains(obj.String(), "_overload_args_") {
			overloads := info.Overloads[ident]
			definition.Usages = createOverloadedUsages(overloads)
		} else {
			definition.Usages = createUsages(obj, ident.Name)
		}

		definitionList = append(definitionList, definition)
	}

	sort.Slice(definitionList, func(i, j int) bool {
		return definitionList[i].StartPos < definitionList[j].StartPos
	})
	return definitionList
}

// createDefinitionItem creates a definitionItem from an ident and obj.
func createDefinitionItem(ident *ast.Ident, obj types.Object) *definitionItem {
	return &definitionItem{
		BasePos: BasePos{
			StartPos: int(ident.Pos()),
			EndPos:   int(ident.End()),
		},
		PkgName: obj.Pkg().Name(),
		PkgPath: obj.Pkg().Path(),
		Name:    ident.Name,
	}
}

// createUsages creates a slice of usage based on the type of obj.
func createUsages(obj types.Object, name string) []usage {
	switch t := obj.Type().(type) {
	case *types.Basic:
		return []usage{{
			UsageID:     "0",
			Declaration: obj.String(),
			Sample:      obj.String(),
			InsertText:  name,
			Params:      []param{},
			Type:        t.String(),
		}}
	case *types.Signature:
		return []usage{createSignatureUsage(obj, t)}
	default:
		return nil
	}
}

// createOverloadedUsages creates usages for overloaded functions.
func createOverloadedUsages(overloads []types.Object) []usage {
	var usages []usage
	for _, overload := range overloads {
		us := createSignatureUsage(overload, overload.Type().(*types.Signature))
		usages = append(usages, us)
	}
	return usages
}

// createSignatureUsage creates a usage for a function signature.
func createSignatureUsage(obj types.Object, signature *types.Signature) usage {
	use := usage{
		Declaration: obj.String(),
		Type:        "func",
	}
	name, idx := convertOverloadToSimple(obj.Name())
	use.UsageID = strconv.Itoa(idx)
	var params []param
	var signList []string
	var sampleList []string
	for i := 0; i < signature.Params().Len(); i++ {
		paramName := signature.Params().At(i).Name()
		paramType := signature.Params().At(i).Type().String()
		params = append(params, param{
			Name: paramName,
			Type: paramType,
		})
		signList = append(signList, "${"+strconv.Itoa(i+1)+":"+paramName+"}")
		sampleList = append(sampleList, paramName)
	}
	use.Params = params
	use.Sample = strings.Join(sampleList, " ")
	use.InsertText = name + " " + strings.Join(signList, ", ")
	return use
}

func findDef(defs map[*ast.Ident]types.Object, obj types.Object) (int, int) {
	for def, dObj := range defs {
		if dObj == obj {
			return int(def.Pos()), int(def.End())
		}
	}
	return 0, 0
}
