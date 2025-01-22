package server

import (
	"errors"
	"go/types"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_declaration
func (s *Server) textDocumentDeclaration(params *DeclarationParams) (any, error) {
	return s.textDocumentDefinition(&DefinitionParams{
		TextDocumentPositionParams: params.TextDocumentPositionParams,
		WorkDoneProgressParams:     params.WorkDoneProgressParams,
		PartialResultParams:        params.PartialResultParams,
	})
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_definition
func (s *Server) textDocumentDefinition(params *DefinitionParams) (any, error) {
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

	obj := result.typeInfo.ObjectOf(result.identAtASTFilePosition(astFile, params.Position))
	if !isMainPkgObject(obj) {
		return nil, nil
	}

	defIdent := result.defIdentFor(obj)
	if defIdent == nil {
		objPos := obj.Pos()
		if !result.isInFset(objPos) {
			return nil, nil
		}
		return s.createLocationFromPos(result.fset, objPos), nil
	} else if !result.isInFset(defIdent.Pos()) {
		return nil, nil
	}
	return s.createLocationFromIdent(result.fset, defIdent), nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_typeDefinition
func (s *Server) textDocumentTypeDefinition(params *TypeDefinitionParams) (any, error) {
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

	obj := result.typeInfo.ObjectOf(result.identAtASTFilePosition(astFile, params.Position))
	if !isMainPkgObject(obj) {
		return nil, nil
	}

	objType := unwrapPointerType(obj.Type())
	named, ok := objType.(*types.Named)
	if !ok {
		return nil, nil
	}

	objPos := named.Obj().Pos()
	if !result.isInFset(objPos) {
		return nil, nil
	}
	return s.createLocationFromPos(result.fset, objPos), nil
}
