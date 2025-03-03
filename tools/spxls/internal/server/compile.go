package server

import (
	"errors"
	"fmt"
	"go/types"
	"io/fs"
	"maps"
	"path"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/goplus/builder/tools/spxls/internal"
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/inspect"
	"github.com/goplus/builder/tools/spxls/internal/ast/inspector"
	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
	"github.com/goplus/builder/tools/spxls/internal/util"
	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/goplus/gogen"
	gopast "github.com/goplus/gop/ast"
	gopparser "github.com/goplus/gop/parser"
	gopscanner "github.com/goplus/gop/scanner"
	goptoken "github.com/goplus/gop/token"
	goptypesutil "github.com/goplus/gop/x/typesutil"
	"github.com/goplus/mod/gopmod"
	gopmodload "github.com/goplus/mod/modload"
)

// errNoMainSpxFile is the error returned when no valid main.spx file is found
// in the main package while compiling.
var errNoMainSpxFile = errors.New("no valid main.spx file found in main package")

// compileResult contains the compile results and additional information from
// the compile process.
type compileResult struct {
	// fset is the source file set used for parsing the spx files.
	fset *goptoken.FileSet

	// mainPkg is the main package.
	mainPkg *types.Package

	// mainPkgGameType is the Game type in the main package.
	mainPkgGameType *types.Named

	// mainPkgSpriteTypes stores sprite types in the main package.
	mainPkgSpriteTypes []*types.Named

	// mainASTPkg is the main package AST.
	mainASTPkg *gopast.Package

	// mainASTPkgSpecToGenDecl maps each spec in the main package AST to its
	// parent general declaration.
	mainASTPkgSpecToGenDecl map[gopast.Spec]*gopast.GenDecl

	// mainASTPkgIdentToFuncDecl maps each function identifier in the main
	// package AST to its function declaration.
	mainASTPkgIdentToFuncDecl map[*gopast.Ident]*gopast.FuncDecl

	// mainPkgDoc is the documentation for the main package.
	mainPkgDoc *pkgdoc.PkgDoc

	// mainSpxFile is the main.spx file path.
	mainSpxFile string

	// firstVarBlocks maps each AST file to its first var block.
	firstVarBlocks map[*gopast.File]*gopast.GenDecl

	// typeInfo contains type information collected during the compile
	// process.
	typeInfo *goptypesutil.Info

	// spxResourceSet is the set of spx resources.
	spxResourceSet SpxResourceSet

	// spxResourceRefs stores spx resource references.
	spxResourceRefs []SpxResourceRef

	// seenSpxResourceRefs stores already seen spx resource references to avoid
	// duplicates.
	seenSpxResourceRefs map[SpxResourceRef]struct{}

	// spxSoundResourceAutoBindings stores spx sound resource auto-bindings.
	spxSoundResourceAutoBindings map[types.Object]struct{}

	// spxSpriteResourceAutoBindings stores spx sprite resource auto-bindings.
	spxSpriteResourceAutoBindings map[types.Object]struct{}

	// diagnostics stores diagnostic messages for each document.
	diagnostics map[DocumentURI][]Diagnostic

	// seenDiagnostics stores already reported diagnostics to avoid duplicates.
	seenDiagnostics map[DocumentURI]map[string]struct{}

	// hasErrorSeverityDiagnostic is true if the compile result has any
	// diagnostics with error severity.
	hasErrorSeverityDiagnostic bool

	// computedCache is the cache for computed results.
	computedCache compileResultComputedCache

	// documentURIs maps each spx file path to its document URI.
	documentURIs map[string]DocumentURI
}

// compileResultComputedCache represents the computed cache for [compileResult].
type compileResultComputedCache struct {
	// identsAtASTFileLines stores the identifiers at the given AST file line.
	identsAtASTFileLines sync.Map // map[astFileLine][]*gopast.Ident

	// spxDefinitionsForNamedStructs stores spx definitions for named structs.
	spxDefinitionsForNamedStructs sync.Map // map[*types.Named][]SpxDefinition

	// documentLinks stores document links for each document URI.
	documentLinks sync.Map // map[DocumentURI][]DocumentLink

	// semanticTokens stores semantic tokens for each document URI.
	semanticTokens sync.Map // map[DocumentURI][]uint32
}

// astFileLine represents an AST file line.
type astFileLine struct {
	astFile *gopast.File
	line    int
}

// newCompileResult creates a new [compileResult].
func newCompileResult() *compileResult {
	return &compileResult{
		fset:                      goptoken.NewFileSet(),
		mainPkg:                   types.NewPackage("main", "main"),
		mainASTPkg:                &gopast.Package{Name: "main", Files: make(map[string]*gopast.File)},
		mainASTPkgSpecToGenDecl:   make(map[gopast.Spec]*gopast.GenDecl),
		mainASTPkgIdentToFuncDecl: make(map[*gopast.Ident]*gopast.FuncDecl),
		firstVarBlocks:            make(map[*gopast.File]*gopast.GenDecl),
		typeInfo: &goptypesutil.Info{
			Types:      make(map[gopast.Expr]types.TypeAndValue),
			Defs:       make(map[*gopast.Ident]types.Object),
			Uses:       make(map[*gopast.Ident]types.Object),
			Implicits:  make(map[gopast.Node]types.Object),
			Selections: make(map[*gopast.SelectorExpr]*types.Selection),
			Scopes:     make(map[gopast.Node]*types.Scope),
		},
		spxSoundResourceAutoBindings:  make(map[types.Object]struct{}),
		spxSpriteResourceAutoBindings: make(map[types.Object]struct{}),
		diagnostics:                   make(map[DocumentURI][]Diagnostic),
		documentURIs:                  make(map[string]DocumentURI),
	}
}

// isInFset reports whether the given position exists in the file set.
func (r *compileResult) isInFset(pos goptoken.Pos) bool {
	return r.fset.File(pos) != nil
}

// innermostScopeAt returns the innermost scope that contains the given
// position. It returns nil if not found.
func (r *compileResult) innermostScopeAt(pos goptoken.Pos) *types.Scope {
	fileScope := r.typeInfo.Scopes[r.posASTFile(pos)]
	if fileScope == nil {
		return nil
	}
	innermostScope := fileScope
	for _, scope := range r.typeInfo.Scopes {
		if scope.Contains(pos) && fileScope.Contains(scope.Pos()) && innermostScope.Contains(scope.Pos()) {
			innermostScope = scope
		}
	}
	return innermostScope
}

