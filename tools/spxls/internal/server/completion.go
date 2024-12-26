package server

import (
	"errors"
	"fmt"
	"go/types"
	"slices"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_completion
func (s *Server) textDocumentCompletion(params *CompletionParams) ([]CompletionItem, error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil
		}
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	tokenFile := result.fset.File(astFile.Pos())
	line := min(int(params.Position.Line)+1, tokenFile.LineCount())
	lineStart := tokenFile.LineStart(line)
	pos := tokenFile.Pos(tokenFile.Offset(lineStart) + int(params.Position.Character))
	if !pos.IsValid() {
		return nil, nil
	}
	innermostScope := result.innermostScopeAt(pos)
	if innermostScope == nil {
		return nil, nil
	}

	ctx := &completionContext{
		result:         result,
		astFile:        astFile,
		pos:            pos,
		innermostScope: innermostScope,
		fileScope:      result.typeInfo.Scopes[astFile],
	}
	ctx.analyzeCompletionContext()
	return ctx.collectCompletionItems()
}

// completionKind represents different kinds of completion contexts.
type completionKind int

const (
	completionKindUnknown completionKind = iota
	completionKindImport
	completionKindDot
	completionKindCall
	completionKindStructLiteral
	completionKindAssignment
	completionKindSwitchCase
	completionKindSelect
)

// completionContext represents the context for completion operations.
type completionContext struct {
	result         *compileResult
	astFile        *gopast.File
	pos            goptoken.Pos
	innermostScope *types.Scope
	fileScope      *types.Scope

	kind         completionKind
	path         *gopast.SelectorExpr
	enclosing    gopast.Node
	expectedType types.Type

	inStruct     *types.Struct
	assignTarget types.Type

	inSwitch    *gopast.SwitchStmt
	inGo        bool
	returnIndex int
}

// analyzeCompletionContext analyzes the completion context to determine the
// kind of completion needed.
func (ctx *completionContext) analyzeCompletionContext() {
	path, _ := util.PathEnclosingInterval(ctx.astFile, ctx.pos, ctx.pos)
	if len(path) == 0 {
		return
	}
	for i, node := range path {
		// TODO: Handle incomplete import statements. Currently the AST parsing may fail
		// for incomplete syntax like `import "`. We may need to check the source code
		// directly to detect import completion context in such cases.
		switch n := node.(type) {
		case *gopast.SelectorExpr:
			if n.Sel == nil || n.Sel.Pos() >= ctx.pos {
				ctx.kind = completionKindDot
				ctx.path = n
			}
		case *gopast.CallExpr:
			if n.Lparen.IsValid() && n.Lparen < ctx.pos {
				ctx.kind = completionKindCall
			}
		case *gopast.GoStmt:
			ctx.inGo = true
			ctx.enclosing = n.Call
			ctx.kind = completionKindCall
		case *gopast.DeferStmt:
			ctx.enclosing = n.Call
			ctx.kind = completionKindCall
		case *gopast.ReturnStmt:
			sig := ctx.enclosingFunction(path[i+1:])
			if sig == nil {
				break
			}
			results := sig.Results()
			if results.Len() == 0 {
				break
			}
			ctx.returnIndex = ctx.findReturnValueIndex(n)
			if ctx.returnIndex >= 0 && ctx.returnIndex < results.Len() {
				ctx.expectedType = results.At(ctx.returnIndex).Type()
			}
		case *gopast.AssignStmt:
			if n.Tok != goptoken.ASSIGN && n.Tok != goptoken.DEFINE {
				break
			}
			for j, rhs := range n.Rhs {
				if rhs.Pos() > ctx.pos || ctx.pos > rhs.End() {
					continue
				}
				if j < len(n.Lhs) {
					if tv, ok := ctx.result.typeInfo.Types[n.Lhs[j]]; ok {
						ctx.kind = completionKindAssignment
						ctx.assignTarget = tv.Type
					}
					break
				}
			}
		case *gopast.CompositeLit:
			tv, ok := ctx.result.typeInfo.Types[n]
			if !ok {
				break
			}
			typ, ok := tv.Type.Underlying().(*types.Struct)
			if !ok {
				break
			}
			ctx.kind = completionKindStructLiteral
			ctx.inStruct = typ
		case *gopast.SwitchStmt:
			ctx.kind = completionKindSwitchCase
			ctx.inSwitch = n
		case *gopast.SelectStmt:
			ctx.kind = completionKindSelect
			ctx.expectedType = types.NewChan(types.SendRecv, nil)
		}
	}
}

