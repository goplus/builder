package server

import (
	"errors"
	"fmt"
	"go/types"
	"io/fs"
	"path"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal"
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
	SpxGameTypeName       = "github.com/goplus/spx.Game"
	SpxSpriteTypeName     = "github.com/goplus/spx.Sprite"
	SpxSpriteImplTypeName = "github.com/goplus/spx.SpriteImpl"
	SpxSoundTypeName      = "github.com/goplus/spx.Sound"
	SpxEventSinksTypeName = "github.com/goplus/spx.eventSinks"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_diagnostic
func (s *Server) textDocumentDiagnostic(params *DocumentDiagnosticParams) (*DocumentDiagnosticReport, error) {
	result, err := s.diagnose()
	if err != nil {
		return nil, err
	}

	return &DocumentDiagnosticReport{Value: &RelatedFullDocumentDiagnosticReport{
		FullDocumentDiagnosticReport: FullDocumentDiagnosticReport{
			Kind:  string(DiagnosticFull),
			Items: result.diagnostics[params.TextDocument.URI],
		},
	}}, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#workspace_diagnostic
func (s *Server) workspaceDiagnostic(params *WorkspaceDiagnosticParams) (*WorkspaceDiagnosticReport, error) {
	result, err := s.diagnose()
	if err != nil {
		return nil, err
	}

	var items []WorkspaceDocumentDiagnosticReport
	for file, fileDiags := range result.diagnostics {
		items = append(items, Or_WorkspaceDocumentDiagnosticReport{
			Value: &WorkspaceFullDocumentDiagnosticReport{
				URI: DocumentURI(file),
				FullDocumentDiagnosticReport: FullDocumentDiagnosticReport{
					Kind:  string(DiagnosticFull),
					Items: fileDiags,
				},
			},
		})
	}
	return &WorkspaceDiagnosticReport{Items: items}, nil
}

// diagnosticResult contains the diagnostic results and additional information
// from the diagnostic process.
type diagnosticResult struct {
	// diagnostics contains diagnostic messages for each document.
	diagnostics map[DocumentURI][]Diagnostic

	// fset is the source file set used for parsing the spx files.
	fset *goptoken.FileSet

	// mainPkgFiles contains the main package files.
	mainPkgFiles map[string]*gopast.File

	// mainSpxFile is the main.spx file path.
	mainSpxFile string

	// spxSpriteTypeNames contains the spx sprite type names.
	spxSpriteTypeNames []string

	// typeInfo contains type information collected during the diagnostic
	// process.
	typeInfo *goptypesutil.Info
}

// diagnose performs diagnostic checks for spx source files and returns
// diagnostic result.
func (s *Server) diagnose() (*diagnosticResult, error) {
	spxFiles, err := s.spxFiles()
	if err != nil {
		return nil, fmt.Errorf("get spx files failed: %w", err)
	}

	result := &diagnosticResult{
		diagnostics:  make(map[DocumentURI][]Diagnostic, len(spxFiles)),
		fset:         goptoken.NewFileSet(),
		mainPkgFiles: make(map[string]*gopast.File),
		typeInfo: &goptypesutil.Info{
			Types:      make(map[gopast.Expr]types.TypeAndValue),
			Defs:       make(map[*gopast.Ident]types.Object),
			Uses:       make(map[*gopast.Ident]types.Object),
			Implicits:  make(map[gopast.Node]types.Object),
			Selections: make(map[*gopast.SelectorExpr]*types.Selection),
			Scopes:     make(map[gopast.Node]*types.Scope),
		},
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
					result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
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
				result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
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
			result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
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
			spxFileBase := path.Base(spxFile)
			if spxFileBase == "main.spx" {
				result.mainSpxFile = spxFile
			} else {
				spxSpriteTypeName := "main." + strings.TrimSuffix(spxFileBase, ".spx")
				result.spxSpriteTypeNames = append(result.spxSpriteTypeNames, spxSpriteTypeName)
			}
		}
	}
	if len(result.mainPkgFiles) == 0 {
		if len(result.diagnostics) == 0 {
			return nil, errors.New("no valid spx files found in main package")
		}
		return result, nil
	}
	if result.mainSpxFile == "" {
		if len(result.diagnostics) == 0 {
			return nil, errors.New("no valid main.spx file found in main package")
		}
		return result, nil
	}

	mod := gopmod.New(gopmodload.Default)
	if err := mod.ImportClasses(); err != nil {
		return nil, fmt.Errorf("import classes failed: %w", err)
	}
	if err := goptypesutil.NewChecker(
		&types.Config{
			Error: func(err error) {
				if typeErr, ok := err.(types.Error); ok {
					position := typeErr.Fset.Position(typeErr.Pos)
					documentURI := s.toDocumentURI(position.Filename)
					result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
						Severity: SeverityError,
						Range: Range{
							Start: FromGopTokenPosition(position),
							End:   FromGopTokenPosition(position),
						},
						Message: typeErr.Msg,
					})
				}
			},
			Importer: internal.NewImporter(result.fset),
		},
		&goptypesutil.Config{
			Types: types.NewPackage("main", "main"),
			Fset:  result.fset,
			Mod:   mod,
		},
		nil,
		result.typeInfo,
	).Files(nil, gopASTFileMapToSlice(result.mainPkgFiles)); err != nil {
		// Errors should be handled by the type checker.
	}

	// Try to extract spx resource root directory from main.spx.
	gopast.Inspect(result.mainPkgFiles[result.mainSpxFile], func(node gopast.Node) bool {
		switch node := node.(type) {
		case *gopast.CallExpr:
			if ident, ok := node.Fun.(*gopast.Ident); ok && ident.Name == "run" {
				if len(node.Args) > 0 {
					argTV, ok := result.typeInfo.Types[node.Args[0]]
					if !ok {
						return true
					}
					if types.AssignableTo(argTV.Type, types.Typ[types.String]) {
						s.spxResourceRootDir, _ = getStringLitOrConstValue(node.Args[0], argTV)
					} else {
						documentURI := s.toDocumentURI(result.mainSpxFile)
						result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
							Severity: SeverityError,
							Range: Range{
								Start: FromGopTokenPosition(result.fset.Position(node.Args[0].Pos())),
								End:   FromGopTokenPosition(result.fset.Position(node.Args[0].End())),
							},
							Message: "first argument of run must be a string literal or constant",
						})
					}
					return false
				}
			}
		}
		return true
	})

	for spxFile, gopastFile := range result.mainPkgFiles {
		isInMainSpx := spxFile == result.mainSpxFile
		documentURI := s.toDocumentURI(spxFile)
		gopast.Inspect(gopastFile, func(node gopast.Node) bool {
			switch node := node.(type) {
			case *gopast.ValueSpec:
				for _, name := range node.Names {
					obj := result.typeInfo.Defs[name]
					if obj == nil {
						continue
					}
					objType, ok := obj.Type().(*types.Named)
					if !ok {
						continue
					}

					nameRange := Range{
						Start: FromGopTokenPosition(result.fset.Position(name.Pos())),
						End:   FromGopTokenPosition(result.fset.Position(name.End())),
					}

					var spxResourceValidateFunc func(resourceName string, resourceNameRange Range) []Diagnostic
					switch typeName := objType.String(); typeName {
					case SpxSoundTypeName:
						spxResourceValidateFunc = s.validateSpxSoundResource
					case SpxSpriteTypeName:
						spxResourceValidateFunc = s.validateSpxSpriteResource
					default:
						for _, spxSpriteTypeName := range result.spxSpriteTypeNames {
							if typeName == spxSpriteTypeName {
								if name.Name != strings.TrimPrefix(spxSpriteTypeName, "main.") {
									result.diagnostics[documentURI] = append(result.diagnostics[documentURI], Diagnostic{
										Severity: SeverityError,
										Range:    nameRange,
										Message:  "sprite resource name must match type name for explicit auto-binding to work",
									})
									return true
								}
								spxResourceValidateFunc = s.validateSpxSpriteResource
								break
							}
						}
					}
					var subDiags []Diagnostic
					if spxResourceValidateFunc != nil {
						if isInMainSpx {
							isInFirstVarBlock := false
							firstVarBlock := true
							gopast.Inspect(gopastFile, func(n gopast.Node) bool {
								if decl, ok := n.(*gopast.GenDecl); ok && decl.Tok == goptoken.VAR {
									if firstVarBlock {
										firstVarBlock = false
										isInFirstVarBlock = name.Pos() >= decl.Pos() && name.Pos() <= decl.End()
									}
									return false
								}
								return true
							})
							if isInFirstVarBlock {
								subDiags = spxResourceValidateFunc(name.Name, nameRange)
							} else {
								subDiags = []Diagnostic{{
									Severity: SeverityWarning,
									Range:    nameRange,
									Message:  "resources must be defined in the first var block for auto-binding",
								}}
							}
						} else {
							subDiags = []Diagnostic{{
								Severity: SeverityWarning,
								Range:    nameRange,
								Message:  "auto-binding of resources can only happen in main.spx",
							}}
						}
					}
					result.diagnostics[documentURI] = append(result.diagnostics[documentURI], subDiags...)
				}
			case *gopast.CallExpr:
				var fName string
				switch fun := node.Fun.(type) {
				case *gopast.Ident:
					fName = fun.Name
				case *gopast.SelectorExpr:
					fName = fun.Sel.Name
				default:
					return true
				}

				var subDiags []Diagnostic
				switch strings.ToLower(fName) {
				case "play":
					_, subDiags = s.validateSpxGamePlayCall(result.fset, result.typeInfo, node)
				case "onbackdrop":
					_, subDiags = s.validateSpxGameOrSpriteOnBackdropCall(result.fset, result.typeInfo, node)
				case "setcostume":
					_, _, subDiags = s.validateSpxSpriteSetCostumeCall(result.fset, result.typeInfo, node)
				case "animate":
					_, _, subDiags = s.validateSpxSpriteAnimateCall(result.fset, result.typeInfo, node)
				case "getwidget":
					_, subDiags = s.validateSpxGameGetWidgetCall(result.fset, result.typeInfo, node)
				}
				result.diagnostics[documentURI] = append(result.diagnostics[documentURI], subDiags...)
			}
			return true
		})
	}
	return result, nil
}

