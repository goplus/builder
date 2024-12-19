package server

import "errors"

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_documentHighlight
func (s *Server) textDocumentDocumentHighlight(params *DocumentHighlightParams) (*[]DocumentHighlight, error) {
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

	ident, obj := result.identAndObjectAtASTFilePosition(astFile, params.Position)
	if obj == nil {
		return nil, nil
	}

	var highlights []DocumentHighlight
	if isMainPkgObject(obj) {
		highlights = append(highlights, DocumentHighlight{
			Range: Range{
				Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
				End:   FromGopTokenPosition(result.fset.Position(ident.End())),
			},
			Kind: Text,
		})
	}
	for _, refIdent := range result.refIdentsOf(obj) {
		highlights = append(highlights, DocumentHighlight{
			Range: Range{
				Start: FromGopTokenPosition(result.fset.Position(refIdent.Pos())),
				End:   FromGopTokenPosition(result.fset.Position(refIdent.End())),
			},
			Kind: Text,
		})
	}
	return &highlights, nil
}
