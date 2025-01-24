package server

import (
	"fmt"
	"go/types"
	"path"
	"slices"
	"strconv"
	"strings"
	"unicode"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
	gopscanner "github.com/goplus/gop/scanner"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_completion
func (s *Server) textDocumentCompletion(params *CompletionParams) ([]CompletionItem, error) {
	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
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
		itemSet:        newCompletionItemSet(),
		result:         result,
		spxFile:        spxFile,
		astFile:        astFile,
		astFileScope:   result.typeInfo.Scopes[astFile],
		tokenFile:      tokenFile,
		pos:            pos,
		innermostScope: innermostScope,
	}
	ctx.analyze()
	if err := ctx.collect(); err != nil {
		return nil, fmt.Errorf("failed to collect completion items: %w", err)
	}
	return ctx.sortedItems(), nil
}

// completionKind represents different kinds of completion contexts.
type completionKind int

const (
	completionKindUnknown completionKind = iota
	completionKindGeneral
	completionKindComment
	completionKindStringLit
	completionKindImport
	completionKindDot
	completionKindCall
	completionKindAssignOrDefine
	completionKindDecl
	completionKindReturn
	completionKindStructLit
	completionKindSwitchCase
	completionKindSelect
)

// completionContext represents the context for completion operations.
type completionContext struct {
	itemSet *completionItemSet

	result         *compileResult
	spxFile        string
	astFile        *gopast.File
	astFileScope   *types.Scope
	tokenFile      *goptoken.File
	pos            goptoken.Pos
	innermostScope *types.Scope

	kind completionKind

	enclosingNode      gopast.Node
	selectorExpr       *gopast.SelectorExpr
	expectedTypes      []types.Type
	expectedStructType *types.Struct
	assignTargets      []*gopast.Ident
	declValueSpec      *gopast.ValueSpec
	switchTag          gopast.Expr
	returnIndex        int

	inStringLit bool
}