// validateSpxGamePlayCall validates a spx.Game.play call. It returns the sound
// resource name and appropriate diagnostics if the call is invalid.
//
// See https://pkg.go.dev/github.com/goplus/spx#Game.Play__0
func (s *Server) validateSpxGamePlayCall(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (soundName string, diags []Diagnostic) {
	tv, ok := typeInfo.Types[callExpr.Fun]
	if !ok {
		return
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return
	}
	recv := sig.Recv()
	if recv == nil {
		return
	}
	recvType := recv.Type()
	if ptr, ok := recvType.(*types.Pointer); ok {
		recvType = ptr.Elem()
	}
	if recvType.String() != SpxGameTypeName {
		return
	}

	if len(callExpr.Args) == 0 {
		return
	}
	argTV, ok := typeInfo.Types[callExpr.Args[0]]
	if !ok {
		return
	}
	soundNameRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Args[0].Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Args[0].End())),
	}
	if types.AssignableTo(argTV.Type, types.Typ[types.String]) {
		soundName, ok = getStringLitOrConstValue(callExpr.Args[0], argTV)
		if !ok {
			return
		}
	} else {
		// Check auto-binding variables of sound resources.
		argType := argTV.Type
		if ptr, ok := argType.(*types.Pointer); ok {
			argType = ptr.Elem()
		}
		if argType.String() != SpxSoundTypeName {
			return
		}
		if ident, ok := callExpr.Args[0].(*gopast.Ident); ok {
			obj := typeInfo.Defs[ident]
			if obj == nil {
				obj = typeInfo.Uses[ident]
			}
			if obj == nil {
				diags = []Diagnostic{{
					Severity: SeverityError,
					Range:    soundNameRange,
					Message:  "cannot determine sound resource name",
				}}
				return
			} else if path.Base(fset.Position(obj.Pos()).Filename) != "main.spx" {
				diags = []Diagnostic{{
					Severity: SeverityError,
					Range:    soundNameRange,
					Message:  "auto-binding of resources only works for variables declared in main.spx",
				}}
				return
			}

			// The variable name is the sound name per auto-binding rules.
			soundName = ident.Name
		} else {
			return
		}
	}
	diags = s.validateSpxSoundResource(soundName, soundNameRange)
	return
}

