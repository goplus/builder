package server

import (
	"errors"
	"fmt"
	"go/token"
	"go/types"
	"io/fs"
	"path"
	"slices"
	"sort"
	"strings"

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

const (
	spxPkgPath                     = "github.com/goplus/spx"
	spxEventSinksTypeName          = spxPkgPath + ".eventSinks"
	spxGameTypeName                = spxPkgPath + ".Game"
	spxBackdropNameTypeName        = spxPkgPath + ".BackdropName"
	spxSpriteTypeName              = spxPkgPath + ".Sprite"
	spxSpriteImplTypeName          = spxPkgPath + ".SpriteImpl"
	spxSpriteNameTypeName          = spxPkgPath + ".SpriteName"
	spxSpriteCostumeNameTypeName   = spxPkgPath + ".SpriteCostumeName"
	spxSpriteAnimationNameTypeName = spxPkgPath + ".SpriteAnimationName"
	spxSoundTypeName               = spxPkgPath + ".Sound"
	spxSoundNameTypeName           = spxPkgPath + ".SoundName"
	spxWidgetNameTypeName          = spxPkgPath + ".WidgetName"
)

var (
	errNoValidSpxFiles = errors.New("no valid spx files found in main package")
	errNoMainSpxFile   = errors.New("no valid main.spx file found in main package")
)

// compileResult contains the compile results and additional information from
// the compile process.
type compileResult struct {
	// fset is the source file set used for parsing the spx files.
	fset *goptoken.FileSet

	// mainPkg is the main package.
	mainPkg *types.Package

	// mainPkgFiles contains the main package files.
	mainPkgFiles map[string]*gopast.File

	// mainSpxFile is the main.spx file path.
	mainSpxFile string

	// spxPkg is the spx package.
	spxPkg *types.Package

	// typeInfo contains type information collected during the compile
	// process.
	typeInfo *goptypesutil.Info

	// spxResourceRefs stores spx resource references.
	spxResourceRefs map[SpxResourceRefKey][]SpxResourceRef

	// spxSoundResourceAutoBindings stores spx sound resource auto-bindings.
	spxSoundResourceAutoBindings []types.Object

	// spxSpriteResourceAutoBindings stores spx sprite resource auto-bindings.
	spxSpriteResourceAutoBindings []types.Object

	// diagnostics stores diagnostic messages for each document.
	diagnostics map[DocumentURI][]Diagnostic

	// hasErrorSeverityDiagnostic is true if the compile result has any
	// diagnostics with error severity.
	hasErrorSeverityDiagnostic bool
}

// innermostScope returns the innermost scope that contains the given position.
// It returns nil if not found.
func (r *compileResult) innermostScope(pos token.Pos) *types.Scope {
	var innermostScope *types.Scope
	for _, scope := range r.typeInfo.Scopes {
		if scope.Contains(pos) && (innermostScope == nil || innermostScope.Contains(scope.Pos())) {
			innermostScope = scope
		}
	}
	if innermostScope == nil {
		// Fallback to file scope as a last resort.
		innermostScope = r.typeInfo.Scopes[r.mainPkgFiles[r.fset.Position(pos).Filename]]
	}
	return innermostScope
}

// findDirectScopesAt returns all scopes that directly contain the position,
// meaning the scope contains the position but none of its children scopes do.
func (r *compileResult) findDirectScopesAt(pos token.Pos) []*types.Scope {
	// Collect all scopes containing the pos.
	var scopes []*types.Scope
	for _, scope := range r.typeInfo.Scopes {
		if scope.Contains(pos) {
			scopes = append(scopes, scope)
		}
	}

	// Sort from innermost to outermost.
	sort.Slice(scopes, func(i, j int) bool {
		return scopes[i].Pos() >= scopes[j].Pos() && scopes[i].End() <= scopes[j].End()
	})

	// Keep only scopes whose children don't contain the pos.
	return slices.DeleteFunc(scopes, func(scope *types.Scope) bool {
		for i := range scope.NumChildren() {
			if scope.Child(i).Contains(pos) {
				return true
			}
		}
		return false
	})
}

// objectAtFilePosition returns the object at the given position in the given file.
func (r *compileResult) objectAtFilePosition(astFile *gopast.File, position Position) types.Object {
	tokenPos := r.fset.Position(astFile.Pos())
	tokenPos.Line = int(position.Line) + 1
	tokenPos.Column = int(position.Character) + 1

	var obj types.Object
	gopast.Inspect(astFile, func(node gopast.Node) bool {
		ident, ok := node.(*gopast.Ident)
		if !ok {
			return true
		}
		identPos := r.fset.Position(ident.Pos())
		identEnd := r.fset.Position(ident.End())
		if tokenPos.Line != identPos.Line ||
			tokenPos.Column < identPos.Column ||
			tokenPos.Column > identEnd.Column {
			return true
		}

		obj = r.typeInfo.ObjectOf(ident)
		return obj == nil
	})
	return obj
}

// rangeTypeDecls iterates over all type declarations in the main package and
// calls the given function for each type declaration.
func (r *compileResult) rangeTypeDecls(f func(*gopast.TypeSpec, types.Object) error) error {
	for _, file := range r.mainPkgFiles {
		for _, decl := range file.Decls {
			typeDecl, ok := decl.(*gopast.GenDecl)
			if !ok || typeDecl.Tok != goptoken.TYPE {
				continue
			}

			for _, spec := range typeDecl.Specs {
				typeSpec, ok := spec.(*gopast.TypeSpec)
				if !ok {
					continue
				}
				typeName := r.typeInfo.ObjectOf(typeSpec.Name)
				if typeName == nil {
					continue
				}

				if err := f(typeSpec, typeName); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// addSpxResourceRef adds a spx resource reference to the compile result.
func (r *compileResult) addSpxResourceRef(refKey SpxResourceRefKey, node gopast.Node, kind SpxResourceRefKind) {
	if !slices.Contains(r.spxResourceRefs[refKey], SpxResourceRef{Node: node, Kind: kind}) {
		r.spxResourceRefs[refKey] = append(r.spxResourceRefs[refKey], SpxResourceRef{Node: node, Kind: kind})
	}
}

// addSpxSoundResourceAutoBinding adds a spx sound resource auto-binding to the
// compile result.
func (r *compileResult) addSpxSoundResourceAutoBinding(obj types.Object) {
	if !slices.Contains(r.spxSoundResourceAutoBindings, obj) {
		r.spxSoundResourceAutoBindings = append(r.spxSoundResourceAutoBindings, obj)
	}
}

// addSpxSpriteResourceAutoBinding adds a spx sprite resource auto-binding to the
// compile result.
func (r *compileResult) addSpxSpriteResourceAutoBinding(obj types.Object) {
	if !slices.Contains(r.spxSpriteResourceAutoBindings, obj) {
		r.spxSpriteResourceAutoBindings = append(r.spxSpriteResourceAutoBindings, obj)
	}
}

// addDiagnostics adds diagnostics to the compile result.
func (r *compileResult) addDiagnostics(documentURI DocumentURI, diags ...Diagnostic) {
	dedupedDiags := slices.DeleteFunc(diags, func(diag Diagnostic) bool {
		for _, existing := range r.diagnostics[documentURI] {
			if existing.Severity == diag.Severity &&
				existing.Range == diag.Range &&
				existing.Message == diag.Message {
				return true
			}
		}
		return false
	})
	if !r.hasErrorSeverityDiagnostic {
		for _, diag := range dedupedDiags {
			if diag.Severity == SeverityError {
				r.hasErrorSeverityDiagnostic = true
			}
		}
	}
	r.diagnostics[documentURI] = append(r.diagnostics[documentURI], dedupedDiags...)
}

// compile compiles spx source files and returns compile result.
//
// TODO: Move diagnostics from [compileResult] to error return value by using
// [errors.Join].
func (s *Server) compile() (*compileResult, error) {
	spxFiles, err := s.spxFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to get spx files: %w", err)
	}

	result := &compileResult{
		fset:         goptoken.NewFileSet(),
		mainPkg:      types.NewPackage("main", "main"),
		mainPkgFiles: make(map[string]*gopast.File),
		typeInfo: &goptypesutil.Info{
			Types:      make(map[gopast.Expr]types.TypeAndValue),
			Defs:       make(map[*gopast.Ident]types.Object),
			Uses:       make(map[*gopast.Ident]types.Object),
			Implicits:  make(map[gopast.Node]types.Object),
			Selections: make(map[*gopast.SelectorExpr]*types.Selection),
			Scopes:     make(map[gopast.Node]*types.Scope),
		},
		spxResourceRefs: make(map[SpxResourceRefKey][]SpxResourceRef),
		diagnostics:     make(map[DocumentURI][]Diagnostic, len(spxFiles)),
	}

	gpfs := vfs.NewGopParserFS(s.workspaceRootFS)
	for _, spxFile := range spxFiles {
		documentURI := s.toDocumentURI(spxFile)
		result.diagnostics[documentURI] = nil

		f, err := gopparser.ParseFSEntry(result.fset, gpfs, spxFile, nil, gopparser.Config{
			Mode: gopparser.AllErrors | gopparser.ParseComments,
		})
		if err != nil {
			// Handle parse errors.
			var parseErr gopscanner.ErrorList
			if errors.As(err, &parseErr) {
				for _, e := range parseErr {
					result.addDiagnostics(documentURI, Diagnostic{
						Severity: SeverityError,
						Range: Range{
							Start: FromGopTokenPosition(e.Pos),
							End:   FromGopTokenPosition(e.Pos),
						},
						Message: e.Msg,
					})
				}
				continue
			}

			// Handle code generation errors.
			var codeErr *gogen.CodeError
			if errors.As(err, &codeErr) {
				position := codeErr.Fset.Position(codeErr.Pos)
				result.addDiagnostics(documentURI, Diagnostic{
					Severity: SeverityError,
					Range: Range{
						Start: FromGopTokenPosition(position),
						End:   FromGopTokenPosition(position),
					},
					Message: codeErr.Error(),
				})
				continue
			}

			// Handle unknown errors.
			result.addDiagnostics(documentURI, Diagnostic{
				Severity: SeverityError,
				Range: Range{
					Start: Position{Line: 0, Character: 0},
					End:   Position{Line: 0, Character: 0},
				},
				Message: fmt.Sprintf("failed to parse spx file: %v", err),
			})
			continue
		}
		if f.Name.Name == "main" {
			result.mainPkgFiles[spxFile] = f
			if path.Base(spxFile) == "main.spx" {
				result.mainSpxFile = spxFile
			}
		}
	}
	if len(result.mainPkgFiles) == 0 {
		if len(result.diagnostics) == 0 {
			return nil, errNoValidSpxFiles
		}
		return result, nil
	}
	if result.mainSpxFile == "" {
		if len(result.diagnostics) == 0 {
			return nil, errNoMainSpxFile
		}
		return result, nil
	}

	result.spxPkg, err = s.importer.Import(spxPkgPath)
	if err != nil {
		return nil, fmt.Errorf("failed to import spx package: %w", err)
	}

	mod := gopmod.New(gopmodload.Default)
	if err := mod.ImportClasses(); err != nil {
		return nil, fmt.Errorf("failed to import classes: %w", err)
	}
	if err := goptypesutil.NewChecker(
		&types.Config{
			Error: func(err error) {
				if typeErr, ok := err.(types.Error); ok {
					position := typeErr.Fset.Position(typeErr.Pos)
					documentURI := s.toDocumentURI(position.Filename)
					result.addDiagnostics(documentURI, Diagnostic{
						Severity: SeverityError,
						Range: Range{
							Start: FromGopTokenPosition(position),
							End:   FromGopTokenPosition(position),
						},
						Message: typeErr.Msg,
					})
				}
			},
			Importer: s.importer,
		},
		&goptypesutil.Config{
			Types: result.mainPkg,
			Fset:  result.fset,
			Mod:   mod,
		},
		nil,
		result.typeInfo,
	).Files(nil, gopASTFileMapToSlice(result.mainPkgFiles)); err != nil {
		// Errors should be handled by the type checker.
	}

	s.inspectForSpxResourceRootDir(result)
	s.inspectForSpxResourceAutoBindingsAndRefsAtDecls(result)
	s.inspectForSpxResourceRefs(result)
	return result, nil
}

// compileAndGetASTFileForDocumentURI handles common compilation and file
// retrieval logic for a given document URI. The returned astFile is probably
// nil even if the compilation succeeded.
func (s *Server) compileAndGetASTFileForDocumentURI(uri DocumentURI) (result *compileResult, spxFile string, astFile *gopast.File, err error) {
	result, err = s.compile()
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to compile: %w", err)
	}
	spxFile, err = s.fromDocumentURI(uri)
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to get spx file from document URI %q: %w", uri, err)
	}
	astFile = result.mainPkgFiles[spxFile]
	return
}

// inspectForSpxResourceRootDir inspects for spx resource root directory in
// main.spx.
func (s *Server) inspectForSpxResourceRootDir(result *compileResult) {
	gopast.Inspect(result.mainPkgFiles[result.mainSpxFile], func(node gopast.Node) bool {
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
			s.spxResourceRootDir, _ = getStringLitOrConstValue(firstArg, firstArgTV)
		} else {
			documentURI := s.toDocumentURI(result.mainSpxFile)
			result.addDiagnostics(documentURI, Diagnostic{
				Severity: SeverityError,
				Range: Range{
					Start: FromGopTokenPosition(result.fset.Position(firstArg.Pos())),
					End:   FromGopTokenPosition(result.fset.Position(firstArg.End())),
				},
				Message: "first argument of run must be a string literal or constant",
			})
		}
		return false
	})
}

// inspectForSpxResourceAutoBindingsAndRefsAtDecls inspects for spx resource
// auto-bindings and references at variable or constant declarations.
func (s *Server) inspectForSpxResourceAutoBindingsAndRefsAtDecls(result *compileResult) {
	var firstVarBlockInMainSpxFile *gopast.GenDecl
	if mainSpxFile, ok := result.mainPkgFiles[result.mainSpxFile]; ok {
		gopast.Inspect(mainSpxFile, func(n gopast.Node) bool {
			if firstVarBlockInMainSpxFile == nil {
				if decl, ok := n.(*gopast.GenDecl); ok && decl.Tok == goptoken.VAR {
					firstVarBlockInMainSpxFile = decl
					return false
				}
			}
			return true
		})
	}

	for ident, obj := range result.typeInfo.Defs {
		objType, ok := obj.Type().(*types.Named)
		if !ok {
			continue
		}

		spxFile := result.fset.Position(ident.Pos()).Filename
		isInMainSpx := spxFile == result.mainSpxFile
		documentURI := s.toDocumentURI(spxFile)

		identRange := Range{
			Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
			End:   FromGopTokenPosition(result.fset.Position(ident.End())),
		}

		var (
			isSpxSoundResourceAutoBinding  bool
			isSpxSpriteResourceAutoBinding bool
		)
		switch objTypeName := objType.String(); objTypeName {
		case spxSoundTypeName:
			isSpxSoundResourceAutoBinding = true
		case spxSpriteTypeName:
			isSpxSpriteResourceAutoBinding = true
		default:
			for _, typeName := range result.mainPkg.Scope().Names() {
				if typeName == "main" {
					continue
				}
				if objTypeName == "main."+typeName {
					if ident.Name != typeName {
						result.addDiagnostics(documentURI, Diagnostic{
							Severity: SeverityError,
							Range:    identRange,
							Message:  "sprite resource name must match type name for explicit auto-binding to work",
						})
						continue
					}
					isSpxSpriteResourceAutoBinding = true
					break
				}
			}
		}
		if isSpxSoundResourceAutoBinding || isSpxSpriteResourceAutoBinding {
			var subDiags []Diagnostic
			if isInMainSpx {
				isInFirstVarBlock := firstVarBlockInMainSpxFile != nil &&
					ident.Pos() >= firstVarBlockInMainSpxFile.Pos() &&
					ident.Pos() <= firstVarBlockInMainSpxFile.End()
				if isInFirstVarBlock {
					switch {
					case isSpxSoundResourceAutoBinding:
						refKey := SpxSoundResourceRefKey{SoundName: ident.Name}
						result.addSpxResourceRef(refKey, ident, SpxResourceRefKindAutoBinding)
						result.addSpxSoundResourceAutoBinding(obj)
						if _, err := s.getSpxSoundResource(ident.Name); err != nil {
							subDiags = collectDiagnosticsFromGetSpxResourceError(err, SpxResourceTypeSound, ident.Name, identRange)
						}
					case isSpxSpriteResourceAutoBinding:
						refKey := SpxSpriteResourceRefKey{SpriteName: ident.Name}
						result.addSpxResourceRef(refKey, ident, SpxResourceRefKindAutoBinding)
						result.addSpxSpriteResourceAutoBinding(obj)
						if _, err := s.getSpxSpriteResource(ident.Name); err != nil {
							subDiags = collectDiagnosticsFromGetSpxResourceError(err, SpxResourceTypeSprite, ident.Name, identRange)
						}
					}
				} else {
					subDiags = []Diagnostic{{
						Severity: SeverityWarning,
						Range:    identRange,
						Message:  "resources must be defined in the first var block for auto-binding",
					}}
				}
			} else {
				subDiags = []Diagnostic{{
					Severity: SeverityWarning,
					Range:    identRange,
					Message:  "auto-binding of resources can only happen in main.spx",
				}}
			}
			result.addDiagnostics(documentURI, subDiags...)
		}
	}
}

// inspectForSpxResourceRefs inspects for spx resource references in the code.
func (s *Server) inspectForSpxResourceRefs(result *compileResult) {
	// Check all type-checked expressions.
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || expr.Pos() == goptoken.NoPos || tv.IsType() {
			continue // Skip type identifiers.
		}

		switch expr := expr.(type) {
		case *gopast.CallExpr:
			funTV, ok := result.typeInfo.Types[expr.Fun]
			if !ok {
				break
			}

			funSig, ok := funTV.Type.(*types.Signature)
			if !ok {
				break
			}

			var spxSpriteResource *SpxSpriteResource
			if funRecv := funSig.Recv(); funRecv != nil {
				recvType := funRecv.Type()
				if ptr, ok := recvType.(*types.Pointer); ok {
					recvType = ptr.Elem()
				}
				switch recvType.String() {
				case spxSpriteTypeName, spxSpriteImplTypeName:
					spxSpriteResource = s.inspectSpxSpriteResourceRefAtExpr(result, expr, recvType)
				}
			}

			for i, arg := range expr.Args {
				paramType := funSig.Params().At(i).Type()
				if ptr, ok := paramType.(*types.Pointer); ok {
					paramType = ptr.Elem()
				}
				switch paramType.String() {
				case spxBackdropNameTypeName:
					s.inspectSpxBackdropResourceRefAtExpr(result, arg, paramType)
				case spxSpriteNameTypeName, spxSpriteTypeName:
					s.inspectSpxSpriteResourceRefAtExpr(result, arg, paramType)
				case spxSpriteCostumeNameTypeName:
					if spxSpriteResource != nil {
						s.inspectSpxSpriteCostumeResourceRefAtExpr(result, spxSpriteResource, arg, paramType)
					}
				case spxSpriteAnimationNameTypeName:
					if spxSpriteResource != nil {
						s.inspectSpxSpriteAnimationResourceRefAtExpr(result, spxSpriteResource, arg, paramType)
					}
				case spxSoundNameTypeName, spxSoundTypeName:
					s.inspectSpxSoundResourceRefAtExpr(result, arg, paramType)
				case spxWidgetNameTypeName:
					s.inspectSpxWidgetResourceRefAtExpr(result, arg, paramType)
				}
			}
		default:
			typ := tv.Type
			if ptr, ok := typ.(*types.Pointer); ok {
				typ = ptr.Elem()
			}
			switch typ.String() {
			case spxBackdropNameTypeName:
				s.inspectSpxBackdropResourceRefAtExpr(result, expr, typ)
			case spxSpriteNameTypeName, spxSpriteTypeName:
				s.inspectSpxSpriteResourceRefAtExpr(result, expr, typ)
			case spxSoundNameTypeName, spxSoundTypeName:
				s.inspectSpxSoundResourceRefAtExpr(result, expr, typ)
			case spxWidgetNameTypeName:
				s.inspectSpxWidgetResourceRefAtExpr(result, expr, typ)
			}
		}
	}

	// Check all identifier uses for auto-bindings.
	for ident, obj := range result.typeInfo.Uses {
		objType := obj.Type()
		if ptr, ok := objType.(*types.Pointer); ok {
			objType = ptr.Elem()
		}

		switch objType.String() {
		case spxSpriteTypeName:
			if slices.Contains(result.spxSpriteResourceAutoBindings, obj) {
				s.inspectSpxSpriteResourceRefAtExpr(result, ident, objType)
			}
		case spxSoundTypeName:
			if slices.Contains(result.spxSoundResourceAutoBindings, obj) {
				s.inspectSpxSoundResourceRefAtExpr(result, ident, objType)
			}
		}
	}

	// Check implicit objects.
	for node, obj := range result.typeInfo.Implicits {
		objType := obj.Type()
		if ptr, ok := objType.(*types.Pointer); ok {
			objType = ptr.Elem()
		}

		switch objType.String() {
		case spxSpriteTypeName, spxSpriteImplTypeName:
			if typeAssert, ok := node.(*gopast.TypeAssertExpr); ok {
				s.inspectSpxSpriteResourceRefAtExpr(result, typeAssert, objType)
			}
		}
	}

	// Check selections for method calls and field accesses.
	for sel, selection := range result.typeInfo.Selections {
		recv := selection.Recv()
		if ptr, ok := recv.(*types.Pointer); ok {
			recv = ptr.Elem()
		}

		var spxSpriteResource *SpxSpriteResource
		switch recv.String() {
		case spxSpriteTypeName, spxSpriteImplTypeName:
			spxSpriteResource = s.inspectSpxSpriteResourceRefAtExpr(result, sel.X, recv)
		}
		if spxSpriteResource != nil {
			switch selection.Type().String() {
			case spxSpriteCostumeNameTypeName:
				s.inspectSpxSpriteCostumeResourceRefAtExpr(result, spxSpriteResource, sel, selection.Type())
			case spxSpriteAnimationNameTypeName:
				s.inspectSpxSpriteAnimationResourceRefAtExpr(result, spxSpriteResource, sel, selection.Type())
			}
		}
	}
}