// identsAtASTFileLine returns the identifiers at the given line in the given
// AST file.
func (r *compileResult) identsAtASTFileLine(astFile *gopast.File, line int) (idents []*gopast.Ident) {
	astFileLine := astFileLine{astFile: astFile, line: line}
	if identsAtLineIface, ok := r.computedCache.identsAtASTFileLines.Load(astFileLine); ok {
		return identsAtLineIface.([]*gopast.Ident)
	}
	defer func() {
		r.computedCache.identsAtASTFileLines.Store(astFileLine, slices.Clip(idents))
	}()

	astFilePos := r.fset.Position(astFile.Pos())
	collectIdentAtLine := func(ident *gopast.Ident) {
		identPos := r.fset.Position(ident.Pos())
		if identPos.Filename == astFilePos.Filename && identPos.Line == line {
			idents = append(idents, ident)
		}
	}
	for ident := range r.typeInfo.Defs {
		if funcDecl, ok := r.mainASTPkgIdentToFuncDecl[ident]; ok && funcDecl.Shadow {
			continue
		}
		collectIdentAtLine(ident)
	}
	for ident, obj := range r.typeInfo.Uses {
		if funcDecl, ok := r.mainASTPkgIdentToFuncDecl[r.defIdentFor(obj)]; ok && funcDecl.Shadow {
			continue
		}
		collectIdentAtLine(ident)
	}
	return
}

// identAtASTFilePosition returns the identifier at the given position in the
// given AST file.
func (r *compileResult) identAtASTFilePosition(astFile *gopast.File, position Position) *gopast.Ident {
	line := int(position.Line) + 1
	column := int(position.Character) + 1

	var (
		bestIdent    *gopast.Ident
		bestNodeSpan int
	)
	for _, ident := range r.identsAtASTFileLine(astFile, line) {
		identPos := r.fset.Position(ident.Pos())
		identEnd := r.fset.Position(ident.End())
		if column < identPos.Column || column > identEnd.Column {
			continue
		}

		nodeSpan := identEnd.Column - identPos.Column
		if bestIdent == nil || nodeSpan < bestNodeSpan {
			bestIdent = ident
			bestNodeSpan = nodeSpan
		}
	}
	return bestIdent
}

// defIdentFor returns the identifier where the given object is defined.
func (r *compileResult) defIdentFor(obj types.Object) *gopast.Ident {
	if obj == nil {
		return nil
	}
	for ident, o := range r.typeInfo.Defs {
		if o == obj {
			return ident
		}
	}
	return nil
}

// refIdentsFor returns all identifiers where the given object is referenced.
func (r *compileResult) refIdentsFor(obj types.Object) []*gopast.Ident {
	if obj == nil {
		return nil
	}
	var idents []*gopast.Ident
	for ident, o := range r.typeInfo.Uses {
		if o == obj {
			idents = append(idents, ident)
		}
	}
	return idents
}

// selectorTypeNameForIdent returns the selector type name for the given
// identifier. It returns empty string if no selector can be inferred.
func (r *compileResult) selectorTypeNameForIdent(ident *gopast.Ident) string {
	astFile := r.nodeASTFile(ident)
	if astFile == nil {
		return ""
	}

	if path, _ := util.PathEnclosingInterval(astFile, ident.Pos(), ident.End()); len(path) > 0 {
		for _, node := range slices.Backward(path) {
			sel, ok := node.(*gopast.SelectorExpr)
			if !ok {
				continue
			}
			tv, ok := r.typeInfo.Types[sel.X]
			if !ok {
				continue
			}

			switch typ := unwrapPointerType(tv.Type).(type) {
			case *types.Named:
				obj := typ.Obj()
				typeName := obj.Name()
				if isSpxPkgObject(obj) && typeName == "SpriteImpl" {
					typeName = "Sprite"
				}
				return typeName
			case *types.Interface:
				if typ.String() == "interface{}" {
					return ""
				}
				return typ.String()
			}
		}
	}

	obj := r.typeInfo.ObjectOf(ident)
	if obj == nil || obj.Pkg() == nil {
		return ""
	}
	if isSpxPkgObject(obj) {
		astFileScope := r.typeInfo.Scopes[astFile]
		innermostScope := r.innermostScopeAt(ident.Pos())
		if innermostScope == astFileScope {
			spxFile := r.nodeFilename(ident)
			if spxFile == r.mainSpxFile {
				return "Game"
			}
			return "Sprite"
		}
	}
	switch obj := obj.(type) {
	case *types.Var:
		if !obj.IsField() {
			return ""
		}

		for _, def := range r.typeInfo.Defs {
			if def == nil {
				continue
			}
			named, ok := unwrapPointerType(def.Type()).(*types.Named)
			if !ok || named.Obj().Pkg() != obj.Pkg() || !isNamedStructType(named) {
				continue
			}

			var typeName string
			walkStruct(named, func(member types.Object, selector *types.Named) bool {
				if field, ok := member.(*types.Var); ok && field == obj {
					typeName = selector.Obj().Name()
					return false
				}
				return true
			})
			if isSpxPkgObject(obj) && typeName == "SpriteImpl" {
				typeName = "Sprite"
			}
			if typeName != "" {
				return typeName
			}
		}
	case *types.Func:
		recv := obj.Type().(*types.Signature).Recv()
		if recv == nil {
			return ""
		}

		switch typ := unwrapPointerType(recv.Type()).(type) {
		case *types.Named:
			obj := typ.Obj()
			typeName := obj.Name()
			if isSpxPkgObject(obj) && typeName == "SpriteImpl" {
				typeName = "Sprite"
			}
			return typeName
		case *types.Interface:
			if typ.String() == "interface{}" {
				return ""
			}
			return typ.String()
		}
	}
	return ""
}

// isDefinedInFirstVarBlock reports whether the given object is defined in the
// first var block of an AST file.
func (r *compileResult) isDefinedInFirstVarBlock(obj types.Object) bool {
	defIdent := r.defIdentFor(obj)
	if defIdent == nil {
		return false
	}
	astFile := r.nodeASTFile(defIdent)
	if astFile == nil {
		return false
	}
	firstVarBlock := r.firstVarBlocks[astFile]
	if firstVarBlock == nil {
		return false
	}
	return defIdent.Pos() >= firstVarBlock.Pos() && defIdent.End() <= firstVarBlock.End()
}