// analyze analyzes the completion context to determine the kind of completion needed.
func (ctx *completionContext) analyze() {
	path, _ := util.PathEnclosingInterval(ctx.astFile, ctx.pos-1, ctx.pos)
	for i, node := range slices.Backward(path) {
		switch node := node.(type) {
		case *gopast.ImportSpec:
			ctx.kind = completionKindImport
		case *gopast.SelectorExpr:
			if node.Sel == nil || node.Sel.Pos() >= ctx.pos {
				ctx.kind = completionKindDot
				ctx.selectorExpr = node
			}
		case *gopast.CallExpr:
			ctx.kind = completionKindCall
			ctx.enclosingNode = node
		case *gopast.CompositeLit:
			tv, ok := ctx.result.typeInfo.Types[node]
			if !ok {
				continue
			}
			st, ok := tv.Type.Underlying().(*types.Struct)
			if !ok {
				continue
			}
			ctx.kind = completionKindStructLit
			ctx.expectedStructType = st
		case *gopast.AssignStmt:
			if node.Tok != goptoken.ASSIGN && node.Tok != goptoken.DEFINE {
				continue
			}
			for j, rhs := range node.Rhs {
				if rhs.Pos() > ctx.pos || ctx.pos > rhs.End() {
					continue
				}
				if j < len(node.Lhs) {
					ctx.kind = completionKindAssignOrDefine
					if tv, ok := ctx.result.typeInfo.Types[node.Lhs[j]]; ok {
						ctx.expectedTypes = []types.Type{tv.Type}
					}
					if ident, ok := node.Lhs[j].(*gopast.Ident); ok {
						defIdent := ctx.result.defIdentFor(ctx.result.typeInfo.ObjectOf(ident))
						if defIdent != nil {
							ctx.assignTargets = append(ctx.assignTargets, defIdent)
						}
					}
					break
				}
			}
		case *gopast.ReturnStmt:
			sig := ctx.enclosingFunction(path[i+1:])
			if sig == nil {
				continue
			}
			results := sig.Results()
			if results.Len() == 0 {
				continue
			}
			ctx.kind = completionKindReturn
			ctx.returnIndex = ctx.findReturnValueIndex(node)
			if ctx.returnIndex >= 0 && ctx.returnIndex < results.Len() {
				ctx.expectedTypes = []types.Type{results.At(ctx.returnIndex).Type()}
			}
		case *gopast.GoStmt:
			ctx.kind = completionKindCall
			ctx.enclosingNode = node.Call
		case *gopast.DeferStmt:
			ctx.kind = completionKindCall
			ctx.enclosingNode = node.Call
		case *gopast.SwitchStmt:
			ctx.kind = completionKindSwitchCase
			ctx.switchTag = node.Tag
		case *gopast.SelectStmt:
			ctx.kind = completionKindSelect
		case *gopast.DeclStmt:
			if genDecl, ok := node.Decl.(*gopast.GenDecl); ok && (genDecl.Tok == goptoken.VAR || genDecl.Tok == goptoken.CONST) {
				for _, spec := range genDecl.Specs {
					valueSpec, ok := spec.(*gopast.ValueSpec)
					if !ok || len(valueSpec.Names) == 0 {
						continue
					}
					ctx.kind = completionKindDecl
					if typ := ctx.result.typeInfo.TypeOf(valueSpec.Type); typ != nil && typ != types.Typ[types.Invalid] {
						ctx.expectedTypes = []types.Type{typ}
					}
					ctx.assignTargets = valueSpec.Names
					ctx.declValueSpec = valueSpec
					break
				}
			}
		case *gopast.BasicLit:
			if node.Kind == goptoken.STRING {
				if ctx.kind == completionKindUnknown {
					ctx.kind = completionKindStringLit
				}
				ctx.inStringLit = true
			}
		case *gopast.BlockStmt:
			ctx.kind = completionKindUnknown
		}
	}
	if ctx.kind == completionKindUnknown {
		switch {
		case ctx.isInComment():
			ctx.kind = completionKindComment
		case ctx.isInImportStringLit():
			ctx.kind = completionKindImport
			ctx.inStringLit = true
		case ctx.isLineStart():
			ctx.kind = completionKindGeneral
		}
	}
}

// isInComment reports whether the position of the current completion context
// is inside a comment.
func (ctx *completionContext) isInComment() bool {
	for _, comment := range ctx.astFile.Comments {
		if comment.Pos() <= ctx.pos && ctx.pos <= comment.End() {
			return true
		}
	}
	return false
}

// isInImportStringLit reports whether the position of the current completion
// context is inside an import string literal.
func (ctx *completionContext) isInImportStringLit() bool {
	var s gopscanner.Scanner
	s.Init(ctx.tokenFile, ctx.astFile.Code, nil, 0)

	var (
		lastPos       goptoken.Pos
		lastTok       goptoken.Token
		inImportGroup bool
	)
	for {
		pos, tok, lit := s.Scan()
		if tok == goptoken.EOF {
			break
		}

		// Track if we're inside an import group.
		if lastTok == goptoken.IMPORT && tok == goptoken.LPAREN {
			inImportGroup = true
		} else if tok == goptoken.RPAREN {
			inImportGroup = false
		}

		// Check if we found `import` followed by `"` or we're in an import group.
		if (lastTok == goptoken.IMPORT || inImportGroup) &&
			(tok == goptoken.STRING || tok == goptoken.ILLEGAL) {
			// Check if position is after `import` keyword or within an import
			// group, and inside a string literal (complete or incomplete).
			if lastPos <= ctx.pos && ctx.pos <= pos+goptoken.Pos(len(lit)) {
				return true
			}
		}

		lastPos = pos
		lastTok = tok
	}
	return false
}

