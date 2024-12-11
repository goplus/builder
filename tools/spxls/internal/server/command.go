package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"go/types"
	"slices"
	"strings"

	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
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

// spxGetDefinitions gets spx definitions at a specific position in a document.
func (s *Server) spxGetDefinitions(params []SpxGetDefinitionsParams) ([]SpxDefinitionIdentifier, error) {
	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}
	if l := len(params); l == 0 {
		return nil, nil
	} else if l > 1 {
		return nil, errors.New("spx.getDefinitions only supports one document at a time")
	}
	param := params[0]

	spxFile, err := s.fromDocumentURI(param.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx file from document URI %q: %w", param.TextDocument.URI, err)
	}
	astFile, ok := result.mainPkgFiles[spxFile]
	if !ok {
		return nil, nil // No AST file found for the spx file, probably compile failed.
	}
	astFileScope := result.typeInfo.Scopes[astFile]

	// Find the innermost scope contains the position.
	tokenFile := result.fset.File(astFile.Pos())
	lineStart := tokenFile.LineStart(int(param.Position.Line) + 1)
	pos := tokenFile.Pos(tokenFile.Offset(lineStart) + int(param.Position.Character))
	if !pos.IsValid() {
		return nil, nil
	}
	innermostScope := result.innermostScope(pos)

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

	// Find called event handlers.
	calledEventHandlers := map[string]struct{}{}
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || expr.Pos() == goptoken.NoPos || tv.IsType() {
			continue // Skip type identifiers.
		}
		if expr.Pos() < goptoken.Pos(tokenFile.Base()) ||
			expr.End() > goptoken.Pos(tokenFile.Base()+tokenFile.Size()) ||
			pos < expr.Pos() ||
			pos > expr.End() {
			continue
		}

		callExpr, ok := expr.(*gopast.CallExpr)
		if !ok {
			continue
		}
		funIndent, ok := callExpr.Fun.(*gopast.Ident)
		if !ok {
			continue
		}
		if !strings.HasPrefix(funIndent.Name, "on") && len(funIndent.Name) > 2 {
			continue
		}
		funObj := result.typeInfo.ObjectOf(funIndent)
		if funObj == nil || funObj.Pkg() == nil || funObj.Pkg().Path() != spxPkgPath {
			continue
		}
		funTV, ok := result.typeInfo.Types[callExpr.Fun]
		if !ok {
			continue
		}
		funSig, ok := funTV.Type.(*types.Signature)
		if !ok {
			continue
		}
		funRecv := funSig.Recv()
		if funRecv == nil {
			continue
		}
		recvType := funRecv.Type()
		if ptr, ok := recvType.(*types.Pointer); ok {
			recvType = ptr.Elem()
		}

		if paramCount := funSig.Params().Len(); paramCount > 0 {
			lastParamType := funSig.Params().At(paramCount - 1).Type()
			if _, ok := lastParamType.(*types.Signature); ok {
				calledEventHandlers[recvType.String()+"."+funIndent.Name] = struct{}{}
			}
		}
	}

	// Add local definitions from innermost scope and its parents.
	for scope := innermostScope; scope != nil; scope = scope.Parent() {
		for _, name := range scope.Names() {
			obj := scope.Lookup(name)
			if obj == nil {
				continue
			}
			pkg := obj.Pkg()
			if pkg == nil {
				continue // Ignore builtin identifiers.
			}
			addDefinition(pkg.Name(), obj.Name(), nil)

			if name == "this" ||
				(innermostScope == astFileScope && scope == result.mainPkg.Scope() &&
					(spxFile == name+".spx" || (spxFile == result.mainSpxFile && name == "Game"))) {
				objType := obj.Type()
				if ptr, ok := objType.(*types.Pointer); ok {
					objType = ptr.Elem()
				}
				if _, ok := objType.Underlying().(*types.Struct); ok {
					var eventSinksAlias string
					walkStruct(
						objType,
						[]*types.Named{objType.(*types.Named)},
						func(named *types.Named, namedParents []*types.Named, field *types.Var) {
							if !field.Exported() && field.Pkg().Path() != "main" {
								return
							}
							addDefinition(field.Pkg().Path(), field.Name(), nil)
						},
						func(named *types.Named, namedParents []*types.Named, method *types.Func) {
							methodPkgPath := method.Pkg().Path()
							if !method.Exported() && methodPkgPath != "main" {
								return
							}
							funcName, overloadIndex := parseGopFuncName(method.Name())
							if _, ok := calledEventHandlers[named.String()+"."+funcName]; ok {
								return
							}

							receiverName := named.Obj().Name()
							if methodPkgPath == spxPkgPath {
								switch receiverName {
								case "eventSinks":
									if eventSinksAlias == "" {
										for _, namedParent := range namedParents {
											if namedParent.Obj().Pkg().Path() == spxPkgPath {
												eventSinksAlias = namedParent.Obj().Name()
												break
											}
										}
									}
									if eventSinksAlias == "SpriteImpl" {
										receiverName = "Sprite"
									} else if eventSinksAlias != "" {
										receiverName = eventSinksAlias
									}
								case "SpriteImpl":
									receiverName = "Sprite"
								case "Camera":
									receiverName = "Game"
								}
							}

							addDefinition(method.Pkg().Path(), receiverName+"."+funcName, overloadIndex)
						},
					)
				}
			}
		}
	}

	// Add other spx definitions.
	for _, name := range result.spxPkg.Scope().Names() {
		if obj := result.spxPkg.Scope().Lookup(name); obj != nil {
			name := obj.Name()

			var overloadIndex *int
			if _, ok := obj.(*types.Func); ok {
				name, overloadIndex = parseGopFuncName(name)
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

	// Add other definitions.
	for _, def := range generalDefinitions {
		addDefinition("", *def.Name, nil)
	}
	if innermostScope == astFileScope {
		addDefinition("", "func_declaration", nil)
	}

	return definitions, nil
}

// generalDefinitions are general definitions that are scope-independent.
var generalDefinitions = []SpxDefinitionIdentifier{
	{Name: toStringPtr("for_iterate")},
	{Name: toStringPtr("for_loop_with_condition")},
	{Name: toStringPtr("for_loop_with_range")},
	{Name: toStringPtr("if_statement")},
	{Name: toStringPtr("if_else_statement")},
	{Name: toStringPtr("var_declaration")},
}