// spxDefinitionsFor returns all spx definitions for the given object. It
// returns multiple definitions only if the object is a Go+ overloadable
// function.
func (r *compileResult) spxDefinitionsFor(obj types.Object, selectorTypeName string) []SpxDefinition {
	if obj == nil {
		return nil
	}
	if isBuiltinObject(obj) {
		return []SpxDefinition{GetSpxDefinitionForBuiltinObj(obj)}
	}

	var pkgDoc *pkgdoc.PkgDoc
	if pkgPath := obj.Pkg().Path(); pkgPath == "main" {
		pkgDoc = r.mainPkgDoc
	} else {
		pkgDoc, _ = pkgdata.GetPkgDoc(pkgPath)
	}

	switch obj := obj.(type) {
	case *types.Var:
		return []SpxDefinition{GetSpxDefinitionForVar(obj, selectorTypeName, r.isDefinedInFirstVarBlock(obj), pkgDoc)}
	case *types.Const:
		return []SpxDefinition{GetSpxDefinitionForConst(obj, pkgDoc)}
	case *types.TypeName:
		return []SpxDefinition{GetSpxDefinitionForType(obj, pkgDoc)}
	case *types.Func:
		if funcDecl, ok := r.mainASTPkgIdentToFuncDecl[r.defIdentFor(obj)]; ok && funcDecl.Shadow {
			return nil
		}
		if isUnexpandableGopOverloadableFunc(obj) {
			return nil
		}
		if funcOverloads := expandGopOverloadableFunc(obj); funcOverloads != nil {
			defs := make([]SpxDefinition, 0, len(funcOverloads))
			for _, funcOverload := range funcOverloads {
				defs = append(defs, GetSpxDefinitionForFunc(funcOverload, selectorTypeName, pkgDoc))
			}
			return defs
		}
		return []SpxDefinition{GetSpxDefinitionForFunc(obj, selectorTypeName, pkgDoc)}
	case *types.PkgName:
		return []SpxDefinition{GetSpxDefinitionForPkg(obj, pkgDoc)}
	}
	return nil
}

// spxDefinitionsForIdent returns all spx definitions for the given identifier.
// It returns multiple definitions only if the identifier is a Go+ overloadable
// function.
func (r *compileResult) spxDefinitionsForIdent(ident *gopast.Ident) []SpxDefinition {
	return r.spxDefinitionsFor(r.typeInfo.ObjectOf(ident), r.selectorTypeNameForIdent(ident))
}

// spxDefinitionsForNamedStruct returns all spx definitions for the given named
// struct type.
func (r *compileResult) spxDefinitionsForNamedStruct(named *types.Named) (defs []SpxDefinition) {
	if defsIface, ok := r.computedCache.spxDefinitionsForNamedStructs.Load(named); ok {
		return defsIface.([]SpxDefinition)
	}
	defer func() {
		r.computedCache.spxDefinitionsForNamedStructs.Store(named, slices.Clip(defs))
	}()

	walkStruct(named, func(member types.Object, selector *types.Named) bool {
		defs = append(defs, r.spxDefinitionsFor(member, selector.Obj().Name())...)
		return true
	})
	return
}

// isInSpxEventHandler checks if the given position is inside an spx event
// handler callback.
func (r *compileResult) isInSpxEventHandler(pos goptoken.Pos) bool {
	astFile := r.posASTFile(pos)
	if astFile == nil {
		return false
	}

	path, _ := util.PathEnclosingInterval(astFile, pos-1, pos)
	for _, node := range path {
		callExpr, ok := node.(*gopast.CallExpr)
		if !ok || len(callExpr.Args) == 0 {
			continue
		}
		funcIdent, ok := callExpr.Fun.(*gopast.Ident)
		if !ok {
			continue
		}
		funcObj := r.typeInfo.ObjectOf(funcIdent)
		if !isSpxPkgObject(funcObj) {
			continue
		}

		if isSpxEventHandlerFuncName(funcIdent.Name) {
			return true
		}
	}
	return false
}

// spxResourceRefAtASTFilePosition returns the spx resource reference at the
// given position in the given AST file.
func (r *compileResult) spxResourceRefAtASTFilePosition(astFile *gopast.File, position Position) *SpxResourceRef {
	spxFile := r.nodeFilename(astFile)
	line := int(position.Line) + 1
	column := int(position.Character) + 1

	var (
		bestRef      *SpxResourceRef
		bestNodeSpan int
	)
	for _, ref := range r.spxResourceRefs {
		nodePos := r.fset.Position(ref.Node.Pos())
		nodeEnd := r.fset.Position(ref.Node.End())
		if nodePos.Filename != spxFile ||
			line != nodePos.Line ||
			column < nodePos.Column ||
			column > nodeEnd.Column {
			continue
		}

		nodeSpan := nodeEnd.Column - nodePos.Column
		if bestRef == nil || nodeSpan < bestNodeSpan {
			bestRef = &ref
			bestNodeSpan = nodeSpan
		}
	}
	return bestRef
}

// spxImportsAtASTFilePosition returns the import at the given position in the given AST file.
func (r *compileResult) spxImportsAtASTFilePosition(astFile *gopast.File, position Position) *SpxReferencePkg {
	spxFile := r.nodeFilename(astFile)
	line := int(position.Line) + 1
	column := int(position.Character) + 1

	var rpkg *SpxReferencePkg

	for _, imp := range astFile.Imports {
		nodePos := r.fset.Position(imp.Pos())
		nodeEnd := r.fset.Position(imp.End())
		if nodePos.Filename != spxFile ||
			line != nodePos.Line ||
			column < nodePos.Column ||
			column > nodeEnd.Column {
			continue
		}

		pkg := imp.Path.Value
		unquoted, err := strconv.Unquote(pkg)
		if err != nil {
			continue
		}
		pkgDoc, err := pkgdata.GetPkgDoc(unquoted)
		if err != nil {
			continue
		}
		rpkg = &SpxReferencePkg{
			Pkg:     pkgDoc,
			PkgPath: pkg,
			Node:    imp,
		}
	}
	return rpkg
}

// addSpxResourceRef adds an spx resource reference to the compile result.
func (r *compileResult) addSpxResourceRef(ref SpxResourceRef) {
	if r.seenSpxResourceRefs == nil {
		r.seenSpxResourceRefs = make(map[SpxResourceRef]struct{})
	}

	if _, ok := r.seenSpxResourceRefs[ref]; ok {
		return
	}
	r.seenSpxResourceRefs[ref] = struct{}{}

	r.spxResourceRefs = append(r.spxResourceRefs, ref)
}

// addDiagnostics adds diagnostics to the compile result.
func (r *compileResult) addDiagnostics(documentURI DocumentURI, diags ...Diagnostic) {
	if r.seenDiagnostics == nil {
		r.seenDiagnostics = make(map[DocumentURI]map[string]struct{})
	}
	seenDiagnostics := r.seenDiagnostics[documentURI]
	if seenDiagnostics == nil {
		seenDiagnostics = make(map[string]struct{})
		r.seenDiagnostics[documentURI] = seenDiagnostics
	}

	r.diagnostics[documentURI] = slices.Grow(r.diagnostics[documentURI], len(diags))
	for _, diag := range diags {
		fingerprint := fmt.Sprintf("%d\n%v\n%s", diag.Severity, diag.Range, diag.Message)
		if _, ok := seenDiagnostics[fingerprint]; ok {
			continue
		}
		seenDiagnostics[fingerprint] = struct{}{}

		r.diagnostics[documentURI] = append(r.diagnostics[documentURI], diag)
		if diag.Severity == SeverityError {
			r.hasErrorSeverityDiagnostic = true
		}
	}
}