// isLineStart reports whether the position of the completion context is at the
// start of a line, ignoring whitespace.
func (ctx *completionContext) isLineStart() bool {
	line := ctx.tokenFile.Line(ctx.pos)
	lineStartPos := ctx.tokenFile.LineStart(line)
	// Subtract 2 from cursor position to check content before the cursor,
	// excluding any partial input at cursor position.
	codeEndPos := min(ctx.pos-2, goptoken.Pos(len(ctx.astFile.Code)))
	for pos := lineStartPos; pos < codeEndPos; pos++ {
		if !unicode.IsSpace(rune(ctx.astFile.Code[pos])) {
			return false
		}
	}
	return true
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

// collect collects completion items based on the completion context kind.
func (ctx *completionContext) collect() error {
	switch ctx.kind {
	case completionKindComment,
		completionKindStringLit:
		return nil
	case completionKindGeneral:
		return ctx.collectGeneral()
	case completionKindImport:
		return ctx.collectImport()
	case completionKindDot:
		return ctx.collectDot()
	case completionKindCall:
		return ctx.collectCall()
	case completionKindAssignOrDefine:
		return ctx.collectAssignOrDefine()
	case completionKindDecl:
		return ctx.collectDecl()
	case completionKindReturn:
		return ctx.collectReturn()
	case completionKindStructLit:
		return ctx.collectStructLit()
	case completionKindSwitchCase:
		return ctx.collectSwitchCase()
	case completionKindSelect:
		return ctx.collectSelect()
	}
	return nil
}

// collectGeneral collects general completions.
func (ctx *completionContext) collectGeneral() error {
	for _, expectedType := range ctx.expectedTypes {
		if err := ctx.collectTypeSpecific(expectedType); err != nil {
			return err
		}
	}

	if ctx.inStringLit {
		return nil
	}

	switch ctx.kind {
	case completionKindDecl:
		if ctx.declValueSpec.Values == nil { // var x in|
			ctx.itemSet.setSupportedKinds(
				ClassCompletion,
				InterfaceCompletion,
				StructCompletion,
			)
			break
		}
		fallthrough
	case completionKindAssignOrDefine:
		ctx.itemSet.setSupportedKinds(
			VariableCompletion,
			ConstantCompletion,
			// TODO: Add return type compatibility check for FunctionCompletion.
			FunctionCompletion,
		)
	}
	ctx.itemSet.setExpectedTypes(ctx.expectedTypes)

	// Add local definitions from innermost scope and its parents.
	for scope := ctx.innermostScope; scope != nil; scope = scope.Parent() {
		isInMainScope := ctx.innermostScope == ctx.astFileScope && scope == ctx.result.mainPkg.Scope()
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if !isExportedOrMainPkgObject(obj) {
				continue
			}
			if defIdent := ctx.result.defIdentFor(obj); defIdent != nil && slices.Contains(ctx.assignTargets, defIdent) {
				continue
			}

			ctx.itemSet.addSpxDefs(ctx.result.spxDefinitionsFor(obj, "")...)

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

			ctx.itemSet.addSpxDefs(ctx.result.spxDefinitionsForNamedStruct(named)...)
		}
	}

	// Add imported package definitions.
	for _, importSpec := range ctx.astFile.Imports {
		if importSpec.Path == nil {
			continue
		}
		pkgPath, err := strconv.Unquote(importSpec.Path.Value)
		if err != nil {
			continue
		}
		pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
		if err != nil {
			continue
		}

		pkgPathBase := path.Base(pkgPath)
		pkgName := pkgPathBase
		if importSpec.Name != nil {
			pkgName = importSpec.Name.Name
		}

		ctx.itemSet.addSpxDefs(SpxDefinition{
			ID: SpxDefinitionIdentifier{
				Package: &pkgPath,
			},
			Overview: "package " + pkgPathBase,
			Detail:   pkgDoc.Doc,

			CompletionItemLabel:            pkgName,
			CompletionItemKind:             ModuleCompletion,
			CompletionItemInsertText:       pkgName,
			CompletionItemInsertTextFormat: PlainTextTextFormat,
		})
	}

	// Add other definitions.
	ctx.itemSet.addSpxDefs(GetSpxPkgDefinitions()...)
	ctx.itemSet.addSpxDefs(GetSpxBuiltinDefinitions()...)
	ctx.itemSet.addSpxDefs(SpxGeneralDefinitions...)
	if ctx.innermostScope == ctx.astFileScope {
		ctx.itemSet.addSpxDefs(SpxFileScopeDefinitions...)
	}

	return nil
}

