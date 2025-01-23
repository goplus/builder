package server

import (
	"fmt"
	"go/types"
	"slices"

	gopast "github.com/goplus/gop/ast"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_prepareRename
func (s *Server) textDocumentPrepareRename(params *PrepareRenameParams) (*Range, error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	ident := result.identAtASTFilePosition(astFile, params.Position)
	if ident == nil {
		return nil, nil
	}
	obj := result.typeInfo.ObjectOf(ident)
	if !isRenameableObject(obj) {
		return nil, nil
	}
	defIdent := result.defIdentFor(obj)
	if defIdent == nil || !result.isInFset(defIdent.Pos()) {
		return nil, nil
	}

	return &Range{
		Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
		End:   FromGopTokenPosition(result.fset.Position(ident.End())),
	}, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_rename
func (s *Server) textDocumentRename(params *RenameParams) (*WorkspaceEdit, error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	if spxResourceRef := result.spxResourceRefAtASTFilePosition(astFile, params.Position); spxResourceRef != nil {
		return s.spxRenameResourcesWithCompileResult(result, []SpxRenameResourceParams{{
			Resource: SpxResourceIdentifier{
				URI: spxResourceRef.ID.URI(),
			},
			NewName: params.NewName,
		}})
	}

	obj := result.typeInfo.ObjectOf(result.identAtASTFilePosition(astFile, params.Position))
	if !isRenameableObject(obj) {
		return nil, nil
	}
	defIdent := result.defIdentFor(obj)
	if defIdent == nil || !result.isInFset(defIdent.Pos()) {
		return nil, fmt.Errorf("failed to find definition of object %q", obj.Name())
	}

	defLoc := s.createLocationFromIdent(result.fset, defIdent)

	workspaceEdit := WorkspaceEdit{
		Changes: map[DocumentURI][]TextEdit{
			defLoc.URI: {
				{
					Range: Range{
						Start: FromGopTokenPosition(result.fset.Position(defIdent.Pos())),
						End:   FromGopTokenPosition(result.fset.Position(defIdent.End())),
					},
					NewText: params.NewName,
				},
			},
		},
	}
	for _, refLoc := range s.findReferenceLocations(result, obj) {
		workspaceEdit.Changes[refLoc.URI] = append(workspaceEdit.Changes[refLoc.URI], TextEdit{
			Range:   refLoc.Range,
			NewText: params.NewName,
		})
	}
	return &workspaceEdit, nil
}

// spxRenameResourceAtRefs updates spx resource names at reference locations by
// matching the spx resource ID.
func (s *Server) spxRenameResourceAtRefs(result *compileResult, id SpxResourceID, newName string) map[DocumentURI][]TextEdit {
	changes := make(map[DocumentURI][]TextEdit)
	seenTextEdits := make(map[DocumentURI]map[TextEdit]struct{})
	for _, ref := range result.spxResourceRefs {
		if ref.ID != id {
			continue
		}

		nodePos := result.fset.Position(ref.Node.Pos())
		nodeEnd := result.fset.Position(ref.Node.End())

		if expr, ok := ref.Node.(gopast.Expr); ok && types.AssignableTo(result.typeInfo.TypeOf(expr), types.Typ[types.String]) {
			if ident, ok := expr.(*gopast.Ident); ok {
				// It has to be a constant. So we must find its declaration site and
				// use the position of its value instead.
				defIdent := result.defIdentFor(result.typeInfo.ObjectOf(ident))
				if defIdent != nil && result.isInFset(defIdent.Pos()) {
					parent, ok := defIdent.Obj.Decl.(*gopast.ValueSpec)
					if ok && slices.Contains(parent.Names, defIdent) && len(parent.Values) > 0 {
						nodePos = result.fset.Position(parent.Values[0].Pos())
						nodeEnd = result.fset.Position(parent.Values[0].End())
					}
				}
			}

			// Adjust positions to exclude quotes.
			nodePos.Offset++
			nodePos.Column++
			nodeEnd.Offset--
			nodeEnd.Column--
		}

		documentURI := s.toDocumentURI(nodePos.Filename)
		textEdit := TextEdit{
			Range: Range{
				Start: FromGopTokenPosition(nodePos),
				End:   FromGopTokenPosition(nodeEnd),
			},
			NewText: newName,
		}

		if _, ok := seenTextEdits[documentURI]; !ok {
			seenTextEdits[documentURI] = make(map[TextEdit]struct{})
		}
		if _, ok := seenTextEdits[documentURI][textEdit]; ok {
			continue
		}
		seenTextEdits[documentURI][textEdit] = struct{}{}

		changes[documentURI] = append(changes[documentURI], textEdit)
	}
	return changes
}

// spxRenameBackdropResource renames an spx backdrop resource.
func (s *Server) spxRenameBackdropResource(result *compileResult, id SpxBackdropResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	if result.spxResourceSet.Backdrop(newName) != nil {
		return nil, fmt.Errorf("backdrop resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, id, newName), nil
}

// spxRenameSoundResource renames an spx sound resource.
func (s *Server) spxRenameSoundResource(result *compileResult, id SpxSoundResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	if result.spxResourceSet.Sound(newName) != nil {
		return nil, fmt.Errorf("sound resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, id, newName), nil
}

// spxRenameSpriteResource renames an spx sprite resource.
func (s *Server) spxRenameSpriteResource(result *compileResult, id SpxSpriteResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	if result.spxResourceSet.Sprite(newName) != nil {
		return nil, fmt.Errorf("sprite resource %q already exists", newName)
	}
	changes := s.spxRenameResourceAtRefs(result, id, newName)
	seenTextEdits := make(map[DocumentURI]map[TextEdit]struct{})
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || !expr.Pos().IsValid() || !tv.IsType() {
			continue
		}
		if tv.Type.String() == "main."+id.SpriteName {
			documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
			textEdit := TextEdit{
				Range: Range{
					Start: FromGopTokenPosition(result.fset.Position(expr.Pos())),
					End:   FromGopTokenPosition(result.fset.Position(expr.End())),
				},
				NewText: newName,
			}

			if _, ok := seenTextEdits[documentURI]; !ok {
				seenTextEdits[documentURI] = make(map[TextEdit]struct{})
			}
			if _, ok := seenTextEdits[documentURI][textEdit]; ok {
				continue
			}
			seenTextEdits[documentURI][textEdit] = struct{}{}

			changes[documentURI] = append(changes[documentURI], textEdit)
		}
	}
	return changes, nil
}

// spxRenameSpriteCostumeResource renames an spx sprite costume resource.
func (s *Server) spxRenameSpriteCostumeResource(result *compileResult, id SpxSpriteCostumeResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	spxSpriteResource := result.spxResourceSet.Sprite(id.SpriteName)
	if spxSpriteResource == nil {
		return nil, fmt.Errorf("sprite resource %q not found", id.SpriteName)
	}
	for _, costume := range spxSpriteResource.Costumes {
		if costume.Name == newName {
			return nil, fmt.Errorf("sprite costume resource %q already exists", newName)
		}
	}
	return s.spxRenameResourceAtRefs(result, id, newName), nil
}

// spxRenameSpriteAnimationResource renames an spx sprite animation resource.
func (s *Server) spxRenameSpriteAnimationResource(result *compileResult, id SpxSpriteAnimationResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	spxSpriteResource := result.spxResourceSet.Sprite(id.SpriteName)
	if spxSpriteResource == nil {
		return nil, fmt.Errorf("sprite resource %q not found", id.SpriteName)
	}
	for _, animation := range spxSpriteResource.Animations {
		if animation.Name == newName {
			return nil, fmt.Errorf("sprite animation resource %q already exists", newName)
		}
	}
	return s.spxRenameResourceAtRefs(result, id, newName), nil
}

// spxRenameWidgetResource renames an spx widget resource.
func (s *Server) spxRenameWidgetResource(result *compileResult, id SpxWidgetResourceID, newName string) (map[DocumentURI][]TextEdit, error) {
	if result.spxResourceSet.Widget(newName) != nil {
		return nil, fmt.Errorf("widget resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, id, newName), nil
}