// addDiagnosticsForSpxFile adds diagnostics to the compile result for the given
// spx file.
func (r *compileResult) addDiagnosticsForSpxFile(spxFile string, diags ...Diagnostic) {
	r.addDiagnostics(r.documentURIs[spxFile], diags...)
}

// posFilename returns the filename for the given position.
func (r *compileResult) posFilename(pos goptoken.Pos) string {
	return r.fset.Position(pos).Filename
}

// nodeFilename returns the filename for the given node.
func (r *compileResult) nodeFilename(node gopast.Node) string {
	return r.posFilename(node.Pos())
}

// posASTFile returns the AST file for the given position.
func (r *compileResult) posASTFile(pos goptoken.Pos) *gopast.File {
	return r.mainASTPkg.Files[r.posFilename(pos)]
}

// nodeASTFile returns the AST file for the given node.
func (r *compileResult) nodeASTFile(node gopast.Node) *gopast.File {
	return r.posASTFile(node.Pos())
}

// posDocumentURI returns the [DocumentURI] for the given position.
func (r *compileResult) posDocumentURI(pos goptoken.Pos) DocumentURI {
	return r.documentURIs[r.posFilename(pos)]
}

// nodeDocumentURI returns the [DocumentURI] for the given node.
func (r *compileResult) nodeDocumentURI(node gopast.Node) DocumentURI {
	return r.posDocumentURI(node.Pos())
}

// rangeForPos returns the [Range] for the given position.
func (r *compileResult) rangeForPos(pos goptoken.Pos) Range {
	return RangeForGopTokenPosition(r.fset.Position(pos))
}

// rangeForNode returns the [Range] for the given node.
func (r *compileResult) rangeForNode(node gopast.Node) Range {
	return Range{
		Start: FromGopTokenPosition(r.fset.Position(node.Pos())),
		End:   FromGopTokenPosition(r.fset.Position(node.End())),
	}
}

// locationForPos returns the [Location] for the given position.
func (r *compileResult) locationForPos(pos goptoken.Pos) Location {
	return Location{
		URI:   r.documentURIs[r.posFilename(pos)],
		Range: r.rangeForPos(pos),
	}
}

// locationForNode returns the [Location] for the given node.
func (r *compileResult) locationForNode(node gopast.Node) Location {
	return Location{
		URI:   r.documentURIs[r.nodeFilename(node)],
		Range: r.rangeForNode(node),
	}
}

// compileCache represents a cache for compilation results.
type compileCache struct {
	result          *compileResult
	spxFileModTimes map[string]time.Time
}

// compile compiles spx source files and returns compile result. It uses cached
// result if available.
func (s *Server) compile() (*compileResult, error) {
	snapshot := s.workspaceRootFS.Snapshot()
	spxFiles, err := listSpxFiles(snapshot)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx files: %w", err)
	}
	if len(spxFiles) == 0 {
		return nil, errNoMainSpxFile
	}
	slices.Sort(spxFiles)

	s.lastCompileCacheMu.Lock()
	defer s.lastCompileCacheMu.Unlock()

	// Try to use cache first.
	if cache := s.lastCompileCache; cache != nil {
		// Check if spx file set has changed.
		cachedSpxFiles := slices.Sorted(maps.Keys(cache.spxFileModTimes))
		if slices.Equal(spxFiles, cachedSpxFiles) {
			// Check if any spx file has been modified.
			modified := false
			for _, spxFile := range spxFiles {
				fi, err := fs.Stat(snapshot, spxFile)
				if err != nil {
					return nil, fmt.Errorf("failed to stat file %q: %w", spxFile, err)
				}
				if cachedModTime, ok := cache.spxFileModTimes[spxFile]; !ok || !fi.ModTime().Equal(cachedModTime) {
					modified = true
					break
				}
			}
			if !modified {
				return cache.result, nil
			}
		}
	}

	// Compile at the given snapshot if cache is not used.
	result, err := s.compileAt(snapshot)
	if err != nil {
		return nil, err
	}

	// Update cache.
	modTimes := make(map[string]time.Time, len(spxFiles))
	for _, spxFile := range spxFiles {
		fi, err := fs.Stat(snapshot, spxFile)
		if err != nil {
			return nil, fmt.Errorf("failed to stat file %q: %w", spxFile, err)
		}
		modTimes[spxFile] = fi.ModTime()
	}
	s.lastCompileCache = &compileCache{
		result:          result,
		spxFileModTimes: modTimes,
	}

	return result, nil
}