// inspectSpxBackdropResourceRefAtExpr inspects a spx backdrop resource
// reference at an expression. It returns the spx backdrop resource if it was
// successfully retrieved.
func (s *Server) inspectSpxBackdropResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxBackdropResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	spxBackdropName, ok := ri.getStringResourceName(spxBackdropNameTypeName)
	if !ok || !ri.validateResourceName(spxBackdropName, SpxResourceTypeBackdrop) {
		return nil
	}
	spxResourceRefKind := SpxResourceRefKindStringLiteral
	if _, ok := expr.(*gopast.Ident); ok {
		spxResourceRefKind = SpxResourceRefKindConstantReference
	}
	ri.result.addSpxResourceRef(SpxBackdropResourceRefKey{BackdropName: spxBackdropName}, expr, spxResourceRefKind)

	spxBackdropResource, err := s.getSpxBackdropResource(spxBackdropName)
	if err != nil {
		ri.handleGetResourceError(err, SpxResourceTypeBackdrop, spxBackdropName)
		return nil
	}
	return spxBackdropResource
}

// inspectSpxSpriteResourceRefAtExpr inspects a spx sprite resource reference at
// an expression. It returns the spx sprite resource if it was successfully
// retrieved.
func (s *Server) inspectSpxSpriteResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxSpriteResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	var spxSpriteName string
	if callExpr, ok := expr.(*gopast.CallExpr); ok {
		switch fun := callExpr.Fun.(type) {
		case *gopast.Ident:
			spxSpriteName = strings.TrimSuffix(path.Base(result.fset.Position(callExpr.Pos()).Filename), ".spx")
		case *gopast.SelectorExpr:
			if ident, ok := fun.X.(*gopast.Ident); ok {
				ri.exprRange = Range{
					Start: FromGopTokenPosition(result.fset.Position(fun.X.Pos())),
					End:   FromGopTokenPosition(result.fset.Position(fun.X.End())),
				}

				obj := result.typeInfo.ObjectOf(ident)
				if obj != nil {
					if !slices.Contains(result.spxSpriteResourceAutoBindings, obj) {
						ri.result.addDiagnostics(ri.documentURI, Diagnostic{
							Severity: SeverityError,
							Range:    ri.exprRange,
							Message:  fmt.Sprintf("cannot find auto-binding for sprite resource %q", obj.Name()),
						})
						return nil
					}
					spxSpriteName = obj.Name()
					ri.result.addSpxResourceRef(SpxSpriteResourceRefKey{SpriteName: spxSpriteName}, fun.X, SpxResourceRefKindAutoBindingReference)
				}
			}
		}
		if !ri.validateResourceName(spxSpriteName, SpxResourceTypeSprite) {
			ri.result.addDiagnostics(ri.documentURI, Diagnostic{
				Severity: SeverityWarning,
				Range:    ri.exprRange,
				Message:  "cannot determine sprite name",
			})
			return nil
		}
	} else {
		var spxResourceRefKind SpxResourceRefKind
		switch ri.getTypeName() {
		case spxSpriteNameTypeName:
			var ok bool
			spxSpriteName, ok = ri.getStringResourceName(spxSpriteNameTypeName)
			if !ok {
				return nil
			}
			spxResourceRefKind = SpxResourceRefKindStringLiteral
			if _, ok := expr.(*gopast.Ident); ok {
				spxResourceRefKind = SpxResourceRefKindConstantReference
			}
		case spxSpriteTypeName:
			ident, ok := expr.(*gopast.Ident)
			if !ok {
				return nil
			}
			obj := result.typeInfo.ObjectOf(ident)
			if obj == nil {
				return nil
			}
			if !slices.Contains(result.spxSpriteResourceAutoBindings, obj) {
				ri.result.addDiagnostics(ri.documentURI, Diagnostic{
					Severity: SeverityError,
					Range:    ri.exprRange,
					Message:  fmt.Sprintf("cannot find auto-binding for sprite resource %q", obj.Name()),
				})
				return nil
			}
			spxSpriteName = obj.Name()
			spxResourceRefKind = SpxResourceRefKindAutoBindingReference
		default:
			return nil
		}
		if !ri.validateResourceName(spxSpriteName, SpxResourceTypeSprite) {
			return nil
		}
		ri.result.addSpxResourceRef(SpxSpriteResourceRefKey{SpriteName: spxSpriteName}, expr, spxResourceRefKind)
	}

	spxSpriteResource, err := s.getSpxSpriteResource(spxSpriteName)
	if err != nil {
		ri.handleGetResourceError(err, SpxResourceTypeSprite, spxSpriteName)
		return nil
	}
	return spxSpriteResource
}

