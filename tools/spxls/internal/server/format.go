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

	formatted, err := formatSpx(content)
	if err != nil {
		return nil, fmt.Errorf("failed to format spx source file: %w", err)
	}

	if bytes.Equal(content, formatted) {
		return nil, nil // No changes.
	}

	// Simply replace the entire document.
	lines := bytes.Count(content, []byte("\n"))
	lastNewLine := bytes.LastIndex(content, []byte("\n"))
	lastLineLen := len(content) - (lastNewLine + 1)
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
	f, err := gopparser.ParseFile(fset, "main.spx", src, gopparser.ParseComments|gopparser.ParseGoPlusClass)
	if err != nil {
		return nil, err
	}

	gopast.SortImports(fset, f)

	// Find all var blocks and function declarations.
	var (
		varBlocks  []*gopast.GenDecl
		funcDecls  []gopast.Decl
		otherDecls []gopast.Decl
	)
	for _, decl := range f.Decls {
		switch d := decl.(type) {
		case *gopast.GenDecl:
			if d.Tok == goptoken.VAR {
				varBlocks = append(varBlocks, d)
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
	if len(varBlocks) > 0 {
		// Merge multiple var blocks into a single one.
		firstVarBlock := varBlocks[0]
		firstVarBlock.Lparen = firstVarBlock.Pos()
		if len(varBlocks) > 1 {
			firstVarBlock.Rparen = varBlocks[len(varBlocks)-1].End()
			for _, varBlock := range varBlocks[1:] {
				for _, spec := range varBlock.Specs {
					valueSpec, ok := spec.(*gopast.ValueSpec)
					if !ok {
						return nil, fmt.Errorf("unexpected non-value spec in var block: %T", spec)
					}
					firstVarBlock.Specs = append(firstVarBlock.Specs, valueSpec)
				}
			}
		} else {
			firstVarBlock.Rparen = firstVarBlock.End()
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
