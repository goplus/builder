package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"go/types"
	"slices"

	"github.com/goplus/builder/tools/spxls/internal/util"
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
			return nil, nil
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}
	if result.hasErrorSeverityDiagnostic {
		return nil, errors.New("cannot rename spx resources when there are unresolved error severity diagnostics")
	}

	return s.spxRenameResourcesWithCompileResult(result, params)
}

// spxRenameResourcesWithCompileResult renames spx resources in the workspace with the given compile result.
func (s *Server) spxRenameResourcesWithCompileResult(result *compileResult, params []SpxRenameResourceParams) (*WorkspaceEdit, error) {
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
	if l := len(params); l == 0 {
		return nil, nil
	} else if l > 1 {
		return nil, errors.New("spx.getDefinitions only supports one document at a time")
	}
	param := params[0]

	result, spxFile, astFile, err := s.compileAndGetASTFileForDocumentURI(param.TextDocument.URI)
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil
		}
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}
	astFileScope := result.typeInfo.Scopes[astFile]

	// Find the innermost scope contains the position.
	tokenFile := result.fset.File(astFile.Pos())
	// Gop compiler may truncate the last empty line of the file, so we need to adjust the line number to avoid panic.
	// TODO: Check if this should be fixed by gop compiler.
	line := min(int(param.Position.Line)+1, tokenFile.LineCount())
	lineStart := tokenFile.LineStart(line)
	pos := tokenFile.Pos(tokenFile.Offset(lineStart) + int(param.Position.Character))
	if !pos.IsValid() {
		return nil, nil
	}
	innermostScope := result.innermostScopeAt(pos)

	var definitions []SpxDefinitionIdentifier
	addDefinition := func(pkg, name string, overloadID *string) {
		def := SpxDefinitionIdentifier{
			OverloadID: overloadID,
		}
		if pkg != "" {
			def.Package = &pkg
		}
		if name != "" {
			def.Name = &name
		}
		if !slices.ContainsFunc(definitions, func(def SpxDefinitionIdentifier) bool {
			return fromStringPtr(def.Name) == name && fromStringPtr(def.OverloadID) == fromStringPtr(overloadID)
		}) {
			definitions = append(definitions, def)
		}
	}

	// Find called event handlers.
	calledEventHandlers := make(map[string]struct{})
	for expr, tv := range result.typeInfo.Types {
		if expr == nil || !expr.Pos().IsValid() || tv.IsType() {
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
		funcIdent, ok := callExpr.Fun.(*gopast.Ident)
		if !ok {
			continue
		}
		if !isSpxEventHandlerFuncName(funcIdent.Name) {
			continue
		}
		funcObj := result.typeInfo.ObjectOf(funcIdent)
		if funcObj == nil || funcObj.Pkg() == nil || funcObj.Pkg().Path() != spxPkgPath {
			continue
		}
		funcTV, ok := result.typeInfo.Types[callExpr.Fun]
		if !ok {
			continue
		}
		funcSig, ok := funcTV.Type.(*types.Signature)
		if !ok {
			continue
		}
		funcRecv := funcSig.Recv()
		if funcRecv == nil {
			continue
		}
		funcRecvType := unwrapPointerType(funcRecv.Type())

		if paramCount := funcSig.Params().Len(); paramCount > 0 {
			lastParamType := funcSig.Params().At(paramCount - 1).Type()
			if _, ok := lastParamType.(*types.Signature); ok {
				calledEventHandlers[funcRecvType.String()+"."+toLowerCamelCase(funcIdent.Name)] = struct{}{}
			}
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
			addDefinition(obj.Pkg().Name(), obj.Name(), nil)

			isThis := name == "this"
			isSpxFileMatch := spxFile == name+".spx" || (spxFile == result.mainSpxFile && name == "Game")
			isMainScopeObj := isInMainScope && isSpxFileMatch
			if !isThis && !isMainScopeObj {
				continue
			}

			typ := unwrapPointerType(obj.Type())
			if _, ok := typ.Underlying().(*types.Struct); !ok {
				continue
			}
			walkStruct(typ, func(named *types.Named, namedParents []*types.Named, member types.Object) {
				memberPkgPath := member.Pkg().Path()
				if !member.Exported() && memberPkgPath != "main" {
					return
				}

				switch member := member.(type) {
				case *types.Var:
					addDefinition(memberPkgPath, member.Name(), nil)
				case *types.Func:
					var methodNames []string
					if methodOverloads := expandGoptOverloadedMethod(member); len(methodOverloads) > 0 {
						methodNames = make([]string, 0, len(methodOverloads))
						for _, method := range methodOverloads {
							_, methodName, _ := util.SplitGoptMethod(method.Name())
							methodNames = append(methodNames, methodName)
						}
					} else {
						methodNames = []string{member.Name()}
					}

					for _, methodName := range methodNames {
						funcName, overloadID := parseGopFuncName(methodName)
						if _, ok := calledEventHandlers[named.String()+"."+funcName]; ok {
							return
						}

						receiverName := named.Obj().Name()
						if memberPkgPath == spxPkgPath {
							if receiverName != "SpriteImpl" && receiverName != "Game" {
								for _, namedParent := range namedParents {
									if namedParent.Obj().Pkg().Path() != spxPkgPath {
										continue
									}

									namedParentName := namedParent.Obj().Name()
									if namedParentName == "SpriteImpl" || namedParentName == "Game" {
										receiverName = namedParentName
										break
									}
								}
							}
							if receiverName == "SpriteImpl" {
								receiverName = "Sprite"
							}
						}

						addDefinition(memberPkgPath, receiverName+"."+funcName, overloadID)
					}
				}
			})
		}
	}

	// Add other spx definitions.
	for _, name := range result.spxPkg.Scope().Names() {
		if obj := result.spxPkg.Scope().Lookup(name); obj != nil {
			name := obj.Name()

			var overloadID *string
			if _, ok := obj.(*types.Func); ok {
				name, overloadID = parseGopFuncName(name)
			}

			if obj.Exported() {
				addDefinition(spxPkgPath, name, overloadID)
			}
		}
	}

	// Add builtin definitions.
	for _, name := range types.Universe.Names() {
		if obj := types.Universe.Lookup(name); obj != nil && obj.Pkg() == nil {
			addDefinition("builtin", obj.Name(), nil)
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
