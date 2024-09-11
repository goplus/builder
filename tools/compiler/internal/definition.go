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
	PkgName    string  `json:"pkgName"`
	PkgPath    string  `json:"pkgPath"`
	Name       string  `json:"name"`   // This is the token name
	Usages     []usage `json:"usages"` // contains 1 or n usage for matches.
	StructName string  `json:"structName"`
	From       BasePos
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

type TokenID struct {
	TokenName string `json:"tokenName"`
	TokenPkg  string `json:"tokenPkg"`
}

type definitions []*definitionItem

func extractFuncDetails(fun *funcItem, infoList *typesutil.Info) {
	fun.Name = exprString(token.NewFileSet(), fun.fnExpr)
	fun.StartPos = int(fun.fnExpr.Pos())
	fun.EndPos = int(fun.fnExpr.End())

	tv, ok := infoList.Types[fun.fnExpr]
	if !ok {
		return
	}

	switch obj := fun.fnExpr.(type) {
	case *ast.Ident:
		fun.Overload = obj.Name
		fun.PkgName = infoList.Uses[obj].Pkg().Name()
		fun.PkgPath = infoList.Uses[obj].Pkg().Path()
	case *ast.SelectorExpr:
		fun.Overload = obj.Sel.Name
		fun.PkgName = infoList.Uses[obj.Sel].Pkg().Name()
		fun.PkgPath = infoList.Uses[obj.Sel].Pkg().Path()
	}

	signature := tv.Type.(*types.Signature)
	fun.Parameters = extractParameters(signature, fun.argsExpr)
	fun.Signature = signature.String()
}

func extractParameters(signature *types.Signature, argsExpr []ast.Expr) []*funcParameter {
	length := min(len(argsExpr), signature.Params().Len())
	params := make([]*funcParameter, signature.Params().Len())

	for i := 0; i < length; i++ {
		param := signature.Params().At(i)
		paramName := param.Name()
		paramType := param.Type().String()

		basicLit, ok := argsExpr[i].(*ast.BasicLit)
		paramValue := ""
		if ok {
			paramValue = basicLit.Value
		}

		params[i] = &funcParameter{
			Name:  paramName,
			Type:  paramType,
			Value: paramValue,
			BasePos: BasePos{
				StartPos: int(argsExpr[i].Pos()),
				EndPos:   int(argsExpr[i].End()),
			},
		}
	}
	return params
}

func (d definitions) Position(fset *token.FileSet) {
	for _, def := range d {
		def.StartPosition = Position(fset.Position(token.Pos(def.StartPos)))
		def.EndPosition = Position(fset.Position(token.Pos(def.StartPos)))
		def.From.StartPosition = Position(fset.Position(token.Pos(def.From.StartPos)))
		def.From.EndPosition = Position(fset.Position(token.Pos(def.From.EndPos)))
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
	define := &definitionItem{
		BasePos: BasePos{
			StartPos: int(ident.Pos()),
			EndPos:   int(ident.End()),
		},
		PkgName: obj.Pkg().Name(),
		PkgPath: obj.Pkg().Path(),
		Name:    ident.Name,
	}
	if fn, ok := obj.(*types.Func); ok {
		sign := fn.Type().(*types.Signature)
		recv := sign.Recv()
		if recv != nil {
			recvType := recv.Type()
			if ptrType, ok := recvType.(*types.Pointer); ok {
				recvType = ptrType.Elem()
			}
			if named, ok := recvType.(*types.Named); ok {
				define.StructName = named.Obj().Name()
			}
		}
	}

	return define
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
	name, usageID := convertOverloadToSimple(obj.Name())

	var signList, sampleList []string
	params := make([]param, signature.Params().Len())

	for i := 0; i < signature.Params().Len(); i++ {
		p := signature.Params().At(i)
		paramName := p.Name()
		paramType := p.Type().String()

		params[i] = param{
			Name: paramName,
			Type: paramType,
		}

		signList = append(signList, "${"+strconv.Itoa(i+1)+":"+paramName+"}")
		sampleList = append(sampleList, paramName)
	}

	return usage{
		UsageID:     strconv.Itoa(usageID),
		Declaration: obj.String(),
		Sample:      strings.Join(sampleList, " "),
		InsertText:  name + " " + strings.Join(signList, ", "),
		Params:      params,
		Type:        "func",
	}
}

func findDef(defs map[*ast.Ident]types.Object, obj types.Object) (int, int) {
	for def, dObj := range defs {
		if dObj == obj {
			return int(def.Pos()), int(def.End())
		}
	}
	return 0, 0
}

func tokenDetail(pkg *types.Package, token string) definitionItem {
	names := pkg.Scope().Names()

	definitionItem := definitionItem{
		PkgName: pkg.Name(),
		PkgPath: pkg.Path(),
		Name:    token,
	}

	for _, name := range names {
		obj := pkg.Scope().Lookup(name)
		uses := extractUsages(obj, token)
		if uses == nil {
			continue
		}
		definitionItem.Usages = uses
		definitionItem.StructName = obj.Name()
	}

	return definitionItem
}

func extractUsages(obj types.Object, token string) []usage {
	named, ok := obj.Type().(*types.Named)
	if !ok {
		return nil
	}

	var uses []usage

	for i := 0; i < named.NumMethods(); i++ {
		method := named.Method(i)

		simpleName, idx := convertOverloadToSimple(method.Name())

		if simpleName != token {
			continue
		}

		signature, ok := method.Type().(*types.Signature)
		if !ok {
			return nil
		}

		signList, sampleList, params := extractParams(signature)

		use := usage{
			UsageID:     strconv.Itoa(idx),
			Declaration: method.Type().String(),
			Sample:      strings.Join(sampleList, " "),
			Params:      params,
			Type:        "func",
		}
		use.InsertText = simpleName
		if len(signList) != 0 {
			use.InsertText += " " + strings.Join(signList, ", ")
		}
		uses = append(uses, use)
	}

	return uses
}

func extractParams(signature *types.Signature) (signList []string, sampleList []string, params []param) {
	params = make([]param, signature.Params().Len())

	for i := 0; i < signature.Params().Len(); i++ {
		p := signature.Params().At(i)
		paramName := p.Name()
		paramType := p.Type().String()

		params[i] = param{
			Name: paramName,
			Type: paramType,
		}

		if strings.Contains(paramType, "func") {
			signList = append(signList, "=> {\n\t${"+strconv.Itoa(i+1)+"}\n}")
		} else {
			signList = append(signList, "${"+strconv.Itoa(i+1)+":"+paramName+"}")
		}
		sampleList = append(sampleList, paramName)
	}
	return
}
