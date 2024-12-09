package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
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
	}
	return nil, fmt.Errorf("unknown command: %s", params.Command)
}

// spxRenameResources renames spx resources in the workspace.
func (s *Server) spxRenameResources(params []SpxRenameResourceParams) (*WorkspaceEdit, error) {
	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}
	if result.hasErrorSeverityDiagnostic {
		return nil, errors.New("cannot rename spx resources when there are unresolved error severity diagnostics")
	}

	workspaceEdit := WorkspaceEdit{
		Changes: make(map[DocumentURI][]TextEdit),
	}
	for _, param := range params {
		refKey, err := ParseSpxResourceURI(param.Resource.URI)
		if err != nil {
			return nil, fmt.Errorf("failed to parse spx resource URI: %w", err)
		}
		var changes map[DocumentURI][]TextEdit
		switch refKey := refKey.(type) {
		case SpxBackdropResourceRefKey:
			changes, err = s.spxRenameBackdropResource(result, refKey, param.NewName)
		case SpxSoundResourceRefKey:
			changes, err = s.spxRenameSoundResource(result, refKey, param.NewName)
		case SpxSpriteResourceRefKey:
			changes, err = s.spxRenameSpriteResource(result, refKey, param.NewName)
		case SpxSpriteCostumeResourceRefKey:
			changes, err = s.spxRenameSpriteCostumeResource(result, refKey, param.NewName)
		case SpxSpriteAnimationResourceRefKey:
			changes, err = s.spxRenameSpriteAnimationResource(result, refKey, param.NewName)
		case SpxWidgetResourceRefKey:
			changes, err = s.spxRenameWidgetResource(result, refKey, param.NewName)
		default:
			return nil, fmt.Errorf("unsupported spx resource type: %T", refKey)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to rename spx resource %q: %w", param.Resource.URI, err)
		}
		for documentURI, textEdits := range changes {
			for _, textEdit := range textEdits {
				if !slices.Contains(workspaceEdit.Changes[documentURI], textEdit) {
					workspaceEdit.Changes[documentURI] = append(workspaceEdit.Changes[documentURI], textEdit)
				}
			}
		}
	}
	return &workspaceEdit, nil
}
