package server

import (
	"errors"
	"fmt"
	"go/types"
	"slices"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_completion
func (s *Server) textDocumentCompletion(params *CompletionParams) ([]CompletionItem, error) {
	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
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
	pos := posAt(tokenFile, params.Position)
	if !pos.IsValid() {
		return nil, nil
	}
	innermostScope := result.innermostScopeAt(pos)
	if innermostScope == nil {
		return nil, nil
	}

	ctx := &completionContext{
		result:         result,
		spxFile:        spxFile,
		astFile:        astFile,
		pos:            pos,
		innermostScope: innermostScope,
		fileScope:      result.typeInfo.Scopes[astFile],
	}
	ctx.analyzeCompletionContext()
	itemSet, err := ctx.collectCompletionItems()
	if err != nil {
		return nil, fmt.Errorf("failed to collect completion items: %w", err)
	}
	return itemSet.sortedItems(), nil
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
	spxFile        string
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
				continue
			}
			results := sig.Results()
			if results.Len() == 0 {
				continue
			}
			ctx.returnIndex = ctx.findReturnValueIndex(n)
			if ctx.returnIndex >= 0 && ctx.returnIndex < results.Len() {
				ctx.expectedType = results.At(ctx.returnIndex).Type()
			}
		case *gopast.AssignStmt:
			if n.Tok != goptoken.ASSIGN && n.Tok != goptoken.DEFINE {
				continue
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
				continue
			}
			st, ok := tv.Type.Underlying().(*types.Struct)
			if !ok {
				continue
			}
			ctx.kind = completionKindStructLiteral
			ctx.inStruct = st
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
func (ctx *completionContext) collectCompletionItems() (completionItemSet, error) {
	switch ctx.kind {
	case completionKindImport:
		return ctx.collectImportCompletions()
	case completionKindDot:
		return ctx.collectDotCompletions()
	case completionKindCall:
		return ctx.collectCallCompletions()
	case completionKindStructLiteral:
		return ctx.collectStructLiteralCompletions()
	case completionKindAssignment:
		return ctx.collectTypeSpecificCompletions()
	case completionKindSwitchCase:
		return ctx.collectSwitchCaseCompletions()
	case completionKindSelect:
		return ctx.collectSelectCompletions()
	}
	return ctx.collectGeneralCompletions()
}

// collectGeneralCompletions collects general completions.
func (ctx *completionContext) collectGeneralCompletions() (completionItemSet, error) {
	var itemSet completionItemSet

	// Add local definitions from innermost scope and its parents.
	for scope := ctx.innermostScope; scope != nil; scope = scope.Parent() {
		isInMainScope := ctx.innermostScope == ctx.fileScope && scope == ctx.result.mainPkg.Scope()
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if !isExportedOrMainPkgObject(obj) {
				continue
			}

			itemSet.addSpxDefs(ctx.result.spxDefinitionsFor(obj, "")...)

			isThis := name == "this"
			isSpxFileMatch := ctx.spxFile == name+".spx" || (ctx.spxFile == ctx.result.mainSpxFile && name == "Game")
			isMainScopeObj := isInMainScope && isSpxFileMatch
			if !isThis && !isMainScopeObj {
				continue
			}
			named, ok := unwrapPointerType(obj.Type()).(*types.Named)
			if !ok || !isNamedStructType(named) {
				continue
			}

			itemSet.addSpxDefs(ctx.result.spxDefinitionsForNamedStruct(named)...)
		}
	}

	// Add other definitions.
	itemSet.addSpxDefs(GetSpxPkgDefinitions()...)
	itemSet.addSpxDefs(GetSpxBuiltinDefinitions()...)
	itemSet.addSpxDefs(SpxGeneralDefinitions...)
	if ctx.innermostScope == ctx.fileScope {
		itemSet.addSpxDefs(SpxFileScopeDefinitions...)
	}

	return itemSet, nil
}

