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
		if result.nodeFilename(spxResourceRef.Node) != spxFile {
			continue
		}
		target := URI(spxResourceRef.ID.URI())
		links = append(links, DocumentLink{
			Range:  result.rangeForNode(spxResourceRef.Node),
			Target: &target,
			Data: SpxResourceRefDocumentLinkData{
				Kind: spxResourceRef.Kind,
			},
		})
	}

	// Add links for spx definitions.
	links = slices.Grow(links, len(result.typeInfo.Defs)+len(result.typeInfo.Uses))
	addLinksForIdent := func(ident *gopast.Ident) {
		if result.nodeFilename(ident) != spxFile {
			return
		}
		if spxDefs := result.spxDefinitionsForIdent(ident); spxDefs != nil {
			identRange := result.rangeForNode(ident)
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