// validateSpxSoundResource checks if the sound resource exists and returns
// appropriate diagnostics if it doesn't.
func (s *Server) validateSpxSoundResource(soundName string, soundNameRange Range) []Diagnostic {
	if soundName == "" {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    soundNameRange,
			Message:  "sound resource name cannot be empty",
		}}
	}
	if _, err := s.getSpxSoundResource(soundName); err != nil {
		return s.collectDiagnosticsFromGetSoundResourceError(err, soundName, soundNameRange)
	}
	return nil
}

// collectDiagnosticsFromGetSoundResourceError collects diagnostics from an
// error when calling [Server.getSpxSoundResource].
func (s *Server) collectDiagnosticsFromGetSoundResourceError(err error, soundName string, soundNameRange Range) []Diagnostic {
	if errors.Is(err, fs.ErrNotExist) {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    soundNameRange,
			Message:  fmt.Sprintf("sound resource %q not found", soundName),
		}}
	}
	return []Diagnostic{{
		Severity: SeverityError,
		Range:    soundNameRange,
		Message:  fmt.Sprintf("failed to get sound resource %q: %v", soundName, err),
	}}
}

// validateSpxGameOrSpriteOnBackdropCall validates a spx.Game.OnBackdrop or
// spx.Sprite.OnBackdrop call.
//
// See https://pkg.go.dev/github.com/goplus/spx#Game.OnBackdrop__1 and
// https://pkg.go.dev/github.com/goplus/spx#Game.OnBackdrop__1
func (s *Server) validateSpxGameOrSpriteOnBackdropCall(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (backdropName string, diags []Diagnostic) {
	tv, ok := typeInfo.Types[callExpr.Fun]
	if !ok {
		return
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return
	}
	recv := sig.Recv()
	if recv == nil {
		return
	}
	recvType := recv.Type()
	if ptr, ok := recvType.(*types.Pointer); ok {
		recvType = ptr.Elem()
	}
	if recvType.String() != SpxEventSinksTypeName {
		return
	}

	if len(callExpr.Args) == 0 {
		return
	}
	argTV, ok := typeInfo.Types[callExpr.Args[0]]
	if !ok {
		return
	}
	if !types.AssignableTo(argTV.Type, types.Typ[types.String]) {
		return
	}

	backdropName, ok = getStringLitOrConstValue(callExpr.Args[0], argTV)
	if !ok {
		return
	}
	backdropNameRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Args[0].Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Args[0].End())),
	}
	diags = s.validateSpxBackdropResource(backdropName, backdropNameRange)
	return
}

