package server

import (
	"errors"
	"go/types"

	gopast "github.com/goplus/gop/ast"
)

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

	gopast.Inspect(astFile, func(node gopast.Node) bool {
		if node == nil || !node.Pos().IsValid() {
			return true
		}
		ident, ok := node.(*gopast.Ident)
		if !ok {
			return true
		}
		obj := result.typeInfo.ObjectOf(ident)
		if obj == nil {
			return true
		}

		identRange := Range{
			Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
			End:   FromGopTokenPosition(result.fset.Position(ident.End())),
		}
		addLinks := func(defs ...SpxDefinition) {
			for _, def := range defs {
				target := URI(def.ID.String())
				links = append(links, DocumentLink{
					Range:  identRange,
					Target: &target,
				})
			}
		}

		if obj.Pkg() == nil {
			addLinks(GetSpxBuiltinDefinition(obj.Name()))
		} else {
			switch obj := obj.(type) {
			case *types.Var:
				addLinks(NewSpxDefinitionForVar(result, obj, result.inferSelectorTypeNameForIdent(ident)))
			case *types.Const:
				addLinks(NewSpxDefinitionForConst(result, obj))
			case *types.TypeName:
				addLinks(NewSpxDefinitionForType(result, obj))
			case *types.Func:
				addLinks(NewSpxDefinitionsForFunc(result, obj, result.inferSelectorTypeNameForIdent(ident))...)
			case *types.PkgName:
				addLinks(NewSpxDefinitionForPkg(result, obj))
			default:
				return true
			}
		}
		return true
	})

	return links, nil
}