// inspectSpxSpriteCostumeResourceRefAtExpr inspects a spx sprite costume
// resource reference at an expression. It returns the spx sprite costume
// resource if it was successfully retrieved.
func (s *Server) inspectSpxSpriteCostumeResourceRefAtExpr(result *compileResult, spxSpriteResource *SpxSpriteResource, expr gopast.Expr, declaredType types.Type) *SpxSpriteCostumeResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	var (
		spxSpriteCostumeName string
		spxResourceRefKind   SpxResourceRefKind
	)
	switch ri.getTypeName() {
	case spxSpriteCostumeNameTypeName:
		var ok bool
		spxSpriteCostumeName, ok = ri.getStringResourceName(spxSpriteCostumeNameTypeName)
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
	if !ri.validateResourceName(spxSpriteCostumeName, SpxResourceTypeCostume) {
		return nil
	}
	ri.result.addSpxResourceRef(SpxSpriteCostumeResourceRefKey{
		SpriteName:  spxSpriteResource.Name,
		CostumeName: spxSpriteCostumeName,
	}, expr, spxResourceRefKind)

	idx := slices.IndexFunc(spxSpriteResource.Costumes, func(c SpxSpriteCostumeResource) bool {
		return c.Name == spxSpriteCostumeName
	})
	if idx < 0 {
		result.addDiagnostics(documentURI, Diagnostic{
			Severity: SeverityError,
			Range:    ri.exprRange,
			Message:  fmt.Sprintf("costume resource %q not found in sprite %q", spxSpriteCostumeName, spxSpriteResource.Name),
		})
		return nil
	}
	return &spxSpriteResource.Costumes[idx]
}

