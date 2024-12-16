package server

import "errors"

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_documentLink
func (s *Server) textDocumentDocumentLink(params *DocumentLinkParams) ([]DocumentLink, error) {
	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil
		}
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	var links []DocumentLink
	for refKey, refs := range result.spxResourceRefs {
		for _, ref := range refs {
			startPos := result.fset.Position(ref.Node.Pos())
			if startPos.Filename != spxFile {
				continue
			}
			target := URI(refKey.URI())
			links = append(links, DocumentLink{
				Range: Range{
					Start: FromGopTokenPosition(startPos),
					End:   FromGopTokenPosition(result.fset.Position(ref.Node.End())),
				},
				Target: &target,
				Data: SpxResourceRefDocumentLinkData{
					Kind: ref.Kind,
				},
			})
		}
	}
	return links, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#documentLink_resolve
func (s *Server) documentLinkResolve(params *DocumentLink) (*DocumentLink, error) {
	return params, nil // No additional resolution is needed at this time.
}
