package server

import (
	"errors"
	"fmt"
	"go/types"

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

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_diagnostic
func (s *Server) textDocumentDiagnostic(params *DocumentDiagnosticParams) (*DocumentDiagnosticReport, error) {
	diags, err := s.diagnose()
	if err != nil {
		return nil, err
	}

	return &DocumentDiagnosticReport{Value: &RelatedFullDocumentDiagnosticReport{
		FullDocumentDiagnosticReport: FullDocumentDiagnosticReport{
			Kind:  string(DiagnosticFull),
			Items: diags[params.TextDocument.URI],
		},
	}}, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#workspace_diagnostic
func (s *Server) workspaceDiagnostic(params *WorkspaceDiagnosticParams) (*WorkspaceDiagnosticReport, error) {
	diags, err := s.diagnose()
	if err != nil {
		return nil, err
	}

	var items []WorkspaceDocumentDiagnosticReport
	for file, fileDiags := range diags {
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

// diagnose performs diagnostic checks for spx source files and returns diagnostics for each file.
func (s *Server) diagnose() (map[DocumentURI][]Diagnostic, error) {
	spxFiles, err := s.spxFiles()
	if err != nil {
		return nil, fmt.Errorf("get spx files failed: %w", err)
	}

	diags := make(map[DocumentURI][]Diagnostic, len(spxFiles))

	fset := goptoken.NewFileSet()
	gpfs := vfs.NewGopParserFS(s.workspaceRootFS)
	mainPkgFiles := make(map[string]*gopast.File)
	for _, file := range spxFiles {
		documentURI := s.toDocumentURI(file)
		diags[documentURI] = nil

		f, err := gopparser.ParseFSEntry(fset, gpfs, file, nil, gopparser.Config{
			Mode: gopparser.AllErrors | gopparser.ParseComments,
		})
		if err != nil {
			// Handle parse errors.
			var parseErr gopscanner.ErrorList
			if errors.As(err, &parseErr) {
				for _, e := range parseErr {
					diags[documentURI] = append(diags[documentURI], Diagnostic{
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
				diags[documentURI] = append(diags[documentURI], Diagnostic{
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
			diags[documentURI] = append(diags[documentURI], Diagnostic{
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
			mainPkgFiles[file] = f
		}
	}
	if len(mainPkgFiles) == 0 {
		return nil, errors.New("no valid spx files found in main package")
	}

	mod := gopmod.New(gopmodload.Default)
	if err := mod.ImportClasses(); err != nil {
		return nil, fmt.Errorf("import classes failed: %w", err)
	}

	typeInfo := &goptypesutil.Info{
		Types:      make(map[gopast.Expr]types.TypeAndValue),
		Defs:       make(map[*gopast.Ident]types.Object),
		Uses:       make(map[*gopast.Ident]types.Object),
		Implicits:  make(map[gopast.Node]types.Object),
		Selections: make(map[*gopast.SelectorExpr]*types.Selection),
		Scopes:     make(map[gopast.Node]*types.Scope),
	}
	if err := goptypesutil.NewChecker(
		&types.Config{
			Error: func(err error) {
				if typeErr, ok := err.(types.Error); ok {
					position := typeErr.Fset.Position(typeErr.Pos)
					documentURI := s.toDocumentURI(position.Filename)
					diags[documentURI] = append(diags[documentURI], Diagnostic{
						Severity: SeverityError,
						Range: Range{
							Start: FromGopTokenPosition(position),
							End:   FromGopTokenPosition(position),
						},
						Message: typeErr.Msg,
					})
				}
			},
			Importer: internal.NewImporter(fset),
		},
		&goptypesutil.Config{
			Types: types.NewPackage("main", "main"),
			Fset:  fset,
			Mod:   mod,
		},
		nil,
		typeInfo,
	).Files(nil, gopASTFileMapToSlice(mainPkgFiles)); err != nil {
		// Errors should be handled by the type checker.
	}

	// TODO: spx resource reference check.

	return diags, nil
}