// validateSpxBackdropResource checks if the backdrop resource exists and
// returns appropriate diagnostics if it doesn't.
func (s *Server) validateSpxBackdropResource(backdropName string, backdropNameRange Range) []Diagnostic {
	if backdropName == "" {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    backdropNameRange,
			Message:  "backdrop resource name cannot be empty",
		}}
	}
	if _, err := s.getSpxBackdropResource(backdropName); err != nil {
		return s.collectDiagnosticsFromGetBackdropResourceError(err, backdropName, backdropNameRange)
	}
	return nil
}

// collectDiagnosticsFromGetBackdropResourceError collects diagnostics from an
// error when calling [Server.getSpxBackdropResource].
func (s *Server) collectDiagnosticsFromGetBackdropResourceError(err error, backdropName string, backdropNameRange Range) []Diagnostic {
	if errors.Is(err, fs.ErrNotExist) {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    backdropNameRange,
			Message:  fmt.Sprintf("backdrop resource %q not found", backdropName),
		}}
	}
	return []Diagnostic{{
		Severity: SeverityError,
		Range:    backdropNameRange,
		Message:  fmt.Sprintf("failed to get backdrop resource %q: %v", backdropName, err),
	}}
}

// validateSpxSpriteSetCostumeCall validates a spx.Sprite.SetCostume call.
//
// See https://pkg.go.dev/github.com/goplus/spx#Sprite.SetCostume
func (s *Server) validateSpxSpriteSetCostumeCall(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (spriteName, costumeName string, diags []Diagnostic) {
	callExprRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Fun.Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Fun.End())),
	}

	spriteName, diags = s.validateSpxSpriteFromCallReceiver(fset, typeInfo, callExpr)
	if diags != nil {
		return
	} else if spriteName == "" {
		diags = []Diagnostic{{
			Severity: SeverityWarning,
			Range:    callExprRange,
			Message:  "cannot determine sprite name",
		}}
		return
	}

	spriteResource, err := s.getSpxSpriteResource(spriteName)
	if err != nil {
		diags = s.collectDiagnosticsFromGetSpriteResourceError(err, spriteName, callExprRange)
		return
	}

	if len(callExpr.Args) == 0 {
		return
	}
	argTV, ok := typeInfo.Types[callExpr.Args[0]]
	if !ok {
		return
	}
	if !types.AssignableTo(argTV.Type, types.Typ[types.String]) {
		return
	}

	costumeName, ok = getStringLitOrConstValue(callExpr.Args[0], argTV)
	if !ok {
		return
	}
	costumeNameRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Args[0].Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Args[0].End())),
	}
	if costumeName == "" {
		diags = []Diagnostic{{
			Severity: SeverityError,
			Range:    costumeNameRange,
			Message:  "costume resource name cannot be empty",
		}}
		return
	}
	for _, costume := range spriteResource.Costumes {
		if costume.Name == costumeName {
			return
		}
	}
	diags = []Diagnostic{{
		Severity: SeverityError,
		Range:    costumeNameRange,
		Message:  fmt.Sprintf("costume resource %q not found in sprite %q", costumeName, spriteName),
	}}
	return
}