// compileAt compiles spx source files at the given snapshot and returns the
// compile result.
func (s *Server) compileAt(snapshot *vfs.MapFS) (*compileResult, error) {
	spxFiles, err := listSpxFiles(snapshot)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx files: %w", err)
	}
	if len(spxFiles) == 0 {
		return nil, errNoMainSpxFile
	}

	var (
		result      = newCompileResult()
		gpfs        = vfs.NewGopParserFS(snapshot)
		spriteNames = make([]string, 0, len(spxFiles)-1)
	)
	for _, spxFile := range spxFiles {
		documentURI := s.toDocumentURI(spxFile)
		result.diagnostics[documentURI] = []Diagnostic{}
		result.documentURIs[spxFile] = documentURI

		var (
			astFile *gopast.File
			err     error
		)
		func() {
			defer func() {
				if r := recover(); r != nil {
					err = fmt.Errorf("parser panic: %v", r)
				}
			}()
			astFile, err = gopparser.ParseFSEntry(result.fset, gpfs, spxFile, nil, gopparser.Config{
				Mode: gopparser.ParseComments | gopparser.AllErrors | gopparser.ParseGoPlusClass,
			})
		}()
		if err != nil {
			var (
				parseErr gopscanner.ErrorList
				codeErr  *gogen.CodeError
			)
			if errors.As(err, &parseErr) {
				// Handle parse errors.
				for _, e := range parseErr {
					result.addDiagnostics(documentURI, Diagnostic{
						Severity: SeverityError,
						Range:    RangeForGopTokenPosition(e.Pos),
						Message:  e.Msg,
					})
				}
			} else if errors.As(err, &codeErr) {
				// Handle code generation errors.
				result.addDiagnostics(documentURI, Diagnostic{
					Severity: SeverityError,
					Range:    result.rangeForPos(codeErr.Pos),
					Message:  codeErr.Error(),
				})
			} else {
				// Handle unknown errors (including recovered panics).
				result.addDiagnostics(documentURI, Diagnostic{
					Severity: SeverityError,
					Message:  fmt.Sprintf("failed to parse spx file: %v", err),
				})
			}
		}
		if astFile == nil {
			continue
		}
		if astFile.Name.Name != "main" {
			result.addDiagnostics(documentURI, Diagnostic{
				Severity: SeverityError,
				Range:    result.rangeForNode(astFile.Name),
				Message:  "package name must be main",
			})
			continue
		}

		result.mainASTPkg.Files[spxFile] = astFile
		if spxFileBaseName := path.Base(spxFile); spxFileBaseName == "main.spx" {
			result.mainSpxFile = spxFile
		} else {
			spriteNames = append(spriteNames, strings.TrimSuffix(spxFileBaseName, ".spx"))
		}

		for _, decl := range astFile.Decls {
			switch decl := decl.(type) {
			case *gopast.GenDecl:
				for _, spec := range decl.Specs {
					result.mainASTPkgSpecToGenDecl[spec] = decl
				}

				if result.firstVarBlocks[astFile] == nil && decl.Tok == goptoken.VAR {
					result.firstVarBlocks[astFile] = decl
				}
			case *gopast.FuncDecl:
				result.mainASTPkgIdentToFuncDecl[decl.Name] = decl
			}
		}
	}
	if result.mainSpxFile == "" {
		if len(result.diagnostics) == 0 {
			return nil, errNoMainSpxFile
		}
		return result, nil
	}

	result.mainPkgDoc = pkgdoc.NewForSpxMainPackage(result.mainASTPkg)

	mod := gopmod.New(gopmodload.Default)
	if err := mod.ImportClasses(); err != nil {
		return nil, fmt.Errorf("failed to import classes: %w", err)
	}
	if err := goptypesutil.NewChecker(
		&types.Config{
			Error: func(err error) {
				if typeErr, ok := err.(types.Error); ok {
					position := typeErr.Fset.Position(typeErr.Pos)
					result.addDiagnosticsForSpxFile(position.Filename, Diagnostic{
						Severity: SeverityError,
						Range:    RangeForGopTokenPosition(position),
						Message:  typeErr.Msg,
					})
				}
			},
			Importer: internal.Importer,
		},
		&goptypesutil.Config{
			Types: result.mainPkg,
			Fset:  result.fset,
			Mod:   mod,
		},
		nil,
		result.typeInfo,
	).Files(nil, slices.Collect(maps.Values(result.mainASTPkg.Files))); err != nil {
		// Errors should be handled by the type checker.
	}

	if obj := result.mainPkg.Scope().Lookup("Game"); obj != nil {
		result.mainPkgGameType = obj.Type().(*types.Named)
	}

	result.mainPkgSpriteTypes = make([]*types.Named, 0, len(spriteNames))
	for _, spxSpriteName := range spriteNames {
		if obj := result.mainPkg.Scope().Lookup(spxSpriteName); obj != nil {
			result.mainPkgSpriteTypes = append(result.mainPkgSpriteTypes, obj.Type().(*types.Named))
		}
	}

	s.inspectForSpxResourceSet(snapshot, result)
	s.inspectForSpxResourceRefs(result)
	s.inspectDiagnosticsAnalyzers(result)

	return result, nil
}

// compileAndGetASTFileForDocumentURI handles common compilation and file
// retrieval logic for a given document URI. The returned astFile is probably
// nil even if the compilation succeeded.
func (s *Server) compileAndGetASTFileForDocumentURI(uri DocumentURI) (result *compileResult, spxFile string, astFile *gopast.File, err error) {
	spxFile, err = s.fromDocumentURI(uri)
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to get file path from document URI %q: %w", uri, err)
	}
	if path.Ext(spxFile) != ".spx" {
		return nil, "", nil, fmt.Errorf("file %q does not have .spx extension", spxFile)
	}
	result, err = s.compile()
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to compile: %w", err)
	}
	astFile = result.mainASTPkg.Files[spxFile]
	return
}

// inspectForSpxResourceSet inspects for spx resource set in main.spx.
func (s *Server) inspectForSpxResourceSet(snapshot *vfs.MapFS, result *compileResult) {
	var spxResourceRootDir string
	gopast.Inspect(result.mainASTPkg.Files[result.mainSpxFile], func(node gopast.Node) bool {
		callExpr, ok := node.(*gopast.CallExpr)
		if !ok {
			return true
		}
		ident, ok := callExpr.Fun.(*gopast.Ident)
		if !ok || ident.Name != "run" {
			return true
		}

		if len(callExpr.Args) == 0 {
			return true
		}
		firstArg := callExpr.Args[0]
		firstArgTV, ok := result.typeInfo.Types[firstArg]
		if !ok {
			return true
		}

		if types.AssignableTo(firstArgTV.Type, types.Typ[types.String]) {
			spxResourceRootDir, _ = getStringLitOrConstValue(firstArg, firstArgTV)
		} else {
			result.addDiagnosticsForSpxFile(result.mainSpxFile, Diagnostic{
				Severity: SeverityError,
				Range:    result.rangeForNode(firstArg),
				Message:  "first argument of run must be a string literal or constant",
			})
		}
		return false
	})
	if spxResourceRootDir == "" {
		spxResourceRootDir = "assets"
	}
	spxResourceRootFS, _ := fs.Sub(snapshot, spxResourceRootDir)

	spxResourceSet, err := NewSpxResourceSet(spxResourceRootFS)
	if err != nil {
		result.addDiagnosticsForSpxFile(result.mainSpxFile, Diagnostic{
			Severity: SeverityError,
			Message:  fmt.Sprintf("failed to create spx resource set: %v", err),
		})
		return
	}
	result.spxResourceSet = *spxResourceSet
}

// inspectDiagnosticsAnalyzers runs registered analyzers on each spx source file
// and collects diagnostics.
//
// For each spx file in the main package, it:
// 1. Creates an analysis pass with file-specific information
// 2. Runs all registered analyzers on the file
// 3. Collects diagnostics from analyzers
// 4. Reports any analyzer errors as diagnostics
//
// Parameters:
//   - result: The compilation result containing AST and type information
//
// The function updates result.diagnostics with any issues found by analyzers.
// Diagnostic severity levels include:
//   - Error: For analyzer failures or serious code issues
//   - Warning: For potential problems that don't prevent compilation
func (s *Server) inspectDiagnosticsAnalyzers(result *compileResult) {

	for spxFile, astFile := range result.mainASTPkg.Files {

		var diagnostics []Diagnostic
		pass := &protocol.Pass{
			Fset:      result.fset,
			Files:     []*gopast.File{astFile},
			TypesInfo: result.typeInfo,
			Report: func(d protocol.Diagnostic) {
				diagnostics = append(diagnostics, Diagnostic{
					Range:    result.rangeForPos(d.Pos),
					Severity: SeverityError,
					Message:  d.Message,
				})
			},
			ResultOf: map[*protocol.Analyzer]any{
				inspect.Analyzer: inspector.New([]*gopast.File{astFile}),
			},
		}

		for _, analyzer := range s.analyzers {
			an := analyzer.Analyzer()
			if _, err := an.Run(pass); err != nil {
				diagnostics = append(diagnostics, Diagnostic{
					Severity: SeverityError,
					Message:  fmt.Sprintf("analyzer %q failed: %v", an.Name, err),
				})
			}
		}

		result.addDiagnosticsForSpxFile(spxFile, diagnostics...)
	}
}

