package server

import (
	"bytes"
	"fmt"
	"go/types"
	"io/fs"
	"path"
	"slices"
	"time"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	gopast "github.com/goplus/gop/ast"
	gopfmt "github.com/goplus/gop/format"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_formatting
func (s *Server) textDocumentFormatting(params *DocumentFormattingParams) ([]TextEdit, error) {
	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get file path from document uri %q: %w", params.TextDocument.URI, err)
	}
	if path.Ext(spxFile) != ".spx" {
		return nil, nil // Not an spx source file.
	}

	snapshot := s.workspaceRootFS.Snapshot()
	original, err := fs.ReadFile(snapshot, spxFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read spx source file: %w", err)
	}

	formatted, err := s.formatSpx(snapshot, spxFile)
	if err != nil {
		return nil, fmt.Errorf("failed to format spx source file: %w", err)
	}

	if bytes.Equal(formatted, original) {
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

// spxFormatter defines a function that formats an spx source file in the given
// root file system snapshot.
type spxFormatter func(snapshot *vfs.MapFS, spxFile string) (formatted []byte, err error)

// formatSpx applies a series of formatters to an spx source file in order.
//
// The formatters are applied in the following order:
//  1. Go+ formatter
//  2. Lambda parameter elimination
//  3. Declaration reordering
func (s *Server) formatSpx(snapshot *vfs.MapFS, spxFile string) ([]byte, error) {
	var formatted []byte
	for _, formatter := range []spxFormatter{
		s.formatSpxGop,
		s.formatSpxLambda,
		s.formatSpxDecls,
	} {
		subFormatted, err := formatter(snapshot, spxFile)
		if err != nil {
			return nil, err
		}
		if subFormatted != nil && !bytes.Equal(subFormatted, formatted) {
			snapshot = snapshot.WithOverlay(map[string]vfs.MapFile{
				spxFile: {
					Content: subFormatted,
					ModTime: time.Now(),
				},
			}).Snapshot()
			formatted = subFormatted
		}
	}
	return formatted, nil
}

// formatSpxGop formats an spx source file with Go+ formatter.
func (s *Server) formatSpxGop(snapshot *vfs.MapFS, spxFile string) ([]byte, error) {
	original, err := fs.ReadFile(snapshot, spxFile)
	if err != nil {
		return nil, err
	}
	return gopfmt.Source(original, true, spxFile)
}

// formatSpxLambda formats an spx source file by eliminating unused lambda parameters.
func (s *Server) formatSpxLambda(snapshot *vfs.MapFS, spxFile string) ([]byte, error) {
	compileResult, err := s.compileAt(snapshot)
	if err != nil {
		return nil, err
	}
	astFile, ok := compileResult.mainASTPkg.Files[spxFile]
	if !ok {
		return nil, nil
	}

	// Eliminate unused lambda parameters.
	eliminateUnusedLambdaParams(compileResult, astFile)

	// Format the modified AST.
	var formattedBuf bytes.Buffer
	if err := gopfmt.Node(&formattedBuf, compileResult.fset, astFile); err != nil {
		return nil, err
	}

	formatted := formattedBuf.Bytes()
	if len(formatted) == 0 || string(formatted) == "\n" {
		return []byte{}, nil
	}
	return formatted, nil
}

// formatSpxDecls formats an spx source file by reordering declarations.
func (s *Server) formatSpxDecls(snapshot *vfs.MapFS, spxFile string) ([]byte, error) {
	compileResult, err := s.compileAt(snapshot)
	if err != nil {
		return nil, err
	}
	astFile, ok := compileResult.mainASTPkg.Files[spxFile]
	if !ok {
		return nil, nil
	}

	// Find the position of the first declaration that contains any syntax error.
	var errorPos goptoken.Pos
	for _, decl := range astFile.Decls {
		gopast.Inspect(decl, func(node gopast.Node) bool {
			switch node.(type) {
			case *gopast.BadExpr, *gopast.BadStmt, *gopast.BadDecl:
				if !errorPos.IsValid() || decl.Pos() < errorPos {
					errorPos = decl.Pos()
					return false
				}
			}
			return true
		})
	}

	// Get the start position of the shadow entry if it exists and not empty.
	var shadowEntryPos goptoken.Pos
	if astFile.ShadowEntry != nil &&
		astFile.ShadowEntry.Pos().IsValid() &&
		astFile.ShadowEntry.Pos() != errorPos &&
		len(astFile.ShadowEntry.Body.List) > 0 {
		shadowEntryPos = astFile.ShadowEntry.Pos()
	}

	// Collect all declarations.
	var (
		importDecls       []gopast.Decl
		typeDecls         []gopast.Decl
		constDecls        []gopast.Decl
		varBlocks         []*gopast.GenDecl
		funcDecls         []gopast.Decl
		overloadFuncDecls []gopast.Decl
		otherDecls        []gopast.Decl
		processedComments = make(map[*gopast.CommentGroup]struct{})
	)
	for _, decl := range astFile.Decls {
		// Skip the declaration if it appears after the error position.
		if errorPos.IsValid() && decl.Pos() >= errorPos {
			continue
		}

		switch decl := decl.(type) {
		case *gopast.GenDecl:
			switch decl.Tok {
			case goptoken.IMPORT:
				importDecls = append(importDecls, decl)
			case goptoken.TYPE:
				typeDecls = append(typeDecls, decl)
			case goptoken.CONST:
				constDecls = append(constDecls, decl)
			case goptoken.VAR:
				varBlocks = append(varBlocks, decl)
			default:
				otherDecls = append(otherDecls, decl)
			}
		case *gopast.FuncDecl:
			if decl.Shadow {
				continue
			}
			funcDecls = append(funcDecls, decl)
		case *gopast.OverloadFuncDecl:
			overloadFuncDecls = append(overloadFuncDecls, decl)
		default:
			otherDecls = append(otherDecls, decl)
		}

		// Pre-process all comments within the declaration to exclude
		// them from floating comments.
		if doc := getDeclDoc(decl); doc != nil {
			processedComments[doc] = struct{}{}
		}
		startLine := compileResult.fset.Position(decl.Pos()).Line
		endLine := compileResult.fset.Position(decl.End()).Line
		for _, cg := range astFile.Comments {
			if _, ok := processedComments[cg]; ok {
				continue
			}
			cgStartLine := compileResult.fset.Position(cg.Pos()).Line
			if cgStartLine >= startLine && cgStartLine <= endLine {
				processedComments[cg] = struct{}{}
			}
		}
	}

	// Reorder declarations: imports -> types -> consts -> vars -> funcs -> others.
	//
	// See https://github.com/goplus/builder/issues/591 and https://github.com/goplus/builder/issues/752.
	sortedDecls := make([]gopast.Decl, 0, len(astFile.Decls))
	sortedDecls = append(sortedDecls, importDecls...)
	sortedDecls = append(sortedDecls, typeDecls...)
	sortedDecls = append(sortedDecls, constDecls...)
	if len(varBlocks) > 0 {
		// Add the first var block to reserve the correct position in declaration order.
		// All var blocks will be merged and processed together later.
		sortedDecls = append(sortedDecls, varBlocks[0])
	}
	sortedDecls = append(sortedDecls, funcDecls...)
	sortedDecls = append(sortedDecls, overloadFuncDecls...)
	sortedDecls = append(sortedDecls, otherDecls...)

	// Format the sorted declarations.
	formattedBuf := bytes.NewBuffer(make([]byte, 0, len(astFile.Code)))
	ensureTrailingNewlines := func(count int) {
		if formattedBuf.Len() == 0 {
			return
		}
		for _, b := range slices.Backward(formattedBuf.Bytes()) {
			if b != '\n' {
				break
			}
			count--
		}
		for range count {
			formattedBuf.WriteByte('\n')
		}
	}

	// Find comments that appears on the same line after the given position.
	findInlineComments := func(pos goptoken.Pos) *gopast.CommentGroup {
		line := compileResult.fset.Position(pos).Line
		for _, cg := range astFile.Comments {
			if compileResult.fset.Position(cg.Pos()).Line != line {
				continue
			}
			if cg.Pos() > pos {
				return cg
			}
		}
		return nil
	}

	// Handle declarations and floating comments in order of their position.
	processDecl := func(decl gopast.Decl) error {
		if genDecl, ok := decl.(*gopast.GenDecl); ok && genDecl.Tok == goptoken.VAR {
			for i, varBlock := range varBlocks {
				ensureTrailingNewlines(2)

				var doc []byte
				if varBlock.Doc != nil && len(varBlock.Doc.List) > 0 {
					docStart := compileResult.fset.Position(varBlock.Doc.Pos()).Offset
					docEnd := compileResult.fset.Position(varBlock.Doc.End()).Offset
					doc = astFile.Code[docStart:docEnd]
				}

				if doc != nil && varBlock.Lparen.IsValid() && (i > 0 || len(varBlocks) == 1) {
					formattedBuf.Write(doc)
					formattedBuf.WriteByte('\n')
					doc = nil
				}

				if i == 0 {
					formattedBuf.WriteString("var (")
				}

				if doc != nil {
					if !varBlock.Lparen.IsValid() || len(varBlocks) > 1 {
						formattedBuf.WriteByte('\n')
					}
					formattedBuf.Write(doc)
					formattedBuf.WriteByte('\n')
				}

				var bodyStartPos goptoken.Pos
				if varBlock.Lparen.IsValid() {
					if cg := findInlineComments(varBlock.Lparen); cg != nil {
						cgStart := compileResult.fset.Position(cg.Pos()).Offset
						cgEnd := compileResult.fset.Position(cg.End()).Offset
						formattedBuf.Write(astFile.Code[cgStart:cgEnd])
						formattedBuf.WriteByte('\n')
						if i > 0 {
							formattedBuf.WriteByte('\n')
						}

						bodyStartPos = cg.End() + 1
					} else {
						bodyStartPos = varBlock.Lparen + 1
					}
				} else {
					bodyStartPos = varBlock.Pos() + goptoken.Pos(len(varBlock.Tok.String())) + 1
				}
				var bodyEndPos goptoken.Pos
				if varBlock.Rparen.IsValid() {
					bodyEndPos = varBlock.Rparen - 1
				} else {
					bodyEndPos = varBlock.End()
					if cg := findInlineComments(bodyEndPos); cg != nil {
						bodyEndPos = cg.End()
					}
				}
				bodyStart := compileResult.fset.Position(bodyStartPos).Offset
				bodyEnd := compileResult.fset.Position(bodyEndPos).Offset
				formattedBuf.Write(astFile.Code[bodyStart:bodyEnd])
				formattedBuf.WriteByte('\n')

				var trailingComments []byte
				if varBlock.Rparen.IsValid() {
					if cg := findInlineComments(varBlock.Rparen); cg != nil {
						cgStart := compileResult.fset.Position(cg.Pos()).Offset
						cgEnd := compileResult.fset.Position(cg.End()).Offset
						trailingComments = astFile.Code[cgStart:cgEnd]
					}
				}

				if i == len(varBlocks)-1 {
					if i > 0 {
						formattedBuf.WriteString("\n\t")
						formattedBuf.Write(trailingComments)
						formattedBuf.WriteByte('\n')
						trailingComments = nil
					}
					formattedBuf.WriteString(")")
					if trailingComments != nil {
						formattedBuf.WriteByte(' ')
						formattedBuf.Write(trailingComments)
					}
				} else if trailingComments != nil {
					formattedBuf.WriteByte('\n')
					formattedBuf.Write(trailingComments)
				}
				formattedBuf.WriteByte('\n')
			}
		} else {
			startPos := decl.Pos()
			if doc := getDeclDoc(decl); doc != nil {
				startPos = doc.Pos()
			}

			endPos := decl.End()
			if cg := findInlineComments(endPos); cg != nil {
				endPos = cg.End()
			}

			ensureTrailingNewlines(2)
			start := compileResult.fset.Position(startPos).Offset
			end := compileResult.fset.Position(endPos).Offset
			formattedBuf.Write(astFile.Code[start:end])
			ensureTrailingNewlines(1)
		}
		return nil
	}

	// Process all comments and declarations before shadow entry.
	var declIndex int
	for _, cg := range astFile.Comments {
		if _, ok := processedComments[cg]; ok {
			continue
		}
		processedComments[cg] = struct{}{}

		// Skip the comment if it appears after the error position or
		// shadow entry position.
		if errorPos.IsValid() && cg.Pos() >= errorPos {
			continue
		}
		if shadowEntryPos.IsValid() && cg.Pos() >= shadowEntryPos {
			continue
		}

		// Process declarations that should come before this comment.
		for ; declIndex < len(sortedDecls); declIndex++ {
			decl := sortedDecls[declIndex]

			startPos := decl.Pos()
			if doc := getDeclDoc(decl); doc != nil {
				startPos = doc.Pos()
			}
			if startPos > cg.Pos() {
				break
			}

			if err := processDecl(decl); err != nil {
				return nil, err
			}
		}

		// Add the floating comment.
		ensureTrailingNewlines(2)
		start := compileResult.fset.Position(cg.Pos()).Offset
		end := compileResult.fset.Position(cg.End()).Offset
		formattedBuf.Write(astFile.Code[start:end])
		ensureTrailingNewlines(1)
	}

	// Process remaining declarations before shadow entry.
	for ; declIndex < len(sortedDecls); declIndex++ {
		if err := processDecl(sortedDecls[declIndex]); err != nil {
			return nil, err
		}
	}

	// Add the shadow entry if it exists and not empty.
	if shadowEntryPos.IsValid() {
		ensureTrailingNewlines(2)
		start := compileResult.fset.Position(shadowEntryPos).Offset
		end := compileResult.fset.Position(astFile.ShadowEntry.End()).Offset
		formattedBuf.Write(astFile.Code[start:end])
		ensureTrailingNewlines(1)
	}

	formatted := formattedBuf.Bytes()
	if len(formatted) == 0 || string(formatted) == "\n" {
		return []byte{}, nil
	}
	return gopfmt.Source(formatted, true, spxFile)
}

// getDeclDoc returns the doc comment of a declaration if any.
func getDeclDoc(decl gopast.Decl) *gopast.CommentGroup {
	switch decl := decl.(type) {
	case *gopast.GenDecl:
		return decl.Doc
	case *gopast.FuncDecl:
		return decl.Doc
	case *gopast.OverloadFuncDecl:
		return decl.Doc
	default:
		return nil
	}
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