// inspectSpxSpriteAnimationResourceRefAtExpr inspects a spx sprite animation
// resource reference at an expression. It returns the spx sprite animation
// resource if it was successfully retrieved.
func (s *Server) inspectSpxSpriteAnimationResourceRefAtExpr(result *compileResult, spxSpriteResource *SpxSpriteResource, expr gopast.Expr, declaredType types.Type) *SpxSpriteAnimationResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	var (
		spxSpriteAnimationName string
		spxResourceRefKind     SpxResourceRefKind
	)
	switch ri.getTypeName() {
	case spxSpriteAnimationNameTypeName:
		var ok bool
		spxSpriteAnimationName, ok = ri.getStringResourceName(spxSpriteAnimationNameTypeName)
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
	if !ri.validateResourceName(spxSpriteAnimationName, SpxResourceTypeAnimation) {
		return nil
	}
	ri.result.addSpxResourceRef(SpxSpriteAnimationResourceRefKey{
		SpriteName:    spxSpriteResource.Name,
		AnimationName: spxSpriteAnimationName,
	}, expr, spxResourceRefKind)

	idx := slices.IndexFunc(spxSpriteResource.Animations, func(a SpxSpriteAnimationResource) bool {
		return a.Name == spxSpriteAnimationName
	})
	if idx < 0 {
		result.addDiagnostics(documentURI, Diagnostic{
			Severity: SeverityError,
			Range:    ri.exprRange,
			Message:  fmt.Sprintf("animation resource %q not found in sprite %q", spxSpriteAnimationName, spxSpriteResource.Name),
		})
		return nil
	}
	return &spxSpriteResource.Animations[idx]
}