// collectImportCompletions collects import completions.
func (ctx *completionContext) collectImportCompletions() (completionItemSet, error) {
	var itemSet completionItemSet
	pkgs, err := pkgdata.ListPkgs()
	if err != nil {
		return completionItemSet{}, fmt.Errorf("failed to list packages: %w", err)
	}
	for _, pkgPath := range pkgs {
		pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
		if err != nil {
			continue
		}
		itemSet.add(SpxDefinition{
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
	return itemSet, nil
}

// collectDotCompletions collects dot completions for member access.
func (ctx *completionContext) collectDotCompletions() (completionItemSet, error) {
	if ctx.path == nil {
		return completionItemSet{}, nil
	}
	tv, ok := ctx.result.typeInfo.Types[ctx.path.X]
	if !ok {
		return completionItemSet{}, nil
	}
	typ := unwrapPointerType(tv.Type)
	if named, ok := typ.(*types.Named); ok && isSpxPkgObject(named.Obj()) && named.Obj().Name() == "Sprite" {
		typ = GetSpxSpriteImplType()
	}

	var itemSet completionItemSet
	if iface, ok := typ.Underlying().(*types.Interface); ok {
		for i := 0; i < iface.NumMethods(); i++ {
			method := iface.Method(i)
			if !isExportedOrMainPkgObject(method) {
				continue
			}

			recvTypeName := ctx.result.selectorTypeNameForIdent(ctx.result.defIdentFor(method))
			itemSet.addSpxDefs(NewSpxDefinitionForFunc(method, recvTypeName, ctx.result.mainPkgDoc))
		}
	} else if named, ok := typ.(*types.Named); ok && isNamedStructType(named) {
		itemSet.addSpxDefs(ctx.result.spxDefinitionsForNamedStruct(named)...)
	}
	return itemSet, nil
}

// collectCallCompletions collects function call completions.
func (ctx *completionContext) collectCallCompletions() (completionItemSet, error) {
	callExpr, ok := ctx.enclosing.(*gopast.CallExpr)
	if !ok {
		return completionItemSet{}, nil
	}
	tv, ok := ctx.result.typeInfo.Types[callExpr.Fun]
	if !ok {
		return completionItemSet{}, nil
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return completionItemSet{}, nil
	}
	argIndex := ctx.getCurrentArgIndex(callExpr)
	if argIndex < 0 {
		return completionItemSet{}, nil
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
func (ctx *completionContext) collectStructLiteralCompletions() (completionItemSet, error) {
	if ctx.inStruct == nil {
		return completionItemSet{}, nil
	}

	var itemSet completionItemSet
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
		if !isExportedOrMainPkgObject(field) {
			continue
		}
		if _, ok := seenFields[field.Name()]; ok {
			continue
		}

		selectorTypeName := ctx.result.selectorTypeNameForIdent(ctx.result.defIdentFor(field))
		forceVar := ctx.result.isDefinedInFirstVarBlock(field)
		spxDef := NewSpxDefinitionForVar(field, selectorTypeName, forceVar, ctx.result.mainPkgDoc)
		spxDef.CompletionItemInsertText = field.Name() + ": ${1:}"
		spxDef.CompletionItemInsertTextFormat = SnippetTextFormat
		itemSet.add(spxDef.CompletionItem())
	}

	return itemSet, nil
}

// collectTypeSpecificCompletions collects type-specific completions.
func (ctx *completionContext) collectTypeSpecificCompletions() (completionItemSet, error) {
	if ctx.expectedType == nil {
		return ctx.collectGeneralCompletions()
	}

	var itemSet completionItemSet
	for scope := ctx.innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if !isExportedOrMainPkgObject(obj) || !isTypeCompatible(obj.Type(), ctx.expectedType) {
				continue
			}

			itemSet.addSpxDefs(ctx.result.spxDefinitionsFor(obj, "")...)
		}
	}
	return itemSet, nil
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
func (ctx *completionContext) collectSwitchCaseCompletions() (completionItemSet, error) {
	if ctx.inSwitch == nil {
		return completionItemSet{}, nil
	}

	var (
		itemSet    completionItemSet
		switchType types.Type
	)
	if ctx.inSwitch.Tag == nil {
		for _, typ := range []string{"int", "string", "bool", "error"} {
			itemSet.addSpxDefs(GetSpxBuiltinDefinition(typ))
		}
		return itemSet, nil
	}
	if tv, ok := ctx.result.typeInfo.Types[ctx.inSwitch.Tag]; ok {
		switchType = tv.Type
	}
	if named, ok := switchType.(*types.Named); ok {
		pkg := named.Obj().Pkg()
		if pkg != nil {
			var pkgDoc *pkgdoc.PkgDoc
			if pkg.Path() == "main" {
				pkgDoc = ctx.result.mainPkgDoc
			} else {
				pkgDoc, _ = pkgdata.GetPkgDoc(pkg.Path())
			}

			scope := pkg.Scope()
			for _, name := range scope.Names() {
				obj := scope.Lookup(name)
				c, ok := obj.(*types.Const)
				if !ok {
					continue
				}

				if types.Identical(c.Type(), switchType) {
					itemSet.addSpxDefs(NewSpxDefinitionForConst(c, pkgDoc))
				}
			}
		}
	}
	return itemSet, nil
}

// collectSelectCompletions collects select statement completions.
func (ctx *completionContext) collectSelectCompletions() (completionItemSet, error) {
	var itemSet completionItemSet
	itemSet.add(
		CompletionItem{
			Label:            "case",
			Kind:             KeywordCompletion,
			InsertText:       "case ${1:ch} <- ${2:value}:$0",
			InsertTextFormat: util.ToPtr(SnippetTextFormat),
		},
		CompletionItem{
			Label:            "default",
			Kind:             KeywordCompletion,
			InsertText:       "default:$0",
			InsertTextFormat: util.ToPtr(SnippetTextFormat),
		},
	)
	return itemSet, nil
}

// completionItemSet is a set of completion items.
type completionItemSet struct {
	items       []CompletionItem
	seenSpxDefs map[string]struct{}
}

// add adds items to the set.
func (s *completionItemSet) add(items ...CompletionItem) {
	s.items = append(s.items, items...)
}

// addSpxDefs adds spx definitions to the set.
func (s *completionItemSet) addSpxDefs(spxDefs ...SpxDefinition) {
	if s.seenSpxDefs == nil {
		s.seenSpxDefs = make(map[string]struct{})
	}
	for _, spxDef := range spxDefs {
		spxDefIDKey := spxDef.ID.String() + "," + spxDef.Overview
		if _, ok := s.seenSpxDefs[spxDefIDKey]; ok {
			continue
		}
		s.seenSpxDefs[spxDefIDKey] = struct{}{}

		s.add(spxDef.CompletionItem())
	}
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

// sortedItems returns the sorted items.
func (s *completionItemSet) sortedItems() []CompletionItem {
	slices.SortStableFunc(s.items, func(a, b CompletionItem) int {
		if p1, p2 := completionItemKindPriority[a.Kind], completionItemKindPriority[b.Kind]; p1 != p2 {
			return p1 - p2
		}
		return strings.Compare(a.Label, b.Label)
	})
	return s.items
}