// inspectForSpxResourceRefs inspects for spx resource references in the code.
func (s *Server) inspectForSpxResourceRefs(result *compileResult) {
	mainSpxFileScope := result.typeInfo.Scopes[result.mainASTPkg.Files[result.mainSpxFile]]

	// Check all identifier definitions.
	for ident, obj := range result.typeInfo.Defs {
		switch obj.(type) {
		case *types.Const, *types.Var:
			if ident.Obj == nil {
				break
			}
			valueSpec, ok := ident.Obj.Decl.(*gopast.ValueSpec)
			if !ok {
				break
			}
			idx := slices.Index(valueSpec.Names, ident)
			if idx < 0 || idx >= len(valueSpec.Values) {
				break
			}
			expr := valueSpec.Values[idx]

			s.inspectSpxResourceRefForTypeAtExpr(result, expr, unwrapPointerType(obj.Type()), nil)
		}

		v, ok := obj.(*types.Var)
		if !ok {
			continue
		}
		varType, ok := v.Type().(*types.Named)
		if !ok {
			continue
		}

		spxFile := result.nodeFilename(ident)
		if spxFile != result.mainSpxFile || result.innermostScopeAt(ident.Pos()) != mainSpxFileScope {
			continue
		}

		var (
			isSpxSoundResourceAutoBinding  bool
			isSpxSpriteResourceAutoBinding bool
		)
		switch varType {
		case GetSpxSoundType():
			isSpxSoundResourceAutoBinding = result.spxResourceSet.Sound(v.Name()) != nil
		case GetSpxSpriteType():
			isSpxSpriteResourceAutoBinding = result.spxResourceSet.Sprite(v.Name()) != nil
		default:
			isSpxSpriteResourceAutoBinding = v.Name() == varType.Obj().Name() && slices.Contains(result.mainPkgSpriteTypes, varType)
		}
		if !isSpxSoundResourceAutoBinding && !isSpxSpriteResourceAutoBinding {
			continue
		}

		if !result.isDefinedInFirstVarBlock(obj) {
			result.addDiagnosticsForSpxFile(spxFile, Diagnostic{
				Severity: SeverityWarning,
				Range:    result.rangeForNode(ident),
				Message:  "resources must be defined in the first var block for auto-binding",
			})
			continue
		}

		switch {
		case isSpxSoundResourceAutoBinding:
			result.addSpxResourceRef(SpxResourceRef{
				ID:   SpxSoundResourceID{SoundName: ident.Name},
				Kind: SpxResourceRefKindAutoBinding,
				Node: ident,
			})
			result.spxSoundResourceAutoBindings[obj] = struct{}{}
		case isSpxSpriteResourceAutoBinding:
			result.addSpxResourceRef(SpxResourceRef{
				ID:   SpxSpriteResourceID{SpriteName: ident.Name},
				Kind: SpxResourceRefKindAutoBinding,
				Node: ident,
			})
			result.spxSpriteResourceAutoBindings[obj] = struct{}{}
		}
	}

	// Check all type-checked expressions.
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || !expr.Pos().IsValid() || tv.IsType() || tv.Type == nil {
			continue // Skip type identifiers.
		}

		switch expr := expr.(type) {
		case *gopast.CallExpr:
			funcTV, ok := result.typeInfo.Types[expr.Fun]
			if !ok {
				continue
			}
			funcSig, ok := funcTV.Type.(*types.Signature)
			if !ok {
				continue
			}

			var spxSpriteResource *SpxSpriteResource
			if recv := funcSig.Recv(); recv != nil {
				recvType := unwrapPointerType(recv.Type())
				switch recvType {
				case GetSpxSpriteType(), GetSpxSpriteImplType():
					spxSpriteResource = s.inspectSpxSpriteResourceRefAtExpr(result, expr, recvType)
				}
			}

			var lastParamType types.Type
			for i, arg := range expr.Args {
				var paramType types.Type
				if i < funcSig.Params().Len() {
					paramType = unwrapPointerType(funcSig.Params().At(i).Type())
					lastParamType = paramType
				} else {
					// Use the last parameter type for variadic functions.
					paramType = lastParamType
				}

				// Handle slice/array parameter types.
				if sliceType, ok := paramType.(*types.Slice); ok {
					paramType = unwrapPointerType(sliceType.Elem())
				} else if arrayType, ok := paramType.(*types.Array); ok {
					paramType = unwrapPointerType(arrayType.Elem())
				}

				if sliceLit, ok := arg.(*gopast.SliceLit); ok {
					for _, elt := range sliceLit.Elts {
						s.inspectSpxResourceRefForTypeAtExpr(result, elt, paramType, spxSpriteResource)
					}
				} else {
					s.inspectSpxResourceRefForTypeAtExpr(result, arg, paramType, spxSpriteResource)
				}
			}
		default:
			s.inspectSpxResourceRefForTypeAtExpr(result, expr, unwrapPointerType(tv.Type), nil)
		}
	}

	// Check all identifier uses.
	for ident, obj := range result.typeInfo.Uses {
		objType := unwrapPointerType(obj.Type())
		switch objType {
		case GetSpxSpriteType():
			if _, ok := result.spxSpriteResourceAutoBindings[obj]; ok {
				s.inspectSpxSpriteResourceRefAtExpr(result, ident, objType)
			}
		case GetSpxSoundType():
			if _, ok := result.spxSoundResourceAutoBindings[obj]; ok {
				s.inspectSpxSoundResourceRefAtExpr(result, ident, objType)
			}
		case GetSpxBackdropNameType(),
			GetSpxSpriteNameType(),
			GetSpxSoundNameType(),
			GetSpxWidgetNameType():
			astFile := result.nodeASTFile(ident)
			if astFile == nil {
				continue
			}

			path, _ := util.PathEnclosingInterval(astFile, ident.Pos(), ident.End())
			for _, node := range path {
				assignStmt, ok := node.(*gopast.AssignStmt)
				if !ok {
					continue
				}

				idx := slices.IndexFunc(assignStmt.Lhs, func(lhs gopast.Expr) bool {
					return lhs == ident
				})
				if idx < 0 || idx >= len(assignStmt.Rhs) {
					continue
				}
				expr := assignStmt.Rhs[idx]

				s.inspectSpxResourceRefForTypeAtExpr(result, expr, objType, nil)
				break
			}
		}
	}

	// Check all implicit objects.
	for node, obj := range result.typeInfo.Implicits {
		objType := unwrapPointerType(obj.Type())
		switch objType {
		case GetSpxSpriteType(), GetSpxSpriteImplType():
			if typeAssert, ok := node.(*gopast.TypeAssertExpr); ok {
				s.inspectSpxSpriteResourceRefAtExpr(result, typeAssert, objType)
			}
		}
	}

	// Check all selections.
	for sel, selection := range result.typeInfo.Selections {
		recvType := unwrapPointerType(selection.Recv())

		var spxSpriteResource *SpxSpriteResource
		switch recvType {
		case GetSpxSpriteType(), GetSpxSpriteImplType():
			spxSpriteResource = s.inspectSpxSpriteResourceRefAtExpr(result, sel.X, recvType)
		}
		if spxSpriteResource != nil {
			s.inspectSpxResourceRefForTypeAtExpr(result, sel, unwrapPointerType(selection.Type()), spxSpriteResource)
		}
	}
}