// inspectSpxSoundResourceRefAtExpr inspects a spx sound resource reference at
// an expression. It returns the spx sound resource if it was successfully
// retrieved.
func (s *Server) inspectSpxSoundResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxSoundResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	var (
		spxSoundName       string
		spxResourceRefKind SpxResourceRefKind
	)
	switch ri.getTypeName() {
	case spxSoundNameTypeName:
		var ok bool
		spxSoundName, ok = ri.getStringResourceName(spxSoundNameTypeName)
		if !ok {
			return nil
		}
		spxResourceRefKind = SpxResourceRefKindStringLiteral
		if _, ok := expr.(*gopast.Ident); ok {
			spxResourceRefKind = SpxResourceRefKindConstantReference
		}
	case spxSoundTypeName:
		ident, ok := expr.(*gopast.Ident)
		if !ok {
			return nil
		}
		obj := result.typeInfo.ObjectOf(ident)
		if obj == nil {
			return nil
		}
		if !slices.Contains(result.spxSoundResourceAutoBindings, obj) {
			ri.result.addDiagnostics(ri.documentURI, Diagnostic{
				Severity: SeverityError,
				Range:    ri.exprRange,
				Message:  fmt.Sprintf("cannot find auto-binding for sound resource %q", obj.Name()),
			})
			return nil
		}
		spxSoundName = obj.Name()
		spxResourceRefKind = SpxResourceRefKindAutoBindingReference
	default:
		return nil
	}
	if !ri.validateResourceName(spxSoundName, SpxResourceTypeSound) {
		return nil
	}
	ri.result.addSpxResourceRef(SpxSoundResourceRefKey{SoundName: spxSoundName}, expr, spxResourceRefKind)

	spxSoundResource, err := s.getSpxSoundResource(spxSoundName)
	if err != nil {
		ri.handleGetResourceError(err, SpxResourceTypeSound, spxSoundName)
		return nil
	}
	return spxSoundResource
}

