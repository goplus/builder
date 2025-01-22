package server

import (
	"bytes"
	"errors"
	"fmt"
	"go/types"
	"path"

	gopast "github.com/goplus/gop/ast"
	gopfmt "github.com/goplus/gop/format"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_formatting
func (s *Server) textDocumentFormatting(params *DocumentFormattingParams) ([]TextEdit, error) {
	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get path from document uri: %w", err)
	}
	if path.Ext(spxFile) != ".spx" {
		return nil, nil // Not a spx source file.
	}

	formatted, original, err := s.formatSpx(spxFile)
	if err != nil {
		return nil, fmt.Errorf("failed to format spx source file: %w", err)
	}

	if formatted == nil || bytes.Equal(original, formatted) {
		return nil, nil // No changes.
	}

	// Simply replace the entire document.
	lines := bytes.Count(original, []byte("\n"))
	lastNewLine := bytes.LastIndex(original, []byte("\n"))
	lastLineLen := len(original) - (lastNewLine + 1)
	return []TextEdit{
		{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End: Position{
					Line:      uint32(lines),
					Character: uint32(lastLineLen),
				},
			},
			NewText: string(formatted),
		},
	}, nil
}

// formatSpx formats a spx source file. If no change is needed, it returns `(nil, nil, nil)`.
func (s *Server) formatSpx(spxFileName string) (formatted, original []byte, err error) {
	// Parse the source into AST.
	compileResult, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoMainSpxFile) {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	astFile := compileResult.mainASTPkg.Files[spxFileName]
	if astFile == nil {
		// Return error only if parsing completely failed. For partial parsing
		// failures, we proceed with formatting.
		return nil, nil, fmt.Errorf("failed to parse spx source file")
	}
	original = astFile.Code

	eliminateUnusedLambdaParams(compileResult, astFile)

	fset := compileResult.fset
	// Sort import statements first.
	gopast.SortImports(fset, astFile)

	// Collect all declarations.
	var (
		importDecls []gopast.Decl
		typeDecls   []gopast.Decl
		constDecls  []gopast.Decl
		varBlocks   []*gopast.GenDecl
		funcDecls   []gopast.Decl
		otherDecls  []gopast.Decl
	)
	for _, decl := range astFile.Decls {
		switch d := decl.(type) {
		case *gopast.GenDecl:
			switch d.Tok {
			case goptoken.IMPORT:
				importDecls = append(importDecls, d)
			case goptoken.TYPE:
				typeDecls = append(typeDecls, d)
			case goptoken.CONST:
				constDecls = append(constDecls, d)
			case goptoken.VAR:
				varBlocks = append(varBlocks, d)
			default:
				otherDecls = append(otherDecls, d)
			}
		case *gopast.FuncDecl:
			funcDecls = append(funcDecls, d)
		default:
			otherDecls = append(otherDecls, d)
		}
	}

	// Reorder declarations: imports -> types -> consts -> vars -> funcs -> others.
	//
	// See https://github.com/goplus/builder/issues/591 and https://github.com/goplus/builder/issues/752.
	newDecls := make([]gopast.Decl, 0, len(astFile.Decls))
	newDecls = append(newDecls, importDecls...)
	newDecls = append(newDecls, typeDecls...)
	newDecls = append(newDecls, constDecls...)
	if len(varBlocks) > 0 {
		// Merge multiple var blocks into a single one.
		firstVarBlock := varBlocks[0]
		firstVarBlock.Lparen = firstVarBlock.Pos()
		if len(varBlocks) > 1 {
			firstVarBlock.Rparen = varBlocks[len(varBlocks)-1].End()
			for _, varBlock := range varBlocks[1:] {
				for _, spec := range varBlock.Specs {
					valueSpec, ok := spec.(*gopast.ValueSpec)
					if !ok {
						return nil, nil, fmt.Errorf("unexpected non-value spec in var block: %T", spec)
					}
					firstVarBlock.Specs = append(firstVarBlock.Specs, valueSpec)
				}
			}
		} else {
			firstVarBlock.Rparen = firstVarBlock.End()
		}
		newDecls = append(newDecls, firstVarBlock)
	}
	newDecls = append(newDecls, funcDecls...)
	newDecls = append(newDecls, otherDecls...)
	astFile.Decls = newDecls

	// Format the modified AST.
	var buf bytes.Buffer
	if err := gopfmt.Node(&buf, fset, astFile); err != nil {
		return nil, nil, err
	}
	return buf.Bytes(), original, nil
}

