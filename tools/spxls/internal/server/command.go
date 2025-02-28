package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"go/types"
	"slices"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/util"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_executeCommand
func (s *Server) workspaceExecuteCommand(params *ExecuteCommandParams) (any, error) {
	switch params.Command {
	case "spx.renameResources":
		var cmdParams []SpxRenameResourceParams
		for _, arg := range params.Arguments {
			var cmdParam SpxRenameResourceParams
			if err := json.Unmarshal(arg, &cmdParam); err != nil {
				return nil, fmt.Errorf("failed to unmarshal command argument as SpxRenameResourceParams: %w", err)
			}
			cmdParams = append(cmdParams, cmdParam)
		}
		return s.spxRenameResources(cmdParams)
	case "spx.getDefinitions":
		var cmdParams []SpxGetDefinitionsParams
		for _, arg := range params.Arguments {
			var cmdParam SpxGetDefinitionsParams
			if err := json.Unmarshal(arg, &cmdParam); err != nil {
				return nil, fmt.Errorf("failed to unmarshal command argument as SpxGetDefinitionsParams: %w", err)
			}
			cmdParams = append(cmdParams, cmdParam)
		}
		return s.spxGetDefinitions(cmdParams)
	}
	return nil, fmt.Errorf("unknown command: %s", params.Command)
}

// spxRenameResources renames spx resources in the workspace.
func (s *Server) spxRenameResources(params []SpxRenameResourceParams) (*WorkspaceEdit, error) {
	result, err := s.compile()
	if err != nil {
		return nil, err
	}
	return s.spxRenameResourcesWithCompileResult(result, params)
}

// spxRenameResourcesWithCompileResult renames spx resources in the workspace with the given compile result.
func (s *Server) spxRenameResourcesWithCompileResult(result *compileResult, params []SpxRenameResourceParams) (*WorkspaceEdit, error) {
	workspaceEdit := WorkspaceEdit{
		Changes: make(map[DocumentURI][]TextEdit),
	}
	seenTextEdits := make(map[DocumentURI]map[TextEdit]struct{})
	for _, param := range params {
		id, err := ParseSpxResourceURI(param.Resource.URI)
		if err != nil {
			return nil, fmt.Errorf("failed to parse spx resource URI: %w", err)
		}
		var changes map[DocumentURI][]TextEdit
		switch id := id.(type) {
		case SpxBackdropResourceID:
			changes, err = s.spxRenameBackdropResource(result, id, param.NewName)
		case SpxSoundResourceID:
			changes, err = s.spxRenameSoundResource(result, id, param.NewName)
		case SpxSpriteResourceID:
			changes, err = s.spxRenameSpriteResource(result, id, param.NewName)
		case SpxSpriteCostumeResourceID:
			changes, err = s.spxRenameSpriteCostumeResource(result, id, param.NewName)
		case SpxSpriteAnimationResourceID:
			changes, err = s.spxRenameSpriteAnimationResource(result, id, param.NewName)
		case SpxWidgetResourceID:
			changes, err = s.spxRenameWidgetResource(result, id, param.NewName)
		default:
			return nil, fmt.Errorf("unsupported spx resource type: %T", id)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to rename spx resource %q: %w", param.Resource.URI, err)
		}
		for documentURI, textEdits := range changes {
			if _, ok := seenTextEdits[documentURI]; !ok {
				seenTextEdits[documentURI] = make(map[TextEdit]struct{})
			}
			for _, textEdit := range textEdits {
				if _, ok := seenTextEdits[documentURI][textEdit]; ok {
					continue
				}
				seenTextEdits[documentURI][textEdit] = struct{}{}

				workspaceEdit.Changes[documentURI] = append(workspaceEdit.Changes[documentURI], textEdit)
			}
		}
	}
	return &workspaceEdit, nil
}

// spxGetDefinitions gets spx definitions at a specific position in a document.
func (s *Server) spxGetDefinitions(params []SpxGetDefinitionsParams) ([]SpxDefinitionIdentifier, error) {
	if l := len(params); l == 0 {
		return nil, nil
	} else if l > 1 {
		return nil, errors.New("spx.getDefinitions only supports one document at a time")
	}
	param := params[0]

	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(param.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}
	astFileScope := result.typeInfo.Scopes[astFile]

	// Find the innermost scope contains the position.
	tokenFile := result.fset.File(astFile.Pos())
	pos := posAt(tokenFile, param.Position)
	if !pos.IsValid() {
		return nil, nil
	}
	innermostScope := result.innermostScopeAt(pos)
	if innermostScope == nil {
		return nil, nil
	}
	isInSpxEventHandler := result.isInSpxEventHandler(pos)

	var defIDs []SpxDefinitionIdentifier
	seenDefIDs := make(map[string]struct{})
	addDefID := func(defID SpxDefinitionIdentifier) {
		if _, ok := seenDefIDs[defID.String()]; ok {
			return
		}
		seenDefIDs[defID.String()] = struct{}{}
		defIDs = append(defIDs, defID)
	}
	addDefs := func(defs ...SpxDefinition) {
		defIDs = slices.Grow(defIDs, len(defs))
		for _, def := range defs {
			addDefID(def.ID)
		}
	}

	// Add local definitions from innermost scope and its parents.
	for scope := innermostScope; scope != nil && scope != types.Universe; scope = scope.Parent() {
		isInMainScope := innermostScope == astFileScope && scope == result.mainPkg.Scope()
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if obj == nil {
				continue
			}
			addDefID(SpxDefinitionIdentifier{
				Package: util.ToPtr(obj.Pkg().Name()),
				Name:    util.ToPtr(obj.Name()),
			})

			isThis := name == "this"
			isSpxFileMatch := spxFile == name+".spx" || (spxFile == result.mainSpxFile && name == "Game")
			isMainScopeObj := isInMainScope && isSpxFileMatch
			if !isThis && !isMainScopeObj {
				continue
			}
			named, ok := unwrapPointerType(obj.Type()).(*types.Named)
			if !ok || !isNamedStructType(named) {
				continue
			}

			for _, def := range result.spxDefinitionsForNamedStruct(named) {
				if isInSpxEventHandler && def.ID.Name != nil {
					name := *def.ID.Name
					if idx := strings.LastIndex(name, "."); idx >= 0 {
						name = name[idx+1:]
					}
					if isSpxEventHandlerFuncName(name) {
						continue
					}
				}
				addDefID(def.ID)
			}
		}
	}

	// Add other definitions.
	addDefs(GetSpxPkgDefinitions()...)
	addDefs(GetBuiltinSpxDefinitions()...)
	addDefs(GeneralSpxDefinitions...)
	if innermostScope == astFileScope {
		addDefs(FileScopeSpxDefinitions...)
	}

	return defIDs, nil
}
