package server

import (
	"errors"
	"fmt"
	"go/types"
	"io/fs"
	"slices"

	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_prepareRename
func (s *Server) textDocumentPrepareRename(params *PrepareRenameParams) (*Range, error) {
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
	if !isRenameableObject(obj) {
		return nil, nil
	}

	return &Range{
		Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
		End:   FromGopTokenPosition(result.fset.Position(ident.End())),
	}, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_rename
func (s *Server) textDocumentRename(params *RenameParams) (*WorkspaceEdit, error) {
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
	if result.hasErrorSeverityDiagnostic {
		return nil, errors.New("cannot rename symbol when there are unresolved error severity diagnostics")
	}

	if refKey, _ := result.spxResourceRefAtASTFilePosition(astFile, params.Position); refKey != nil {
		return s.spxRenameResourcesWithCompileResult(result, []SpxRenameResourceParams{{
			Resource: SpxResourceIdentifier{
				URI: refKey.URI(),
			},
			NewName: params.NewName,
		}})
	}

	ident, obj := result.identAndObjectAtASTFilePosition(astFile, params.Position)
	if !isRenameableObject(obj) {
		return nil, nil
	}

	workspaceEdit := WorkspaceEdit{
		Changes: map[DocumentURI][]TextEdit{
			s.toDocumentURI(spxFile): {
				{
					Range: Range{
						Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
						End:   FromGopTokenPosition(result.fset.Position(ident.End())),
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

// spxRenameResourceAtRefs updates resource names at reference locations by
// matching the reference key.
func (s *Server) spxRenameResourceAtRefs(result *compileResult, refKey SpxResourceRefKey, newName string) map[DocumentURI][]TextEdit {
	changes := make(map[DocumentURI][]TextEdit)
	for _, ref := range result.spxResourceRefs[refKey] {
		startPos := result.fset.Position(ref.Node.Pos())
		endPos := result.fset.Position(ref.Node.End())

		if expr, ok := ref.Node.(gopast.Expr); ok && types.AssignableTo(result.typeInfo.TypeOf(expr), types.Typ[types.String]) {
			if ident, ok := expr.(*gopast.Ident); ok {
				// It has to be a constant. So we must find its declaration site and
				// use the position of its value instead.
				constObj := result.typeInfo.ObjectOf(ident)
				for ident, obj := range result.typeInfo.Defs {
					if obj != constObj {
						continue
					}
					parent, ok := ident.Obj.Decl.(*gopast.ValueSpec)
					if !ok || len(parent.Values) == 0 {
						continue
					}
					if slices.Contains(parent.Names, ident) {
						startPos = result.fset.Position(parent.Values[0].Pos())
						endPos = result.fset.Position(parent.Values[0].End())
						break
					}
				}
			}

			// Adjust positions to exclude quotes.
			startPos.Offset++
			startPos.Column++
			endPos.Offset--
			endPos.Column--
		}

		documentURI := s.toDocumentURI(startPos.Filename)
		textEdit := TextEdit{
			Range: Range{
				Start: FromGopTokenPosition(startPos),
				End:   FromGopTokenPosition(endPos),
			},
			NewText: newName,
		}
		if !slices.Contains(changes[documentURI], textEdit) {
			changes[documentURI] = append(changes[documentURI], textEdit)
		}
	}
	return changes
}

// spxRenameBackdropResource renames a spx backdrop resource.
func (s *Server) spxRenameBackdropResource(result *compileResult, refKey SpxBackdropResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	if _, err := s.getSpxBackdropResource(newName); err == nil {
		return nil, fmt.Errorf("backdrop resource %q already exists", newName)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("failed to check if backdrop resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, refKey, newName), nil
}

// spxRenameSoundResource renames a spx sound resource.
func (s *Server) spxRenameSoundResource(result *compileResult, refKey SpxSoundResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	if _, err := s.getSpxSoundResource(newName); err == nil {
		return nil, fmt.Errorf("sound resource %q already exists", newName)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("failed to check if sound resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, refKey, newName), nil
}

// spxRenameSpriteResource renames a spx sprite resource.
func (s *Server) spxRenameSpriteResource(result *compileResult, refKey SpxSpriteResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	if _, err := s.getSpxSpriteResource(newName); err == nil {
		return nil, fmt.Errorf("sprite resource %q already exists", newName)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("failed to check if sprite resource %q already exists", newName)
	}
	changes := s.spxRenameResourceAtRefs(result, refKey, newName)
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || expr.Pos() == goptoken.NoPos || !tv.IsType() {
			continue
		}
		if tv.Type.String() == "main."+refKey.SpriteName {
			documentURI := s.toDocumentURI(result.fset.Position(expr.Pos()).Filename)
			textEdit := TextEdit{
				Range: Range{
					Start: FromGopTokenPosition(result.fset.Position(expr.Pos())),
					End:   FromGopTokenPosition(result.fset.Position(expr.End())),
				},
				NewText: newName,
			}
			if !slices.Contains(changes[documentURI], textEdit) {
				changes[documentURI] = append(changes[documentURI], textEdit)
			}
		}
	}
	return changes, nil
}

// spxRenameSpriteCostumeResource renames a spx sprite costume resource.
func (s *Server) spxRenameSpriteCostumeResource(result *compileResult, refKey SpxSpriteCostumeResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	spxSpriteResource, err := s.getSpxSpriteResource(refKey.SpriteName)
	if err != nil {
		return nil, fmt.Errorf("failed to get sprite resource %q: %w", refKey.SpriteName, err)
	}
	for _, costume := range spxSpriteResource.Costumes {
		if costume.Name == newName {
			return nil, fmt.Errorf("sprite costume resource %q already exists", newName)
		}
	}
	return s.spxRenameResourceAtRefs(result, refKey, newName), nil
}

// spxRenameSpriteAnimationResource renames a spx sprite animation resource.
func (s *Server) spxRenameSpriteAnimationResource(result *compileResult, refKey SpxSpriteAnimationResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	spxSpriteResource, err := s.getSpxSpriteResource(refKey.SpriteName)
	if err != nil {
		return nil, fmt.Errorf("failed to get sprite resource %q: %w", refKey.SpriteName, err)
	}
	for _, animation := range spxSpriteResource.Animations {
		if animation.Name == newName {
			return nil, fmt.Errorf("sprite animation resource %q already exists", newName)
		}
	}
	return s.spxRenameResourceAtRefs(result, refKey, newName), nil
}

// spxRenameWidgetResource renames a spx widget resource.
func (s *Server) spxRenameWidgetResource(result *compileResult, refKey SpxWidgetResourceRefKey, newName string) (map[DocumentURI][]TextEdit, error) {
	if _, err := s.getSpxWidgetResource(newName); err == nil {
		return nil, fmt.Errorf("widget resource %q already exists", newName)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("failed to check if widget resource %q already exists", newName)
	}
	return s.spxRenameResourceAtRefs(result, refKey, newName), nil
}
