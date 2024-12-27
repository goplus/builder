package server

import (
	"errors"
	"fmt"
	"go/types"
	"io/fs"
	"maps"
	"path"
	"slices"
	"strings"
	"time"

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

const (
	spxPkgPath                     = "github.com/goplus/spx"
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
	errStopIteration   = errors.New("stop iteration")
)

// compileResult contains the compile results and additional information from
// the compile process.
type compileResult struct {
	// fset is the source file set used for parsing the spx files.
	fset *goptoken.FileSet

	// mainPkg is the main package.
	mainPkg *types.Package

	// mainASTPkg is the main package AST.
	mainASTPkg *gopast.Package

	// mainASTPkgSpecToGenDecl maps each spec in the main package AST to its
	// parent general declaration.
	mainASTPkgSpecToGenDecl map[gopast.Spec]*gopast.GenDecl

	// mainSpxFile is the main.spx file path.
	mainSpxFile string

	// mainSpxFirstVarBlock is the first var block in main.spx.
	mainSpxFirstVarBlock *gopast.GenDecl

	// spxPkg is the spx package.
	spxPkg *types.Package

	// typeInfo contains type information collected during the compile
	// process.
	typeInfo *goptypesutil.Info

	// spxSpriteNames stores spx sprite names.
	spxSpriteNames []string

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

// innermostScopeAt returns the innermost scope that contains the given
// position. It returns nil if not found.
func (r *compileResult) innermostScopeAt(pos goptoken.Pos) *types.Scope {
	fileScope := r.typeInfo.Scopes[r.mainASTPkg.Files[r.fset.Position(pos).Filename]]
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

// identAndObjectAtASTFilePosition returns the identifier and object at the
// given position in the given file.
func (r *compileResult) identAndObjectAtASTFilePosition(astFile *gopast.File, position Position) (*gopast.Ident, types.Object) {
	tokenPos := r.fset.Position(astFile.Pos())
	tokenPos.Line = int(position.Line) + 1
	tokenPos.Column = int(position.Character) + 1

	var foundIdent *gopast.Ident
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

		if foundIdent == nil || (identPos.Offset >= r.fset.Position(foundIdent.Pos()).Offset &&
			identEnd.Offset <= r.fset.Position(foundIdent.End()).Offset) {
			foundIdent = ident
		}
		return true
	})
	if foundIdent == nil {
		return nil, nil
	}
	return foundIdent, r.typeInfo.ObjectOf(foundIdent)
}

// defIdentOf returns the identifier where the given object is defined.
func (r *compileResult) defIdentOf(obj types.Object) *gopast.Ident {
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

// refIdentsOf returns all identifiers where the given object is referenced.
func (r *compileResult) refIdentsOf(obj types.Object) []*gopast.Ident {
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

// inferSelectorTypeNameForIdent infers the selector type name for the given
// identifier. It returns empty string if no selector can be inferred.
func (r *compileResult) inferSelectorTypeNameForIdent(ident *gopast.Ident) string {
	astFile, ok := r.mainASTPkg.Files[r.fset.Position(ident.Pos()).Filename]
	if !ok {
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
			if named, ok := unwrapPointerType(tv.Type).(*types.Named); ok {
				typeName := named.Obj().Name()
				if named.Obj().Pkg() != nil && named.Obj().Pkg().Path() == spxPkgPath && typeName == "Sprite" {
					typeName = "SpriteImpl"
				}
				return typeName
			}
			if iface, ok := unwrapPointerType(tv.Type).(*types.Interface); ok && iface.String() != "interface{}" {
				return iface.String()
			}
		}
	}
	if obj := r.typeInfo.ObjectOf(ident); obj != nil {
		if obj.Pkg() != nil && obj.Pkg().Path() == spxPkgPath {
			astFileScope := r.typeInfo.Scopes[astFile]
			innermostScope := r.innermostScopeAt(ident.Pos())
			if innermostScope == astFileScope {
				spxFile := r.fset.Position(ident.Pos()).Filename
				if spxFile == r.mainSpxFile {
					return "Game"
				}
				return "SpriteImpl"
			}
		}
	}
	return ""
}

// isInMainSpxFirstVarBlock reports whether the given position is in the first
// var block in main.spx.
func (r *compileResult) isInMainSpxFirstVarBlock(pos goptoken.Pos) bool {
	return r.mainSpxFirstVarBlock != nil &&
		pos >= r.mainSpxFirstVarBlock.Pos() &&
		pos <= r.mainSpxFirstVarBlock.End()
}

// spxResourceRefAtASTFilePosition returns the spx resource reference at the
// given position in the given AST file.
func (r *compileResult) spxResourceRefAtASTFilePosition(astFile *gopast.File, position Position) (SpxResourceRefKey, SpxResourceRef) {
	tokenPos := r.fset.Position(astFile.Pos())
	tokenPos.Line = int(position.Line) + 1
	tokenPos.Column = int(position.Character) + 1

	var foundNode gopast.Node
	gopast.Inspect(astFile, func(node gopast.Node) bool {
		if node == nil {
			return true
		}
		startPos := r.fset.Position(node.Pos())
		endPos := r.fset.Position(node.End())
		if tokenPos.Line == startPos.Line &&
			tokenPos.Column >= startPos.Column &&
			tokenPos.Column <= endPos.Column {
			if foundNode == nil || (node.Pos() >= foundNode.Pos() && node.End() <= foundNode.End()) {
				foundNode = node
			}
			return true
		}
		return true
	})
	if foundNode == nil {
		return nil, SpxResourceRef{}
	}

	for refKey, refs := range r.spxResourceRefs {
		for _, ref := range refs {
			if ref.Node == foundNode {
				return refKey, ref
			}
		}
	}
	return nil, SpxResourceRef{}
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

// compileCache represents a cache for compilation results.
type compileCache struct {
	result          *compileResult
	spxFileModTimes map[string]time.Time
}

// compile compiles spx source files and returns compile result.
func (s *Server) compile() (*compileResult, error) {
	spxFiles, err := s.spxFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to get spx files: %w", err)
	}
	if len(spxFiles) == 0 {
		return nil, errNoValidSpxFiles
	}
	slices.Sort(spxFiles)

	s.compileCacheMu.Lock()
	defer s.compileCacheMu.Unlock()

	// Try to use cache first.
	if cache := s.lastCompileCache; cache != nil {
		// Check if spx file set has changed.
		cachedSpxFiles := slices.Sorted(maps.Keys(cache.spxFileModTimes))
		if slices.Equal(spxFiles, cachedSpxFiles) {
			// Check if any spx file has been modified.
			modified := false
			for _, spxFile := range spxFiles {
				fi, err := fs.Stat(s.workspaceRootFS, spxFile)
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

	// Compile uncached if cache is not used.
	result, err := s.compileUncached(spxFiles)
	if err != nil {
		return nil, err
	}

	// Update cache.
	modTimes := make(map[string]time.Time, len(spxFiles))
	for _, spxFile := range spxFiles {
		fi, err := fs.Stat(s.workspaceRootFS, spxFile)
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

// compileUncached compiles spx source files without using cache.
//
// TODO: Move diagnostics from [compileResult] to error return value by using
// [errors.Join].
func (s *Server) compileUncached(spxFiles []string) (*compileResult, error) {
	result := &compileResult{
		fset:                    goptoken.NewFileSet(),
		mainPkg:                 types.NewPackage("main", "main"),
		mainASTPkg:              &gopast.Package{Name: "main", Files: make(map[string]*gopast.File)},
		mainASTPkgSpecToGenDecl: make(map[gopast.Spec]*gopast.GenDecl),
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
		result.diagnostics[documentURI] = []Diagnostic{}

		astFile, err := gopparser.ParseFSEntry(result.fset, gpfs, spxFile, nil, gopparser.Config{
			Mode: gopparser.AllErrors | gopparser.ParseComments,
		})
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
						Range: Range{
							Start: FromGopTokenPosition(e.Pos),
							End:   FromGopTokenPosition(e.Pos),
						},
						Message: e.Msg,
					})
				}
			} else if errors.As(err, &codeErr) {
				// Handle code generation errors.
				position := codeErr.Fset.Position(codeErr.Pos)
				result.addDiagnostics(documentURI, Diagnostic{
					Severity: SeverityError,
					Range: Range{
						Start: FromGopTokenPosition(position),
						End:   FromGopTokenPosition(position),
					},
					Message: codeErr.Error(),
				})
			} else {
				// Handle unknown errors.
				result.addDiagnostics(documentURI, Diagnostic{
					Severity: SeverityError,
					Range: Range{
						Start: Position{Line: 0, Character: 0},
						End:   Position{Line: 0, Character: 0},
					},
					Message: fmt.Sprintf("failed to parse spx file: %v", err),
				})
			}
		}
		if astFile != nil && astFile.Name.Name == "main" {
			result.mainASTPkg.Files[spxFile] = astFile
			if spxFileBaseName := path.Base(spxFile); spxFileBaseName == "main.spx" {
				result.mainSpxFile = spxFile

				for _, decl := range astFile.Decls {
					genDecl, ok := decl.(*gopast.GenDecl)
					if !ok {
						continue
					}
					for _, spec := range genDecl.Specs {
						result.mainASTPkgSpecToGenDecl[spec] = genDecl
					}
				}

				gopast.Inspect(astFile, func(n gopast.Node) bool {
					if result.mainSpxFirstVarBlock == nil {
						if decl, ok := n.(*gopast.GenDecl); ok && decl.Tok == goptoken.VAR {
							result.mainSpxFirstVarBlock = decl
							return false
						}
					}
					return true
				})
			} else {
				result.spxSpriteNames = append(result.spxSpriteNames, strings.TrimSuffix(spxFileBaseName, ".spx"))
			}
		}
	}
	if len(result.mainASTPkg.Files) == 0 {
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

	var err error
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
	).Files(nil, gopASTFileMapToSlice(result.mainASTPkg.Files)); err != nil {
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
	spxFile, err = s.fromDocumentURI(uri)
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to get spx file from document URI %q: %w", uri, err)
	}
	result, err = s.compile()
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to compile: %w", err)
	}
	astFile = result.mainASTPkg.Files[spxFile]
	return
}

// inspectForSpxResourceRootDir inspects for spx resource root directory in
// main.spx.
func (s *Server) inspectForSpxResourceRootDir(result *compileResult) {
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
			for _, spxSpriteName := range result.spxSpriteNames {
				if objTypeName != "main."+spxSpriteName {
					continue
				}
				if ident.Name != spxSpriteName {
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
		if isSpxSoundResourceAutoBinding || isSpxSpriteResourceAutoBinding {
			var subDiags []Diagnostic
			if isInMainSpx {
				if result.isInMainSpxFirstVarBlock(ident.Pos()) {
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
		if expr == nil || !expr.Pos().IsValid() || tv.IsType() {
			continue // Skip type identifiers.
		}

		switch expr := expr.(type) {
		case *gopast.CallExpr:
			funcTV, ok := result.typeInfo.Types[expr.Fun]
			if !ok {
				break
			}
			funcSig, ok := funcTV.Type.(*types.Signature)
			if !ok {
				break
			}

			var spxSpriteResource *SpxSpriteResource
			if recv := funcSig.Recv(); recv != nil {
				recvType := unwrapPointerType(recv.Type())
				switch recvType.String() {
				case spxSpriteTypeName, spxSpriteImplTypeName:
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
			typ := unwrapPointerType(tv.Type)
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
		objType := unwrapPointerType(obj.Type())
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
		objType := unwrapPointerType(obj.Type())
		switch objType.String() {
		case spxSpriteTypeName, spxSpriteImplTypeName:
			if typeAssert, ok := node.(*gopast.TypeAssertExpr); ok {
				s.inspectSpxSpriteResourceRefAtExpr(result, typeAssert, objType)
			}
		}
	}

	// Check selections for method calls and field accesses.
	for sel, selection := range result.typeInfo.Selections {
		recv := unwrapPointerType(selection.Recv())

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
						return nil
					}
					spxSpriteName = obj.Name()
					ri.result.addSpxResourceRef(SpxSpriteResourceRefKey{SpriteName: spxSpriteName}, fun.X, SpxResourceRefKindAutoBindingReference)
				}
			}
		}
		if !ri.validateResourceName(spxSpriteName, SpxResourceTypeSprite) {
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