// findReturnValueIndex finds the index of the return value at the current position.
func (ctx *completionContext) findReturnValueIndex(ret *gopast.ReturnStmt) int {
	if len(ret.Results) == 0 {
		return 0
	}
	for i, expr := range ret.Results {
		if ctx.pos >= expr.Pos() && ctx.pos <= expr.End() {
			return i
		}
	}
	if ctx.pos > ret.Results[len(ret.Results)-1].End() {
		return len(ret.Results)
	}
	return -1
}

// enclosingFunction gets the function signature containing the current position.
func (ctx *completionContext) enclosingFunction(path []gopast.Node) *types.Signature {
	for _, node := range path {
		funcDecl, ok := node.(*gopast.FuncDecl)
		if !ok {
			continue
		}
		obj := ctx.result.typeInfo.ObjectOf(funcDecl.Name)
		if obj == nil {
			continue
		}
		fun, ok := obj.(*types.Func)
		if !ok {
			continue
		}
		return fun.Type().(*types.Signature)
	}
	return nil
}

// collectCompletionItems collects completion items based on the completion context.
func (ctx *completionContext) collectCompletionItems() ([]CompletionItem, error) {
	var (
		items []CompletionItem
		err   error
	)
	switch ctx.kind {
	case completionKindImport:
		items, err = ctx.collectImportCompletions()
	case completionKindDot:
		items, err = ctx.collectDotCompletions()
	case completionKindCall:
		items, err = ctx.collectCallCompletions()
	case completionKindStructLiteral:
		items, err = ctx.collectStructLiteralCompletions()
	case completionKindAssignment:
		items, err = ctx.collectTypeSpecificCompletions()
	case completionKindSwitchCase:
		items, err = ctx.collectSwitchCaseCompletions()
	case completionKindSelect:
		items, err = ctx.collectSelectCompletions()
	default:
		items, err = ctx.collectGeneralCompletions()
	}
	if err != nil {
		return nil, err
	}
	sortCompletionItems(items)
	return items, nil
}

// collectGeneralCompletions collects general completions.
func (ctx *completionContext) collectGeneralCompletions() ([]CompletionItem, error) {
	var items []CompletionItem
	seenDefIDs := make(map[string]struct{})
	addItems := func(defs ...SpxDefinition) {
		for _, def := range defs {
			if _, ok := seenDefIDs[def.ID.String()]; ok {
				continue
			}
			seenDefIDs[def.ID.String()] = struct{}{}
			items = append(items, def.CompletionItem())
		}
	}

	// Add built-in definitions.
	addItems(GetSpxBuiltinDefinitions()...)

	// Add general definitions.
	addItems(SpxGeneralDefinitions...)

	// Add file scope definitions if in file scope.
	if ctx.innermostScope == ctx.fileScope {
		addItems(SpxFileScopeDefinitions...)
	}

	// Add all visible objects in the scope.
	for scope := ctx.innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if obj == nil || !obj.Exported() && obj.Pkg() != ctx.result.mainPkg {
				continue
			}

			switch obj := obj.(type) {
			case *types.Var:
				addItems(NewSpxDefinitionForVar(ctx.result, obj, ""))
			case *types.Const:
				addItems(NewSpxDefinitionForConst(ctx.result, obj))
			case *types.TypeName:
				addItems(NewSpxDefinitionForType(ctx.result, obj))
			case *types.Func:
				addItems(NewSpxDefinitionsForFunc(ctx.result, obj, "")...)
			case *types.PkgName:
				addItems(NewSpxDefinitionForPkg(ctx.result, obj))
			}
		}
	}

	return items, nil
}

// collectImportCompletions collects import completions.
func (ctx *completionContext) collectImportCompletions() ([]CompletionItem, error) {
	var items []CompletionItem
	pkgs, err := pkgdata.ListPkgs()
	if err != nil {
		return nil, fmt.Errorf("failed to list packages: %w", err)
	}
	for _, pkgPath := range pkgs {
		pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
		if err != nil {
			continue
		}
		items = append(items, SpxDefinition{
			ID: SpxDefinitionIdentifier{
				Package: &pkgPath,
			},
			Overview: "package " + pkgPath,
			Detail:   pkgDoc.Doc,

			CompletionItemLabel:            pkgPath,
			CompletionItemKind:             ModuleCompletion,
			CompletionItemInsertText:       pkgPath,
			CompletionItemInsertTextFormat: PlainTextTextFormat,
		}.CompletionItem())
	}
	return items, nil
}