// inspectSpxResourceRefForTypeAtExpr inspects an spx resource reference for a
// given type at an expression.
func (s *Server) inspectSpxResourceRefForTypeAtExpr(result *compileResult, expr gopast.Expr, typ types.Type, spxSpriteResource *SpxSpriteResource) {
	switch typ {
	case GetSpxBackdropNameType():
		s.inspectSpxBackdropResourceRefAtExpr(result, expr, typ)
	case GetSpxSpriteNameType(), GetSpxSpriteType():
		s.inspectSpxSpriteResourceRefAtExpr(result, expr, typ)
	case GetSpxSpriteCostumeNameType():
		if spxSpriteResource != nil {
			s.inspectSpxSpriteCostumeResourceRefAtExpr(result, spxSpriteResource, expr, typ)
		}
	case GetSpxSpriteAnimationNameType():
		if spxSpriteResource != nil {
			s.inspectSpxSpriteAnimationResourceRefAtExpr(result, spxSpriteResource, expr, typ)
		}
	case GetSpxSoundNameType(), GetSpxSoundType():
		s.inspectSpxSoundResourceRefAtExpr(result, expr, typ)
	case GetSpxWidgetNameType():
		s.inspectSpxWidgetResourceRefAtExpr(result, expr, typ)
	}
}

// inspectSpxBackdropResourceRefAtExpr inspects an spx backdrop resource
// reference at an expression. It returns the spx backdrop resource if it was
// successfully retrieved.
func (s *Server) inspectSpxBackdropResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxBackdropResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	spxBackdropName, ok := getStringLitOrConstValue(expr, exprTV)
	if !ok {
		return nil
	}
	if spxBackdropName == "" {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  "backdrop resource name cannot be empty",
		})
		return nil
	}
	spxResourceRefKind := SpxResourceRefKindStringLiteral
	if _, ok := expr.(*gopast.Ident); ok {
		spxResourceRefKind = SpxResourceRefKindConstantReference
	}
	result.addSpxResourceRef(SpxResourceRef{
		ID:   SpxBackdropResourceID{BackdropName: spxBackdropName},
		Kind: spxResourceRefKind,
		Node: expr,
	})

	spxBackdropResource := result.spxResourceSet.Backdrop(spxBackdropName)
	if spxBackdropResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("backdrop resource %q not found", spxBackdropName),
		})
		return nil
	}
	return spxBackdropResource
}

// inspectSpxSpriteResourceRefAtExpr inspects an spx sprite resource reference
// at an expression. It returns the spx sprite resource if it was successfully
// retrieved.
func (s *Server) inspectSpxSpriteResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxSpriteResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	var spxSpriteName string
	if callExpr, ok := expr.(*gopast.CallExpr); ok {
		switch fun := callExpr.Fun.(type) {
		case *gopast.Ident:
			spxSpriteName = strings.TrimSuffix(path.Base(result.nodeFilename(callExpr)), ".spx")
		case *gopast.SelectorExpr:
			if ident, ok := fun.X.(*gopast.Ident); ok {
				exprRange = result.rangeForNode(ident)

				obj := result.typeInfo.ObjectOf(ident)
				if obj != nil {
					if _, ok := result.spxSpriteResourceAutoBindings[obj]; !ok {
						return nil
					}
					spxSpriteName = obj.Name()
					result.addSpxResourceRef(SpxResourceRef{
						ID:   SpxSpriteResourceID{SpriteName: spxSpriteName},
						Kind: SpxResourceRefKindAutoBindingReference,
						Node: ident,
					})
				}
			}
		}
		if spxSpriteName == "" {
			result.addDiagnostics(exprDocumentURI, Diagnostic{
				Severity: SeverityError,
				Range:    exprRange,
				Message:  "sprite resource name cannot be empty",
			})
			return nil
		}
	} else {
		var typ types.Type
		if declaredType != nil {
			typ = declaredType
		} else {
			typ = exprTV.Type
		}

		var spxResourceRefKind SpxResourceRefKind
		switch typ {
		case GetSpxSpriteNameType():
			var ok bool
			spxSpriteName, ok = getStringLitOrConstValue(expr, exprTV)
			if !ok {
				return nil
			}
			spxResourceRefKind = SpxResourceRefKindStringLiteral
			if _, ok := expr.(*gopast.Ident); ok {
				spxResourceRefKind = SpxResourceRefKindConstantReference
			}
		case GetSpxSpriteType():
			ident, ok := expr.(*gopast.Ident)
			if !ok {
				return nil
			}
			obj := result.typeInfo.ObjectOf(ident)
			if obj == nil {
				return nil
			}
			if _, ok := result.spxSpriteResourceAutoBindings[obj]; !ok {
				return nil
			}
			spxSpriteName = obj.Name()
			spxResourceRefKind = SpxResourceRefKindAutoBindingReference
		default:
			return nil
		}
		if spxSpriteName == "" {
			result.addDiagnostics(exprDocumentURI, Diagnostic{
				Severity: SeverityError,
				Range:    exprRange,
				Message:  "sprite resource name cannot be empty",
			})
			return nil
		}
		result.addSpxResourceRef(SpxResourceRef{
			ID:   SpxSpriteResourceID{SpriteName: spxSpriteName},
			Kind: spxResourceRefKind,
			Node: expr,
		})
	}

	spxSpriteResource := result.spxResourceSet.Sprite(spxSpriteName)
	if spxSpriteResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("sprite resource %q not found", spxSpriteName),
		})
		return nil
	}
	return spxSpriteResource
}

