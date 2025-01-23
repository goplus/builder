package server

import (
	"slices"

	gopast "github.com/goplus/gop/ast"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_documentLink
func (s *Server) textDocumentDocumentLink(params *DocumentLinkParams) (links []DocumentLink, err error) {
	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	if linksIface, ok := result.computedCache.documentLinks.Load(params.TextDocument.URI); ok {
		return linksIface.([]DocumentLink), nil
	}
	defer func() {
		if err == nil {
			result.computedCache.documentLinks.Store(params.TextDocument.URI, slices.Clip(links))
		}
	}()

	// Add links for spx resource references.
	links = slices.Grow(links, len(result.spxResourceRefs))
	for _, spxResourceRef := range result.spxResourceRefs {
		nodePos := result.fset.Position(spxResourceRef.Node.Pos())
		if nodePos.Filename != spxFile {
			continue
		}
		target := URI(spxResourceRef.ID.URI())
		links = append(links, DocumentLink{
			Range: Range{
				Start: FromGopTokenPosition(nodePos),
				End:   FromGopTokenPosition(result.fset.Position(spxResourceRef.Node.End())),
			},
			Target: &target,
			Data: SpxResourceRefDocumentLinkData{
				Kind: spxResourceRef.Kind,
			},
		})
	}

	// Add links for spx definitions.
	links = slices.Grow(links, len(result.typeInfo.Defs)+len(result.typeInfo.Uses))
	addLinksForIdent := func(ident *gopast.Ident) {
		identPos := result.fset.Position(ident.Pos())
		if identPos.Filename != spxFile {
			return
		}
		if spxDefs := result.spxDefinitionsForIdent(ident); spxDefs != nil {
			identRange := Range{
				Start: FromGopTokenPosition(identPos),
				End:   FromGopTokenPosition(result.fset.Position(ident.End())),
			}
			for _, spxDef := range spxDefs {
				target := URI(spxDef.ID.String())
				links = append(links, DocumentLink{
					Range:  identRange,
					Target: &target,
				})
			}
		}
	}
	for ident := range result.typeInfo.Defs {
		addLinksForIdent(ident)
	}
	for ident := range result.typeInfo.Uses {
		addLinksForIdent(ident)
	}
	return
}