// collectImport collects import completions.
func (ctx *completionContext) collectImport() error {
	pkgs, err := pkgdata.ListPkgs()
	if err != nil {
		return fmt.Errorf("failed to list packages: %w", err)
	}
	for _, pkgPath := range pkgs {
		pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
		if err != nil {
			continue
		}
		ctx.itemSet.addSpxDefs(SpxDefinition{
			ID: SpxDefinitionIdentifier{
				Package: &pkgPath,
			},
			Overview: "package " + path.Base(pkgPath),
			Detail:   pkgDoc.Doc,

			CompletionItemLabel:            pkgPath,
			CompletionItemKind:             ModuleCompletion,
			CompletionItemInsertText:       pkgPath,
			CompletionItemInsertTextFormat: PlainTextTextFormat,
		})
	}
	return nil
}

// collectDot collects dot completions for member access.
func (ctx *completionContext) collectDot() error {
	if ctx.selectorExpr == nil {
		return nil
	}

	if ident, ok := ctx.selectorExpr.X.(*gopast.Ident); ok {
		if obj := ctx.result.typeInfo.ObjectOf(ident); obj != nil {
			if pkgName, ok := obj.(*types.PkgName); ok {
				return ctx.collectPackageMembers(pkgName.Imported())
			}
		}
	}

	tv, ok := ctx.result.typeInfo.Types[ctx.selectorExpr.X]
	if !ok {
		return nil
	}
	typ := unwrapPointerType(tv.Type)
	if named, ok := typ.(*types.Named); ok && isSpxPkgObject(named.Obj()) && named.Obj().Name() == "Sprite" {
		typ = GetSpxSpriteImplType()
	}

	if iface, ok := typ.Underlying().(*types.Interface); ok {
		for i := 0; i < iface.NumMethods(); i++ {
			method := iface.Method(i)
			if !isExportedOrMainPkgObject(method) {
				continue
			}

			recvTypeName := ctx.result.selectorTypeNameForIdent(ctx.result.defIdentFor(method))
			ctx.itemSet.addSpxDefs(NewSpxDefinitionForFunc(method, recvTypeName, ctx.result.mainPkgDoc))
		}
	} else if named, ok := typ.(*types.Named); ok && isNamedStructType(named) {
		ctx.itemSet.addSpxDefs(ctx.result.spxDefinitionsForNamedStruct(named)...)
	}
	return nil
}

// collectPackageMembers collects members of a package.
func (ctx *completionContext) collectPackageMembers(pkg *types.Package) error {
	if pkg == nil {
		return nil
	}

	var pkgDoc *pkgdoc.PkgDoc
	if pkgPath := pkg.Path(); pkgPath == "main" {
		pkgDoc = ctx.result.mainPkgDoc
	} else {
		var err error
		pkgDoc, err = pkgdata.GetPkgDoc(pkgPath)
		if err != nil {
			return nil
		}
	}

	ctx.itemSet.addSpxDefs(GetPkgSpxDefinitions(pkg, pkgDoc)...)
	return nil
}