// validateSpxSpriteAnimateCall validates a spx.Sprite.animate call.
//
// See https://pkg.go.dev/github.com/goplus/spx#Sprite.Animate
func (s *Server) validateSpxSpriteAnimateCall(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (spriteName, animationName string, diags []Diagnostic) {
	callExprRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Fun.Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Fun.End())),
	}

	spriteName, diags = s.validateSpxSpriteFromCallReceiver(fset, typeInfo, callExpr)
	if diags != nil {
		return
	} else if spriteName == "" {
		diags = []Diagnostic{{
			Severity: SeverityWarning,
			Range:    callExprRange,
			Message:  "cannot determine sprite name",
		}}
		return
	}

	spriteResource, err := s.getSpxSpriteResource(spriteName)
	if err != nil {
		diags = s.collectDiagnosticsFromGetSpriteResourceError(err, spriteName, callExprRange)
		return
	}

	if len(callExpr.Args) == 0 {
		return
	}
	argTV, ok := typeInfo.Types[callExpr.Args[0]]
	if !ok {
		return
	}
	if !types.AssignableTo(argTV.Type, types.Typ[types.String]) {
		return
	}

	animationName, ok = getStringLitOrConstValue(callExpr.Args[0], argTV)
	if !ok {
		return
	}
	animationNameRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Args[0].Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Args[0].End())),
	}
	if animationName == "" {
		diags = []Diagnostic{{
			Severity: SeverityError,
			Range:    animationNameRange,
			Message:  "animation resource name cannot be empty",
		}}
		return
	}
	for _, animation := range spriteResource.Animations {
		if animation.Name == animationName {
			return
		}
	}
	diags = []Diagnostic{{
		Severity: SeverityError,
		Range:    animationNameRange,
		Message:  fmt.Sprintf("animation resource %q not found in sprite %q", animationName, spriteName),
	}}
	return
}

// validateSpxSpriteFromCallReceiver validates a method call on a sprite type.
func (s *Server) validateSpxSpriteFromCallReceiver(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (spriteName string, diags []Diagnostic) {
	callExprRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Fun.Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Fun.End())),
	}

	tv, ok := typeInfo.Types[callExpr.Fun]
	if !ok {
		return
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return
	}
	recv := sig.Recv()
	if recv == nil {
		return
	}

	switch fun := callExpr.Fun.(type) {
	case *gopast.Ident:
		spriteName = strings.TrimSuffix(path.Base(fset.Position(callExpr.Pos()).Filename), ".spx")
	case *gopast.SelectorExpr:
		if ident, ok := fun.X.(*gopast.Ident); ok {
			obj := typeInfo.Defs[ident]
			if obj == nil {
				obj = typeInfo.Uses[ident]
			}
			if obj == nil {
				diags = []Diagnostic{{
					Severity: SeverityError,
					Range:    callExprRange,
					Message:  "cannot determine sprite name",
				}}
				return
			} else if path.Base(fset.Position(obj.Pos()).Filename) != "main.spx" {
				diags = []Diagnostic{{
					Severity: SeverityError,
					Range:    callExprRange,
					Message:  "auto-binding of resources only works for variables declared in main.spx",
				}}
				return
			} else {
				spriteName = obj.Name()
			}

			// Fallback to direct identifier name if we couldn't find the definition.
			if spriteName == "" {
				spriteName = ident.Name
			}
		}
	}
	return
}