// inspectSpxSpriteCostumeResourceRefAtExpr inspects an spx sprite costume
// resource reference at an expression. It returns the spx sprite costume
// resource if it was successfully retrieved.
func (s *Server) inspectSpxSpriteCostumeResourceRefAtExpr(result *compileResult, spxSpriteResource *SpxSpriteResource, expr gopast.Expr, declaredType types.Type) *SpxSpriteCostumeResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	var typ types.Type
	if declaredType != nil {
		typ = declaredType
	} else {
		typ = exprTV.Type
	}

	var (
		spxSpriteCostumeName string
		spxResourceRefKind   SpxResourceRefKind
	)
	switch typ {
	case GetSpxSpriteCostumeNameType():
		var ok bool
		spxSpriteCostumeName, ok = getStringLitOrConstValue(expr, exprTV)
		if !ok {
			return nil
		}
		spxResourceRefKind = SpxResourceRefKindStringLiteral
		if _, ok := expr.(*gopast.Ident); ok {
			spxResourceRefKind = SpxResourceRefKindConstantReference
		}
	default:
		return nil
	}
	if spxSpriteCostumeName == "" {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  "sprite costume resource name cannot be empty",
		})
		return nil
	}
	result.addSpxResourceRef(SpxResourceRef{
		ID:   SpxSpriteCostumeResourceID{SpriteName: spxSpriteResource.Name, CostumeName: spxSpriteCostumeName},
		Kind: spxResourceRefKind,
		Node: expr,
	})

	spxSpriteCostumeResource := spxSpriteResource.Costume(spxSpriteCostumeName)
	if spxSpriteCostumeResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("costume resource %q not found in sprite %q", spxSpriteCostumeName, spxSpriteResource.Name),
		})
		return nil
	}
	return spxSpriteCostumeResource
}

// inspectSpxSpriteAnimationResourceRefAtExpr inspects an spx sprite animation
// resource reference at an expression. It returns the spx sprite animation
// resource if it was successfully retrieved.
func (s *Server) inspectSpxSpriteAnimationResourceRefAtExpr(result *compileResult, spxSpriteResource *SpxSpriteResource, expr gopast.Expr, declaredType types.Type) *SpxSpriteAnimationResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	var typ types.Type
	if declaredType != nil {
		typ = declaredType
	} else {
		typ = exprTV.Type
	}

	var (
		spxSpriteAnimationName string
		spxResourceRefKind     SpxResourceRefKind
	)
	switch typ {
	case GetSpxSpriteAnimationNameType():
		var ok bool
		spxSpriteAnimationName, ok = getStringLitOrConstValue(expr, exprTV)
		if !ok {
			return nil
		}
		spxResourceRefKind = SpxResourceRefKindStringLiteral
		if _, ok := expr.(*gopast.Ident); ok {
			spxResourceRefKind = SpxResourceRefKindConstantReference
		}
	default:
		return nil
	}
	if spxSpriteAnimationName == "" {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  "sprite animation resource name cannot be empty",
		})
		return nil
	}
	result.addSpxResourceRef(SpxResourceRef{
		ID:   SpxSpriteAnimationResourceID{SpriteName: spxSpriteResource.Name, AnimationName: spxSpriteAnimationName},
		Kind: spxResourceRefKind,
		Node: expr,
	})

	spxSpriteAnimationResource := spxSpriteResource.Animation(spxSpriteAnimationName)
	if spxSpriteAnimationResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("animation resource %q not found in sprite %q", spxSpriteAnimationName, spxSpriteResource.Name),
		})
		return nil
	}
	return spxSpriteAnimationResource
}

// inspectSpxSoundResourceRefAtExpr inspects an spx sound resource reference at
// an expression. It returns the spx sound resource if it was successfully
// retrieved.
func (s *Server) inspectSpxSoundResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxSoundResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	var typ types.Type
	if declaredType != nil {
		typ = declaredType
	} else {
		typ = exprTV.Type
	}

	var (
		spxSoundName       string
		spxResourceRefKind SpxResourceRefKind
	)
	switch typ {
	case GetSpxSoundNameType():
		var ok bool
		spxSoundName, ok = getStringLitOrConstValue(expr, exprTV)
		if !ok {
			return nil
		}
		spxResourceRefKind = SpxResourceRefKindStringLiteral
		if _, ok := expr.(*gopast.Ident); ok {
			spxResourceRefKind = SpxResourceRefKindConstantReference
		}
	case GetSpxSoundType():
		ident, ok := expr.(*gopast.Ident)
		if !ok {
			return nil
		}
		obj := result.typeInfo.ObjectOf(ident)
		if obj == nil {
			return nil
		}
		if _, ok := result.spxSoundResourceAutoBindings[obj]; !ok {
			return nil
		}
		spxSoundName = obj.Name()
		spxResourceRefKind = SpxResourceRefKindAutoBindingReference
	default:
		return nil
	}
	if spxSoundName == "" {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  "sound resource name cannot be empty",
		})
		return nil
	}
	result.addSpxResourceRef(SpxResourceRef{
		ID:   SpxSoundResourceID{SoundName: spxSoundName},
		Kind: spxResourceRefKind,
		Node: expr,
	})

	spxSoundResource := result.spxResourceSet.Sound(spxSoundName)
	if spxSoundResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("sound resource %q not found", spxSoundName),
		})
		return nil
	}
	return spxSoundResource
}

// inspectSpxWidgetResourceRefAtExpr inspects an spx widget resource reference
// at an expression. It returns the spx widget resource if it was successfully
// retrieved.
func (s *Server) inspectSpxWidgetResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxWidgetResource {
	exprDocumentURI := result.nodeDocumentURI(expr)
	exprRange := result.rangeForNode(expr)
	exprTV := result.typeInfo.Types[expr]

	var typ types.Type
	if declaredType != nil {
		typ = declaredType
	} else {
		typ = exprTV.Type
	}

	var (
		spxWidgetName      string
		spxResourceRefKind SpxResourceRefKind
	)
	switch typ {
	case GetSpxWidgetNameType():
		var ok bool
		spxWidgetName, ok = getStringLitOrConstValue(expr, exprTV)
		if !ok {
			return nil
		}
		spxResourceRefKind = SpxResourceRefKindStringLiteral
		if _, ok := expr.(*gopast.Ident); ok {
			spxResourceRefKind = SpxResourceRefKindConstantReference
		}
	default:
		return nil
	}
	if spxWidgetName == "" {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  "widget resource name cannot be empty",
		})
		return nil
	}
	result.addSpxResourceRef(SpxResourceRef{
		ID:   SpxWidgetResourceID{WidgetName: spxWidgetName},
		Kind: spxResourceRefKind,
		Node: expr,
	})

	spxWidgetResource := result.spxResourceSet.Widget(spxWidgetName)
	if spxWidgetResource == nil {
		result.addDiagnostics(exprDocumentURI, Diagnostic{
			Severity: SeverityError,
			Range:    exprRange,
			Message:  fmt.Sprintf("widget resource %q not found", spxWidgetName),
		})
		return nil
	}
	return spxWidgetResource
}