// collectCall collects function call completions.
func (ctx *completionContext) collectCall() error {
	callExpr, ok := ctx.enclosingNode.(*gopast.CallExpr)
	if !ok {
		return nil
	}
	tv, ok := ctx.result.typeInfo.Types[callExpr.Fun]
	if !ok {
		return nil
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		// TODO: Handle invalid type with no signature, like `println`.
		return nil
	}
	argIndex := ctx.getCurrentArgIndex(callExpr)
	if argIndex < 0 {
		return nil
	}

	var fun *types.Func
	switch expr := callExpr.Fun.(type) {
	case *gopast.Ident:
		if obj := ctx.result.typeInfo.ObjectOf(expr); obj != nil {
			fun, _ = obj.(*types.Func)
		}
	case *gopast.SelectorExpr:
		if obj := ctx.result.typeInfo.ObjectOf(expr.Sel); obj != nil {
			fun, _ = obj.(*types.Func)
		}
	}
	if fun != nil {
		funcOverloads := expandGopOverloadableFunc(fun)
		if len(funcOverloads) > 0 {
			expectedTypes := make([]types.Type, 0, len(funcOverloads))
			for _, funcOverload := range funcOverloads {
				sig := funcOverload.Type().(*types.Signature)
				if argIndex < sig.Params().Len() {
					expectedTypes = append(expectedTypes, sig.Params().At(argIndex).Type())
				} else if sig.Variadic() && argIndex >= sig.Params().Len()-1 {
					expectedTypes = append(expectedTypes, sig.Params().At(sig.Params().Len()-1).Type().(*types.Slice).Elem())
				}
			}
			ctx.expectedTypes = slices.Compact(expectedTypes)
			return ctx.collectGeneral()
		}
	}

	if argIndex < sig.Params().Len() {
		ctx.expectedTypes = []types.Type{sig.Params().At(argIndex).Type()}
	} else if sig.Variadic() && argIndex >= sig.Params().Len()-1 {
		ctx.expectedTypes = []types.Type{sig.Params().At(sig.Params().Len() - 1).Type().(*types.Slice).Elem()}
	}
	return ctx.collectGeneral()
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

// collectAssignOrDefine collects completions for assignments and definitions.
func (ctx *completionContext) collectAssignOrDefine() error {
	return ctx.collectGeneral()
}

// collectDecl collects declaration completions.
func (ctx *completionContext) collectDecl() error {
	return ctx.collectGeneral()
}

// collectReturn collects return value completions.
func (ctx *completionContext) collectReturn() error {
	return ctx.collectGeneral()
}

// collectTypeSpecific collects type-specific completions.
func (ctx *completionContext) collectTypeSpecific(typ types.Type) error {
	if typ == nil || typ == types.Typ[types.Invalid] {
		return nil
	}

	var spxResourceIds []SpxResourceID
	switch typ {
	case GetSpxBackdropNameType():
		spxResourceIds = slices.Grow(spxResourceIds, len(ctx.result.spxResourceSet.backdrops))
		for spxBackdropName := range ctx.result.spxResourceSet.backdrops {
			spxResourceIds = append(spxResourceIds, SpxBackdropResourceID{spxBackdropName})
		}
	case GetSpxSpriteType(), GetSpxSpriteImplType():
		for spxSprite := range ctx.result.spxSpriteResourceAutoBindings {
			if spxSprite.Type() == typ {
				ctx.itemSet.addSpxDefs(ctx.result.spxDefinitionsFor(spxSprite, "Game")...)
			}
		}
	case GetSpxSpriteNameType():
		spxResourceIds = slices.Grow(spxResourceIds, len(ctx.result.spxResourceSet.sprites))
		for spxSpriteName := range ctx.result.spxResourceSet.sprites {
			spxResourceIds = append(spxResourceIds, SpxSpriteResourceID{spxSpriteName})
		}
	case GetSpxSpriteCostumeNameType():
		expectedSpxSprite := ctx.getSpxSpriteResource()
		for _, spxSprite := range ctx.result.spxResourceSet.sprites {
			if expectedSpxSprite == nil || spxSprite == expectedSpxSprite {
				spxResourceIds = slices.Grow(spxResourceIds, len(spxSprite.NormalCostumes))
				for _, spxSpriteCostume := range spxSprite.NormalCostumes {
					spxResourceIds = append(spxResourceIds, SpxSpriteCostumeResourceID{spxSprite.Name, spxSpriteCostume.Name})
				}
			}
		}
	case GetSpxSpriteAnimationNameType():
		expectedSpxSprite := ctx.getSpxSpriteResource()
		for _, spxSprite := range ctx.result.spxResourceSet.sprites {
			if expectedSpxSprite == nil || spxSprite == expectedSpxSprite {
				spxResourceIds = slices.Grow(spxResourceIds, len(spxSprite.Animations))
				for _, spxSpriteAnimation := range spxSprite.Animations {
					spxResourceIds = append(spxResourceIds, SpxSpriteAnimationResourceID{spxSprite.Name, spxSpriteAnimation.Name})
				}
			}
		}
	case GetSpxSoundType():
		for spxSound := range ctx.result.spxSoundResourceAutoBindings {
			if spxSound.Type() == typ {
				ctx.itemSet.addSpxDefs(ctx.result.spxDefinitionsFor(spxSound, "Game")...)
			}
		}
	case GetSpxSoundNameType():
		spxResourceIds = slices.Grow(spxResourceIds, len(ctx.result.spxResourceSet.sounds))
		for spxSoundName := range ctx.result.spxResourceSet.sounds {
			spxResourceIds = append(spxResourceIds, SpxSoundResourceID{spxSoundName})
		}
	case GetSpxWidgetNameType():
		spxResourceIds = slices.Grow(spxResourceIds, len(ctx.result.spxResourceSet.widgets))
		for spxWidgetName := range ctx.result.spxResourceSet.widgets {
			spxResourceIds = append(spxResourceIds, SpxWidgetResourceID{spxWidgetName})
		}
	}
	for _, spxResourceId := range spxResourceIds {
		name := spxResourceId.Name()
		if !ctx.inStringLit {
			name = strconv.Quote(name)
		}
		ctx.itemSet.add(CompletionItem{
			Label:            name,
			Kind:             TextCompletion,
			Documentation:    &Or_CompletionItem_documentation{Value: MarkupContent{Kind: Markdown, Value: spxResourceId.URI().HTML()}},
			InsertText:       name,
			InsertTextFormat: util.ToPtr(PlainTextTextFormat),
		})
	}
	return nil
}

// getSpxSpriteResource returns a [SpxSpriteResource] for the current context.
// It returns nil if no [SpxSpriteResource] can be inferred.
func (ctx *completionContext) getSpxSpriteResource() *SpxSpriteResource {
	if ctx.kind != completionKindCall {
		return nil
	}

	callExpr, ok := ctx.enclosingNode.(*gopast.CallExpr)
	if !ok {
		return nil
	}
	sel, ok := callExpr.Fun.(*gopast.SelectorExpr)
	if !ok {
		if ctx.spxFile == "main.spx" {
			return nil
		}
		return ctx.result.spxResourceSet.sprites[strings.TrimSuffix(ctx.spxFile, ".spx")]
	}

	ident, ok := sel.X.(*gopast.Ident)
	if !ok {
		return nil
	}
	obj := ctx.result.typeInfo.ObjectOf(ident)
	if obj == nil {
		return nil
	}
	named, ok := obj.Type().(*types.Named)
	if !ok {
		return nil
	}

	if named == GetSpxSpriteType() {
		return ctx.result.spxResourceSet.sprites[ident.Name]
	}
	if slices.Contains(ctx.result.mainPkgSpriteTypes, named) {
		return ctx.result.spxResourceSet.sprites[obj.Name()]
	}
	return nil
}

// collectStructLit collects struct literal completions.
func (ctx *completionContext) collectStructLit() error {
	if ctx.expectedStructType == nil {
		return nil
	}

	seenFields := make(map[string]struct{})

	// Collect already used fields.
	if composite, ok := ctx.enclosingNode.(*gopast.CompositeLit); ok {
		for _, elem := range composite.Elts {
			if kv, ok := elem.(*gopast.KeyValueExpr); ok {
				if ident, ok := kv.Key.(*gopast.Ident); ok {
					seenFields[ident.Name] = struct{}{}
				}
			}
		}
	}

	// Add unused fields.
	for i := 0; i < ctx.expectedStructType.NumFields(); i++ {
		field := ctx.expectedStructType.Field(i)
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
		ctx.itemSet.addSpxDefs(spxDef)
	}

	return nil
}

// collectSwitchCase collects switch/case completions.
func (ctx *completionContext) collectSwitchCase() error {
	if ctx.switchTag == nil {
		for _, name := range []string{"int", "string", "bool", "error"} {
			if obj := types.Universe.Lookup(name); obj != nil {
				ctx.itemSet.addSpxDefs(GetSpxBuiltinDefinition(obj))
			}
		}
		return nil
	}

	tv, ok := ctx.result.typeInfo.Types[ctx.switchTag]
	if !ok {
		return nil
	}
	named, ok := tv.Type.(*types.Named)
	if !ok {
		return nil
	}
	pkg := named.Obj().Pkg()
	if pkg == nil {
		return nil
	}

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

		if types.Identical(c.Type(), tv.Type) {
			ctx.itemSet.addSpxDefs(NewSpxDefinitionForConst(c, pkgDoc))
		}
	}
	return nil
}