// collectDotCompletions collects dot completions for member access.
func (ctx *completionContext) collectDotCompletions() ([]CompletionItem, error) {
	if ctx.path == nil {
		return nil, nil
	}
	tv, ok := ctx.result.typeInfo.Types[ctx.path.X]
	if !ok {
		return nil, nil
	}
	typ := unwrapPointerType(tv.Type)
	if named, ok := typ.(*types.Named); ok && named.Obj().Pkg().Path() == spxPkgPath && named.Obj().Name() == "Sprite" {
		typ = ctx.result.spxPkg.Scope().Lookup("SpriteImpl").Type()
	}

	var items []CompletionItem
	seenDefIDs := make(map[string]struct{})
	addItems := func(defs ...SpxDefinition) {
		for _, def := range defs {
			if _, ok := seenDefIDs[def.ID.String()]; ok {
				continue
			}
			seenDefIDs[def.ID.String()] = struct{}{}
			items = append(items, def.CompletionItem())
		}
	}

	if iface, ok := typ.Underlying().(*types.Interface); ok {
		for i := 0; i < iface.NumMethods(); i++ {
			method := iface.Method(i)
			if !method.Exported() && method.Pkg() != ctx.result.mainPkg {
				continue
			}

			addItems(NewSpxDefinitionsForFunc(ctx.result, method, "")...)
		}
		return items, nil
	}

	if _, ok := typ.Underlying().(*types.Struct); ok {
		walkStruct(typ, func(named *types.Named, namedParents []*types.Named, member types.Object) {
			if !member.Exported() && member.Pkg() != ctx.result.mainPkg {
				return
			}

			switch member := member.(type) {
			case *types.Var:
				addItems(NewSpxDefinitionForVar(ctx.result, member, ""))
			case *types.Func:
				addItems(NewSpxDefinitionsForFunc(ctx.result, member, named.Obj().Name())...)
			}
		})
	}

	return items, nil
}

// collectCallCompletions collects function call completions.
func (ctx *completionContext) collectCallCompletions() ([]CompletionItem, error) {
	callExpr, ok := ctx.enclosing.(*gopast.CallExpr)
	if !ok {
		return nil, nil
	}
	tv, ok := ctx.result.typeInfo.Types[callExpr.Fun]
	if !ok {
		return nil, nil
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return nil, nil
	}
	argIndex := ctx.getCurrentArgIndex(callExpr)
	if argIndex < 0 {
		return nil, nil
	}

	var expectedType types.Type
	if argIndex < sig.Params().Len() {
		expectedType = sig.Params().At(argIndex).Type()
	} else if sig.Variadic() && argIndex >= sig.Params().Len()-1 {
		expectedType = sig.Params().At(sig.Params().Len() - 1).Type().(*types.Slice).Elem()
	}
	ctx.expectedType = expectedType
	return ctx.collectTypeSpecificCompletions()
}

// getCurrentArgIndex gets the current argument index in a function call.
func (ctx *completionContext) getCurrentArgIndex(callExpr *gopast.CallExpr) int {
	if len(callExpr.Args) == 0 {
		return 0
	}
	for i, arg := range callExpr.Args {
		if ctx.pos >= arg.Pos() && ctx.pos <= arg.End() {
			return i
		}
	}
	if ctx.pos > callExpr.Args[len(callExpr.Args)-1].End() {
		return len(callExpr.Args)
	}
	return -1
}

// collectStructLiteralCompletions collects struct literal completions.
func (ctx *completionContext) collectStructLiteralCompletions() ([]CompletionItem, error) {
	if ctx.inStruct == nil {
		return nil, nil
	}

	var items []CompletionItem
	seenFields := make(map[string]struct{})

	// Collect already used fields.
	if composite, ok := ctx.enclosing.(*gopast.CompositeLit); ok {
		for _, elem := range composite.Elts {
			if kv, ok := elem.(*gopast.KeyValueExpr); ok {
				if ident, ok := kv.Key.(*gopast.Ident); ok {
					seenFields[ident.Name] = struct{}{}
				}
			}
		}
	}

	// Add unused fields.
	for i := 0; i < ctx.inStruct.NumFields(); i++ {
		field := ctx.inStruct.Field(i)
		if !field.Exported() && field.Pkg() != ctx.result.mainPkg {
			continue
		}
		if _, ok := seenFields[field.Name()]; ok {
			continue
		}

		def := NewSpxDefinitionForVar(ctx.result, field, "")
		def.CompletionItemInsertText = field.Name() + ": ${1:}"
		def.CompletionItemInsertTextFormat = SnippetTextFormat
		items = append(items, def.CompletionItem())
	}

	return items, nil
}