// eliminateUnusedLambdaParams eliminates useless lambda parameter declarations.
// A lambda parameter is considered "useless" if:
// 1. The parameter is not used.
// 2. The lambda is passed to a function that has a overload which receives the lambda without the parameter.
// Then we can omit its declaration safely.
//
// NOTE: There are limitations with current implementation:
// 1. Only `LambdaExpr2` (not `LambdaExpr`) is supported.
// 2. Only the last parameter of the lambda is checked.
// We may complete it in the future, if needed.
func eliminateUnusedLambdaParams(compileResult *compileResult, astFile *gopast.File) {
	gopast.Inspect(astFile, func(n gopast.Node) bool {
		callExpr, ok := n.(*gopast.CallExpr)
		if !ok {
			return true
		}
		funIdent, ok := callExpr.Fun.(*gopast.Ident)
		if !ok {
			return true
		}
		funType, funTypeOverloads := getFuncAndOverloadsType(compileResult, funIdent)
		if funType == nil || funTypeOverloads == nil {
			return true
		}
		paramsType := funType.Signature().Params()
		for argIdx, argExpr := range callExpr.Args {
			lambdaExpr, ok := argExpr.(*gopast.LambdaExpr2)
			if !ok {
				continue
			}
			if argIdx >= paramsType.Len() {
				break
			}
			lambdaSig, ok := paramsType.At(argIdx).Type().(*types.Signature)
			if !ok {
				continue
			}
			if len(lambdaExpr.Lhs) == 0 {
				continue
			}
			// To simplify the implementation, we only check & process the last parameter,
			// which is enough to cover known cases.
			lastParamIdx := len(lambdaExpr.Lhs) - 1
			if used := isIdentUsed(compileResult, lambdaExpr.Lhs[lastParamIdx]); used {
				continue
			}

			newParamTypes := make([]*types.Var, lambdaSig.Params().Len()-1)
			for i := 0; i < lambdaSig.Params().Len()-1; i++ {
				newParamTypes[i] = lambdaSig.Params().At(i)
			}
			newLambdaSig := types.NewSignatureType(
				lambdaSig.Recv(),
				getTypeParamSlice(lambdaSig.RecvTypeParams()),
				getTypeParamSlice(lambdaSig.TypeParams()),
				types.NewTuple(newParamTypes...),
				lambdaSig.Results(),
				lambdaSig.Variadic(),
			)
			hasMatchedOverload := false
			for _, overloadType := range funTypeOverloads {
				if overloadType == funType {
					continue
				}
				overloadParamsType := overloadType.Signature().Params()
				if overloadParamsType.Len() != paramsType.Len() {
					continue
				}
				overloadLambdaSig, ok := overloadParamsType.At(argIdx).Type().(*types.Signature)
				if !ok {
					continue
				}
				if types.AssignableTo(newLambdaSig, overloadLambdaSig) {
					hasMatchedOverload = true
					break
				}
			}
			if hasMatchedOverload {
				lambdaExpr.Lhs = lambdaExpr.Lhs[:lastParamIdx]
				if len(lambdaExpr.Lhs) == 0 {
					// Avoid `index out of range [0] with length 0` when printing lambda expression.
					lambdaExpr.Lhs = nil
				}
			}
		}
		return true
	})
}

// getFuncAndOverloadsType returns the function type and all its overloads.
func getFuncAndOverloadsType(compileResult *compileResult, funIdent *gopast.Ident) (fun *types.Func, overloads []*types.Func) {
	funTypeObj := compileResult.typeInfo.ObjectOf(funIdent)
	if funTypeObj == nil {
		return
	}
	funType, ok := funTypeObj.(*types.Func)
	if !ok {
		return
	}
	pkg := funType.Pkg()
	if pkg == nil {
		return
	}
	recvTypeName := compileResult.selectorTypeNameForIdent(funIdent)
	if recvTypeName == "" {
		return
	}
	if isSpxPkgObject(funTypeObj) && recvTypeName == "Sprite" {
		recvTypeName = "SpriteImpl"
	}

	recvType := funType.Pkg().Scope().Lookup(recvTypeName).Type()
	if recvType == nil {
		return
	}
	recvNamed, ok := recvType.(*types.Named)
	if !ok || !isNamedStructType(recvNamed) {
		return
	}
	var underlineFunType *types.Func
	walkStruct(recvNamed, func(member types.Object, selector *types.Named) bool {
		method, ok := member.(*types.Func)
		if !ok {
			return true
		}
		if pn, overloadId := parseGopFuncName(method.Name()); pn == funIdent.Name && overloadId == nil {
			underlineFunType = method
			return false
		}
		return true
	})
	if underlineFunType == nil {
		return
	}
	return funType, expandGopOverloadableFunc(underlineFunType)
}

func isIdentUsed(compileResult *compileResult, ident *gopast.Ident) bool {
	obj := compileResult.typeInfo.ObjectOf(ident)
	for _, usedObj := range compileResult.typeInfo.Uses {
		if usedObj == obj {
			return true
		}
	}
	return false
}

func getTypeParamSlice(list *types.TypeParamList) []*types.TypeParam {
	if list == nil {
		return nil
	}
	slice := make([]*types.TypeParam, list.Len())
	for i := 0; i < list.Len(); i++ {
		slice[i] = list.At(i)
	}
	return slice
}
