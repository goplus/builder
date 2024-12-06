package server

import (
	"errors"
	"fmt"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_documentLink
func (s *Server) textDocumentDocumentLink(params *DocumentLinkParams) ([]DocumentLink, error) {
	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get path from document uri: %w", err)
	}

	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}
	if _, ok := result.mainPkgFiles[spxFile]; !ok {
		return nil, nil // Cannot find the spx file in workspace.
	}

	var links []DocumentLink
	for refKey, refs := range result.spxResourceRefs {
		for _, ref := range refs {
			startPos := result.fset.Position(ref.Pos())
			if startPos.Filename != spxFile {
				continue
			}
			target := URI(refKey.URI())
			links = append(links, DocumentLink{
				Range: Range{
					Start: FromGopTokenPosition(startPos),
					End:   FromGopTokenPosition(result.fset.Position(ref.End())),
				},
				Target: &target,
			})
		}
	}
	return links, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#documentLink_resolve
func (s *Server) documentLinkResolve(params *DocumentLink) (*DocumentLink, error) {
	return params, nil // No additional resolution is needed at this time.
}