// validateSpxSpriteResource checks if the sprite resource exists and returns
// appropriate diagnostics if it doesn't.
func (s *Server) validateSpxSpriteResource(spriteName string, spriteNameRange Range) []Diagnostic {
	if _, err := s.getSpxSpriteResource(spriteName); err != nil {
		return s.collectDiagnosticsFromGetSpriteResourceError(err, spriteName, spriteNameRange)
	}
	return nil
}

// collectDiagnosticsFromGetSpriteResourceError collects diagnostics from an
// error when calling [Server.getSpxSpriteResource].
func (s *Server) collectDiagnosticsFromGetSpriteResourceError(err error, spriteName string, spriteNameRange Range) []Diagnostic {
	if errors.Is(err, fs.ErrNotExist) {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    spriteNameRange,
			Message:  fmt.Sprintf("sprite resource %q not found", spriteName),
		}}
	}
	return []Diagnostic{{
		Severity: SeverityError,
		Range:    spriteNameRange,
		Message:  fmt.Sprintf("failed to get sprite resource %q: %v", spriteName, err),
	}}
}

// validateSpxGameGetWidgetCall validates a spx.Game.getWidget call.
//
// See https://pkg.go.dev/github.com/goplus/spx#Gopt_Game_Gopx_GetWidget
func (s *Server) validateSpxGameGetWidgetCall(fset *goptoken.FileSet, typeInfo *goptypesutil.Info, callExpr *gopast.CallExpr) (widgetName string, diags []Diagnostic) {
	tv, ok := typeInfo.Types[callExpr.Fun]
	if !ok {
		return
	}
	sig, ok := tv.Type.(*types.Signature)
	if !ok {
		return
	}
	if sig.String() != "func[T any](sg github.com/goplus/spx.ShapeGetter, name string) *T" {
		return
	}

	if len(callExpr.Args) < 2 {
		return
	}
	argTV, ok := typeInfo.Types[callExpr.Args[1]]
	if !ok {
		return
	}
	if !types.AssignableTo(argTV.Type, types.Typ[types.String]) {
		return
	}

	widgetName, ok = getStringLitOrConstValue(callExpr.Args[1], argTV)
	if !ok {
		return
	}
	widgetNameRange := Range{
		Start: FromGopTokenPosition(fset.Position(callExpr.Args[1].Pos())),
		End:   FromGopTokenPosition(fset.Position(callExpr.Args[1].End())),
	}
	diags = s.validateSpxWidgetResource(widgetName, widgetNameRange)
	return
}

// validateSpxWidgetResource checks if the widget resource exists and returns
// appropriate diagnostics if it doesn't.
func (s *Server) validateSpxWidgetResource(widgetName string, widgetNameRange Range) []Diagnostic {
	if widgetName == "" {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    widgetNameRange,
			Message:  "widget resource name cannot be empty",
		}}
	}
	if _, err := s.getSpxWidgetResource(widgetName); err != nil {
		return s.collectDiagnosticsFromGetWidgetResourceError(err, widgetName, widgetNameRange)
	}
	return nil
}

// collectDiagnosticsFromGetWidgetResourceError collects diagnostics from an
// error when calling [Server.getSpxWidgetResource].
func (s *Server) collectDiagnosticsFromGetWidgetResourceError(err error, widgetName string, widgetNameRange Range) []Diagnostic {
	if errors.Is(err, fs.ErrNotExist) {
		return []Diagnostic{{
			Severity: SeverityError,
			Range:    widgetNameRange,
			Message:  fmt.Sprintf("widget resource %q not found", widgetName),
		}}
	}
	return []Diagnostic{{
		Severity: SeverityError,
		Range:    widgetNameRange,
		Message:  fmt.Sprintf("failed to get widget resource %q: %v", widgetName, err),
	}}
}