// inspectSpxWidgetResourceRefAtExpr inspects a spx widget resource reference at
// an expression. It returns the spx widget resource if it was successfully
// retrieved.
func (s *Server) inspectSpxWidgetResourceRefAtExpr(result *compileResult, expr gopast.Expr, declaredType types.Type) *SpxWidgetResource {
	documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
	ri := newSpxResourceInspector(result, documentURI, expr, declaredType)

	var (
		spxWidgetName      string
		spxResourceRefKind SpxResourceRefKind
	)
	switch ri.getTypeName() {
	case spxWidgetNameTypeName:
		var ok bool
		spxWidgetName, ok = ri.getStringResourceName(spxWidgetNameTypeName)
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
	if !ri.validateResourceName(spxWidgetName, SpxResourceTypeWidget) {
		return nil
	}
	ri.result.addSpxResourceRef(SpxWidgetResourceRefKey{WidgetName: spxWidgetName}, expr, spxResourceRefKind)

	spxWidgetResource, err := s.getSpxWidgetResource(spxWidgetName)
	if err != nil {
		ri.handleGetResourceError(err, SpxResourceTypeWidget, spxWidgetName)
		return nil
	}
	return spxWidgetResource
}

// spxResourceInspector helps inspect spx resource references in the code.
type spxResourceInspector struct {
	result       *compileResult
	documentURI  DocumentURI
	expr         gopast.Expr
	declaredType types.Type
	exprRange    Range
	tv           types.TypeAndValue
}

// newSpxResourceInspector creates a new spx resource inspector.
func newSpxResourceInspector(result *compileResult, documentURI DocumentURI, expr gopast.Expr, declaredType types.Type) *spxResourceInspector {
	return &spxResourceInspector{
		result:       result,
		documentURI:  documentURI,
		expr:         expr,
		declaredType: declaredType,
		exprRange: Range{
			Start: FromGopTokenPosition(result.fset.Position(expr.Pos())),
			End:   FromGopTokenPosition(result.fset.Position(expr.End())),
		},
		tv: result.typeInfo.Types[expr],
	}
}

// getTypeName returns the type name of the expression being inspected.
func (ri *spxResourceInspector) getTypeName() string {
	if ri.declaredType != nil {
		return ri.declaredType.String()
	}
	return ri.tv.Type.String()
}

// getStringResourceName returns the resource name if the expression is a string
// literal or constant of the expected type.
func (ri *spxResourceInspector) getStringResourceName(expectedType string) (string, bool) {
	if ri.getTypeName() != expectedType {
		return "", false
	}
	name, ok := getStringLitOrConstValue(ri.expr, ri.tv)
	return name, ok
}

// validateResourceName validates that the resource name is not empty. It
// returns true if the name is valid, false otherwise.
func (ri *spxResourceInspector) validateResourceName(resourceName string, resourceType SpxResourceType) bool {
	if resourceName == "" {
		ri.result.addDiagnostics(ri.documentURI, Diagnostic{
			Severity: SeverityError,
			Range:    ri.exprRange,
			Message:  string(resourceType) + " resource name cannot be empty",
		})
		return false
	}
	return true
}

// handleGetResourceError handles errors that occur when getting a resource by
// adding appropriate diagnostics.
func (ri *spxResourceInspector) handleGetResourceError(err error, resourceType SpxResourceType, resourceName string) {
	diags := collectDiagnosticsFromGetSpxResourceError(err, resourceType, resourceName, ri.exprRange)
	ri.result.addDiagnostics(ri.documentURI, diags...)
}

// collectDiagnosticsFromGetSpxResourceError collects diagnostics from an error
// when calling resource getter methods.
func collectDiagnosticsFromGetSpxResourceError(err error, resourceType SpxResourceType, resourceName string, resourceNameRange Range) []Diagnostic {
	if errors.Is(err, fs.ErrNotExist) {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    resourceNameRange,
			Message:  fmt.Sprintf("%s resource %q not found", resourceType, resourceName),
		}}
	}
	return []Diagnostic{{
		Severity: SeverityError,
		Range:    resourceNameRange,
		Message:  fmt.Sprintf("failed to get %s resource %q: %v", resourceType, resourceName, err),
	}}
}
