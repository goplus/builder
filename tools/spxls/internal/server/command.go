package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"go/types"
	"regexp"
	"slices"
	"strconv"
	"strings"
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

var (
	// goptMethodRE is the regular expression of the Gopt method name.
	goptMethodRE = regexp.MustCompile(`^Gopt_([^_]+)_(.+)$`)

	// gopOverloadFuncNameRE is the regular expression of the Go+ overloaded
	// function name.
	gopOverloadFuncNameRE = regexp.MustCompile(`^(.+)__(\d+)$`)
)

// parseGopFuncName parses the Go+ overloaded function name.
func parseGopFuncName(name string) (funcName string, overloadIndex *int) {
	funcName = name
	if matches := gopOverloadFuncNameRE.FindStringSubmatch(funcName); len(matches) == 3 {
		funcName = matches[1]
		idx, _ := strconv.Atoi(matches[2])
		overloadIndex = &idx
	}
	funcName = strings.ToLower(string(funcName[0])) + funcName[1:] // Make it lowerCamelCase.
	return
}

// spxGetDefinitions gets spx definitions at a specific position in a document.
func (s *Server) spxGetDefinitions(params []SpxGetDefinitionsParams) ([]SpxDefinitionIdentifier, error) {
	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}
	if len(params) > 1 {
		return nil, errors.New("spx.getDefinitions only supports one document at a time")
	}
	param := params[0]

	spxFile, err := s.fromDocumentURI(param.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx file from document URI %q: %w", param.TextDocument.URI, err)
	}
	isMainSpxFile := spxFile == result.mainSpxFile
	astFile, ok := result.mainPkgFiles[spxFile]
	if !ok {
		return nil, nil // No AST file found for the spx file, probably compile failed.
	}
	tokenFile := result.fset.File(astFile.Pos())
	if tokenFile == nil {
		return nil, nil
	}

	lineStart := tokenFile.LineStart(int(param.Position.Line) + 1)
	pos := tokenFile.Pos(tokenFile.Offset(lineStart) + int(param.Position.Character))
	if !pos.IsValid() {
		return nil, nil
	}
	var innermostScope *types.Scope
	for node, scope := range result.typeInfo.Scopes {
		if node.Pos() <= pos && pos <= node.End() {
			if innermostScope == nil || node.Pos() > innermostScope.Pos() {
				innermostScope = scope
			}
		}
	}
	if innermostScope == nil {
		innermostScope = result.typeInfo.Scopes[astFile]
	}
	if innermostScope == nil {
		return nil, nil
	}

	var definitions []SpxDefinitionIdentifier
	addDefinition := func(pkg, name string, overloadIndex *int) {
		def := SpxDefinitionIdentifier{
			OverloadIndex: overloadIndex,
		}
		if pkg != "" {
			def.Package = &pkg
		}
		if name != "" {
			def.Name = &name
		}
		if !slices.ContainsFunc(definitions, func(def SpxDefinitionIdentifier) bool {
			return fromStringPtr(def.Name) == name && fromIntPtr(def.OverloadIndex) == fromIntPtr(overloadIndex)
		}) {
			definitions = append(definitions, def)
		}
	}

	// Add local API definitions from current scope and its parents.
	for scope := innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			if obj := scope.Lookup(name); obj != nil {
				pkg := obj.Pkg()
				if pkg == nil {
					continue // Ignore builtin identifiers.
				}
				addDefinition(pkg.Name(), obj.Name(), nil)
			}
		}
	}

	// Add spx.Sprite (actually spx.SpriteImpl) API definitions.
	if !isMainSpxFile {
		for _, name := range result.spxPkg.Scope().Names() {
			if obj := result.spxPkg.Scope().Lookup(name); obj != nil {
				typeName, ok := obj.(*types.TypeName)
				if !ok {
					continue
				}
				switch typeName.Name() {
				case "SpriteImpl", "eventSinks":
				default:
					continue
				}
				named, ok := typeName.Type().(*types.Named)
				if !ok {
					continue
				}

				for i := 0; i < named.NumMethods(); i++ {
					method := named.Method(i)
					if !method.Exported() {
						continue
					}
					funcName, overloadIndex := parseGopFuncName(method.Name())
					methodName := "Sprite." + funcName
					addDefinition(spxPkgPath, methodName, overloadIndex)
				}
			}
		}
	}

	// Add spx.Game API definitions.
	for _, name := range result.spxPkg.Scope().Names() {
		if obj := result.spxPkg.Scope().Lookup(name); obj != nil {
			typeName, ok := obj.(*types.TypeName)
			if !ok {
				continue
			}
			switch typeName.Name() {
			case "Game":
			case "eventSinks":
				if !isMainSpxFile {
					continue
				}
			case "Camera":
			default:
				continue
			}
			named, ok := typeName.Type().(*types.Named)
			if !ok {
				continue
			}

			for i := 0; i < named.NumMethods(); i++ {
				method := named.Method(i)
				if !method.Exported() {
					continue
				}
				funcName, overloadIndex := parseGopFuncName(method.Name())
				methodName := "Game." + funcName
				addDefinition(spxPkgPath, methodName, overloadIndex)
			}
		}
	}

	// Add other spx API definitions.
	for _, name := range result.spxPkg.Scope().Names() {
		if obj := result.spxPkg.Scope().Lookup(name); obj != nil {
			name := obj.Name()

			var overloadIndex *int
			if _, ok := obj.(*types.Func); ok {
				receiverName := ""
				funcName := name

				// Handle Gopt methods.
				if matches := goptMethodRE.FindStringSubmatch(funcName); len(matches) == 3 {
					receiverName = matches[1]
					if receiverName == "SpriteImpl" {
						if isMainSpxFile {
							continue
						}
						receiverName = "Sprite"
					}
					funcName = matches[2]
				}

				funcName, overloadIndex = parseGopFuncName(funcName)
				if receiverName != "" {
					name = receiverName + "." + funcName
				} else {
					name = funcName
				}
			}

			if obj.Exported() {
				addDefinition(spxPkgPath, name, overloadIndex)
			}
		}
	}

	// Add builtin definitions.
	for scope := innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			if obj := scope.Lookup(name); obj != nil && obj.Pkg() == nil {
				name := obj.Name()
				addDefinition("builtin", name, nil)
			}
		}
	}

	return definitions, nil
}