// collectTypeSpecificCompletions collects type-specific completions.
func (ctx *completionContext) collectTypeSpecificCompletions() ([]CompletionItem, error) {
	if ctx.expectedType == nil {
		return ctx.collectGeneralCompletions()
	}

	var items []CompletionItem
	seenDefIDs := make(map[string]struct{})
	addItems := func(defs ...SpxDefinition) {
		for _, def := range defs {
			if _, ok := seenDefIDs[def.ID.String()]; ok {
				continue
			}
			seenDefIDs[def.ID.String()] = struct{}{}
			items = append(items, def.CompletionItem())
		}
	}

	for scope := ctx.innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if obj == nil || !obj.Exported() && obj.Pkg() != ctx.result.mainPkg {
				continue
			}
			if !isTypeCompatible(obj.Type(), ctx.expectedType) {
				continue
			}

			switch obj := obj.(type) {
			case *types.Var:
				addItems(NewSpxDefinitionForVar(ctx.result, obj, ""))
			case *types.Const:
				addItems(NewSpxDefinitionForConst(ctx.result, obj))
			case *types.Func:
				addItems(NewSpxDefinitionsForFunc(ctx.result, obj, "")...)
			}
		}
	}
	return items, nil
}

// isTypeCompatible checks if two types are compatible.
func isTypeCompatible(got, want types.Type) bool {
	if got == nil || want == nil {
		return false
	}

	if types.AssignableTo(got, want) {
		return true
	}

	switch want := want.(type) {
	case *types.Interface:
		return types.Implements(got, want)
	case *types.Pointer:
		if gotPtr, ok := got.(*types.Pointer); ok {
			return types.Identical(want.Elem(), gotPtr.Elem())
		}
		return types.Identical(got, want.Elem())
	case *types.Slice:
		gotSlice, ok := got.(*types.Slice)
		return ok && types.Identical(want.Elem(), gotSlice.Elem())
	case *types.Chan:
		gotCh, ok := got.(*types.Chan)
		return ok && types.Identical(want.Elem(), gotCh.Elem()) &&
			(want.Dir() == types.SendRecv || want.Dir() == gotCh.Dir())
	}

	if named, ok := got.(*types.Named); ok {
		return types.AssignableTo(named.Underlying(), want)
	}

	return false
}

// collectSwitchCaseCompletions collects switch/case completions.
func (ctx *completionContext) collectSwitchCaseCompletions() ([]CompletionItem, error) {
	if ctx.inSwitch == nil {
		return nil, nil
	}

	var items []CompletionItem
	seenDefIDs := make(map[string]struct{})
	addItem := func(def SpxDefinition) {
		if _, ok := seenDefIDs[def.ID.String()]; ok {
			return
		}
		seenDefIDs[def.ID.String()] = struct{}{}
		items = append(items, def.CompletionItem())
	}

	var switchType types.Type
	if ctx.inSwitch.Tag != nil {
		if tv, ok := ctx.result.typeInfo.Types[ctx.inSwitch.Tag]; ok {
			switchType = tv.Type
		}
	}

	if ctx.inSwitch.Tag == nil {
		for _, typ := range []string{"int", "string", "bool", "error"} {
			addItem(GetSpxBuiltinDefinition(typ))
		}
		return items, nil
	}

	if named, ok := switchType.(*types.Named); ok {
		if named.Obj().Pkg() != nil {
			scope := named.Obj().Pkg().Scope()
			for _, name := range scope.Names() {
				obj := scope.Lookup(name)
				c, ok := obj.(*types.Const)
				if !ok {
					continue
				}

				if types.Identical(c.Type(), switchType) {
					addItem(NewSpxDefinitionForConst(ctx.result, c))
				}
			}
		}
	}

	return items, nil
}

// collectSelectCompletions collects select statement completions.
func (ctx *completionContext) collectSelectCompletions() ([]CompletionItem, error) {
	var items []CompletionItem
	items = append(items, CompletionItem{
		Label:            "case",
		Kind:             KeywordCompletion,
		InsertText:       "case ${1:ch} <- ${2:value}:$0",
		InsertTextFormat: util.ToPtr(SnippetTextFormat),
	})
	items = append(items, CompletionItem{
		Label:            "default",
		Kind:             KeywordCompletion,
		InsertText:       "default:$0",
		InsertTextFormat: util.ToPtr(SnippetTextFormat),
	})
	return items, nil
}

// completionItemKindPriority is the priority order for different completion
// item kinds.
var completionItemKindPriority = map[CompletionItemKind]int{
	VariableCompletion:  1,
	FieldCompletion:     2,
	MethodCompletion:    3,
	FunctionCompletion:  4,
	ConstantCompletion:  5,
	ClassCompletion:     6,
	InterfaceCompletion: 7,
	ModuleCompletion:    8,
	KeywordCompletion:   9,
}

// sortCompletionItems sorts completion items.
func sortCompletionItems(items []CompletionItem) {
	slices.SortStableFunc(items, func(a, b CompletionItem) int {
		if p1, p2 := completionItemKindPriority[a.Kind], completionItemKindPriority[b.Kind]; p1 != p2 {
			return p1 - p2
		}
		return strings.Compare(a.Label, b.Label)
	})
}
