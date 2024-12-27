package server

import (
	"errors"
	"strings"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_hover
func (s *Server) textDocumentHover(params *HoverParams) (*Hover, error) {
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

	if spxResourceRef := result.spxResourceRefAtASTFilePosition(astFile, params.Position); spxResourceRef != nil {
		return &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: spxResourceRef.ID.URI().HTML(),
			},
			Range: Range{
				Start: FromGopTokenPosition(result.fset.Position(spxResourceRef.Node.Pos())),
				End:   FromGopTokenPosition(result.fset.Position(spxResourceRef.Node.End())),
			},
		}, nil
	}

	ident := result.identAtASTFilePosition(astFile, params.Position)
	if ident == nil {
		return nil, nil
	}

	spxDefs := result.spxDefinitionsForIdent(ident)
	if spxDefs == nil {
		return nil, nil
	}

	var hoverContent strings.Builder
	for _, spxDef := range spxDefs {
		hoverContent.WriteString(spxDef.HTML())
	}
	return &Hover{
		Contents: MarkupContent{
			Kind:  Markdown,
			Value: hoverContent.String(),
		},
		Range: Range{
			Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
			End:   FromGopTokenPosition(result.fset.Position(ident.End())),
		},
	}, nil
}
