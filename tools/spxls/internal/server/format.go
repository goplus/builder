package server

import (
	"bytes"
	"fmt"
	"io/fs"
	"path"

	gopast "github.com/goplus/gop/ast"
	gopfmt "github.com/goplus/gop/format"
	gopparser "github.com/goplus/gop/parser"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_formatting
func (s *Server) textDocumentFormatting(params *DocumentFormattingParams) ([]TextEdit, error) {
	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get path from document uri: %w", err)
	}
	if path.Ext(spxFile) != ".spx" {
		return nil, nil // Not a spx source file.
	}

	content, err := fs.ReadFile(s.workspaceRootFS, spxFile)
	if err != nil {
		return nil, err
	}

	formatted, err := gopfmt.Source(content, false, spxFile)
	if err != nil {
		return nil, fmt.Errorf("failed to format document %q: %w", spxFile, err)
	}
	formatted, err = formatSpx(formatted)
	if err != nil {
		return nil, fmt.Errorf("failed to format spx source file: %w", err)
	}

	if bytes.Equal(content, formatted) {
		return nil, nil // No changes.
	}

	// Simply replace the entire document.
	lines := bytes.Count(content, []byte("\n"))
	lastLineLen := len(bytes.TrimRight(bytes.Split(content, []byte("\n"))[lines], "\r"))
	return []TextEdit{
		{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End: Position{
					Line:      uint32(lines),
					Character: uint32(lastLineLen),
				},
			},
			NewText: string(formatted),
		},
	}, nil
}

// formatSpx formats a spx source file.
func formatSpx(src []byte) ([]byte, error) {
	// Parse the source into AST.
	fset := goptoken.NewFileSet()
	f, err := gopparser.ParseFile(fset, "main.spx", src, gopparser.ParseComments)
	if err != nil {
		return nil, err
	}

	// Find all var blocks and function declarations.
	var (
		firstVarBlock *gopast.GenDecl
		varsToMerge   []*gopast.GenDecl
		funcDecls     []gopast.Decl
		otherDecls    []gopast.Decl
	)
	for _, decl := range f.Decls {
		switch d := decl.(type) {
		case *gopast.GenDecl:
			if d.Tok == goptoken.VAR {
				if firstVarBlock == nil {
					firstVarBlock = d
				} else {
					varsToMerge = append(varsToMerge, d)
				}
			} else {
				otherDecls = append(otherDecls, d)
			}
		case *gopast.FuncDecl:
			funcDecls = append(funcDecls, d)
		default:
			otherDecls = append(otherDecls, d)
		}
	}

	// Reorder declarations: vars -> funcs -> others.
	//
	// See https://github.com/goplus/builder/issues/591 and https://github.com/goplus/builder/issues/752.
	newDecls := make([]gopast.Decl, 0, len(f.Decls))
	if firstVarBlock != nil {
		// Merge multiple var blocks into a single one.
		firstVarBlock.Lparen = goptoken.Pos(1) // Force parenthesized form.
		for _, varBlock := range varsToMerge {
			for _, spec := range varBlock.Specs {
				valueSpec, ok := spec.(*gopast.ValueSpec)
				if !ok {
					return nil, fmt.Errorf("unexpected non-value spec in var block: %T", spec)
				}
				for _, name := range valueSpec.Names {
					name.NamePos = goptoken.NoPos
				}
				firstVarBlock.Specs = append(firstVarBlock.Specs, valueSpec)
			}
		}
		newDecls = append(newDecls, firstVarBlock)
	}
	newDecls = append(newDecls, funcDecls...)
	newDecls = append(newDecls, otherDecls...)
	f.Decls = newDecls

	// Format the modified AST.
	var buf bytes.Buffer
	if err := gopfmt.Node(&buf, fset, f); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