// collectSelect collects select statement completions.
func (ctx *completionContext) collectSelect() error {
	ctx.itemSet.add(
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
	return nil
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
func (ctx *completionContext) sortedItems() []CompletionItem {
	slices.SortStableFunc(ctx.itemSet.items, func(a, b CompletionItem) int {
		if p1, p2 := completionItemKindPriority[a.Kind], completionItemKindPriority[b.Kind]; p1 != p2 {
			return p1 - p2
		}
		return strings.Compare(a.Label, b.Label)
	})
	return ctx.itemSet.items
}

// completionItemSet is a set of completion items.
type completionItemSet struct {
	items                         []CompletionItem
	seenSpxDefs                   map[string]struct{}
	supportedKinds                map[CompletionItemKind]struct{}
	isCompatibleWithExpectedTypes func(typ types.Type) bool
}

// newCompletionItemSet creates a new [completionItemSet].
func newCompletionItemSet() *completionItemSet {
	return &completionItemSet{
		items:       []CompletionItem{},
		seenSpxDefs: make(map[string]struct{}),
	}
}

// setSupportedKinds sets the supported kinds for the completion items.
func (s *completionItemSet) setSupportedKinds(kinds ...CompletionItemKind) {
	if len(kinds) == 0 {
		return
	}

	s.supportedKinds = make(map[CompletionItemKind]struct{})
	for _, kind := range kinds {
		s.supportedKinds[kind] = struct{}{}
	}
}

// setExpectedTypes sets the expected types for the completion items.
func (s *completionItemSet) setExpectedTypes(expectedTypes []types.Type) {
	if len(expectedTypes) == 0 {
		return
	}

	s.isCompatibleWithExpectedTypes = func(typ types.Type) bool {
		for _, expectedType := range expectedTypes {
			if expectedType != types.Typ[types.Invalid] && isTypeCompatible(typ, expectedType) {
				return true
			}
		}
		return false
	}
}

// add adds items to the set.
func (s *completionItemSet) add(items ...CompletionItem) {
	for _, item := range items {
		if s.supportedKinds != nil {
			if _, ok := s.supportedKinds[item.Kind]; !ok {
				continue
			}
		}
		s.items = append(s.items, item)
	}
}

// addSpxDefs adds spx definitions to the set.
func (s *completionItemSet) addSpxDefs(spxDefs ...SpxDefinition) {
	for _, spxDef := range spxDefs {
		if s.isCompatibleWithExpectedTypes != nil && !s.isCompatibleWithExpectedTypes(spxDef.TypeHint) {
			continue
		}

		spxDefIDKey := spxDef.ID.String()
		if _, ok := s.seenSpxDefs[spxDefIDKey]; ok {
			continue
		}
		s.seenSpxDefs[spxDefIDKey] = struct{}{}

		s.add(spxDef.CompletionItem())
	}
}
