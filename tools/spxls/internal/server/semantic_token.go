package server

import (
	"go/types"
	"slices"
	"sort"
	"strings"

	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

var (
	// semanticTokenTypesLegend defines the semantic token types we support
	// and their indexes.
	semanticTokenTypesLegend = []SemanticTokenTypes{
		NamespaceType,
		TypeType,
		InterfaceType,
		StructType,
		ParameterType,
		VariableType,
		PropertyType,
		FunctionType,
		MethodType,
		KeywordType,
		CommentType,
		StringType,
		NumberType,
		OperatorType,
		LabelType,
	}

	// semanticTokenModifiersLegend defines the semantic token modifiers we
	// support and their bit positions.
	semanticTokenModifiersLegend = []SemanticTokenModifiers{
		ModDeclaration,
		ModReadonly,
		ModStatic,
		ModDefaultLibrary,
	}
)

// getSemanticTokenTypeIndex returns the index of the given token type in the legend.
func getSemanticTokenTypeIndex(tokenType SemanticTokenTypes) uint32 {
	idx := slices.Index(semanticTokenTypesLegend, tokenType)
	if idx == -1 {
		return 0 // Fallback to first type.
	}
	return uint32(idx)
}

// getSemanticTokenModifiersMask returns the bit mask for the given modifiers.
func getSemanticTokenModifiersMask(modifiers []SemanticTokenModifiers) uint32 {
	var mask uint32
	for _, mod := range modifiers {
		if i := slices.Index(semanticTokenModifiersLegend, mod); i >= 0 {
			mask |= 1 << uint32(i)
		}
	}
	return mask
}

// semanticTokenInfo represents the information of a semantic token.
type semanticTokenInfo struct {
	startPos       goptoken.Pos
	endPos         goptoken.Pos
	tokenType      SemanticTokenTypes
	tokenModifiers []SemanticTokenModifiers
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_semanticTokens
func (s *Server) textDocumentSemanticTokensFull(params *SemanticTokensParams) (tokens *SemanticTokens, err error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	if tokensIface, ok := result.computedCache.semanticTokens.Load(params.TextDocument.URI); ok {
		return &SemanticTokens{
			Data: tokensIface.([]uint32),
		}, nil
	}
	defer func() {
		if err == nil {
			result.computedCache.semanticTokens.Store(params.TextDocument.URI, slices.Clip(tokens.Data))
		}
	}()

	var tokenInfos []semanticTokenInfo
	addToken := func(startPos, endPos goptoken.Pos, tokenType SemanticTokenTypes, tokenModifiers []SemanticTokenModifiers) {
		if !startPos.IsValid() || !endPos.IsValid() {
			return
		}

		start := result.fset.Position(startPos)
		end := result.fset.Position(endPos)
		if start.Line <= 0 || start.Column <= 0 || end.Offset <= start.Offset {
			return
		}

		tokenInfos = append(tokenInfos, semanticTokenInfo{
			startPos:       startPos,
			endPos:         endPos,
			tokenType:      tokenType,
			tokenModifiers: tokenModifiers,
		})
	}

	gopast.Inspect(astFile, func(node gopast.Node) bool {
		if node == nil || !node.Pos().IsValid() {
			return true
		}

		switch node := node.(type) {
		case *gopast.Comment:
			addToken(node.Pos(), node.End(), CommentType, nil)
		case *gopast.BadExpr:
			addToken(node.From, node.To, OperatorType, nil)
		case *gopast.BadStmt:
			addToken(node.From, node.To, OperatorType, nil)
		case *gopast.EmptyStmt:
			if !node.Implicit {
				addToken(node.Semicolon, node.Semicolon+1, OperatorType, nil)
			}
		case *gopast.Ident:
			obj := result.typeInfo.ObjectOf(node)
			if obj == nil {
				if goptoken.Lookup(node.Name).IsKeyword() {
					addToken(node.Pos(), node.End(), KeywordType, nil)
				}
				return true
			}

			var (
				tokenType SemanticTokenTypes
				modifiers []SemanticTokenModifiers
			)
			switch obj := obj.(type) {
			case *types.Builtin:
				tokenType = KeywordType
				modifiers = append(modifiers, ModDefaultLibrary)
			case *types.TypeName:
				if named, ok := obj.Type().(*types.Named); ok {
					switch named.Underlying().(type) {
					case *types.Struct:
						tokenType = StructType
					case *types.Interface:
						tokenType = InterfaceType
					default:
						tokenType = TypeType
					}
				} else {
					tokenType = TypeType
				}
			case *types.Var:
				if obj.IsField() {
					if obj.Pkg().Path() == "main" && result.isDefinedInFirstVarBlock(obj) {
						tokenType = VariableType
					} else {
						tokenType = PropertyType
					}
				} else if obj.Parent() != nil && obj.Parent().Parent() == nil {
					defIdent := result.defIdentFor(obj)
					if defIdent == node {
						tokenType = ParameterType
					} else {
						tokenType = VariableType
					}
				} else {
					tokenType = VariableType
				}
			case *types.Const:
				tokenType = VariableType
				modifiers = append(modifiers, ModStatic, ModReadonly)
			case *types.Func:
				if obj.Type().(*types.Signature).Recv() != nil {
					tokenType = MethodType
				} else {
					tokenType = FunctionType
				}
			case *types.PkgName:
				tokenType = NamespaceType
			case *types.Label:
				tokenType = LabelType
			}
			if result.defIdentFor(obj) == node {
				modifiers = append(modifiers, ModDeclaration)
			}
			if obj.Pkg() != nil && obj.Pkg().Path() != "main" && !strings.Contains(obj.Pkg().Path(), ".") {
				modifiers = append(modifiers, ModDefaultLibrary)
			}
			addToken(node.Pos(), node.End(), tokenType, modifiers)
		case *gopast.BasicLit:
			var tokenType SemanticTokenTypes
			switch node.Kind {
			case goptoken.STRING, goptoken.CHAR, goptoken.CSTRING:
				tokenType = StringType
			case goptoken.INT, goptoken.FLOAT, goptoken.IMAG, goptoken.RAT:
				tokenType = NumberType
			}
			addToken(node.ValuePos, node.ValuePos+goptoken.Pos(len(node.Value)), tokenType, nil)

			if node.Extra != nil && len(node.Extra.Parts) > 0 {
				pos := node.ValuePos
				for _, part := range node.Extra.Parts {
					switch v := part.(type) {
					case string:
						nextPos := gopast.NextPartPos(pos, v)
						addToken(pos, nextPos, StringType, nil)
						pos = nextPos
					case gopast.Expr:
						pos = v.End()
					}
				}
			}
		case *gopast.CompositeLit:
			addToken(node.Lbrace, node.Lbrace+1, OperatorType, nil)
			addToken(node.Rbrace, node.Rbrace+1, OperatorType, nil)
		case *gopast.FuncLit:
			addToken(node.Type.Func, node.Type.Func+goptoken.Pos(len("func")), KeywordType, nil)
		case *gopast.SliceLit:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			addToken(node.Rbrack, node.Rbrack+1, OperatorType, nil)
		case *gopast.MatrixLit:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			addToken(node.Rbrack, node.Rbrack+1, OperatorType, nil)
		case *gopast.StarExpr:
			addToken(node.Star, node.Star+1, OperatorType, nil)
		case *gopast.UnaryExpr:
			opLen := len(node.Op.String())
			addToken(node.OpPos, node.OpPos+goptoken.Pos(opLen), OperatorType, nil)
		case *gopast.BinaryExpr:
			opLen := len(node.Op.String())
			addToken(node.OpPos, node.OpPos+goptoken.Pos(opLen), OperatorType, nil)
		case *gopast.ParenExpr:
			addToken(node.Lparen, node.Lparen+1, OperatorType, nil)
			addToken(node.Rparen, node.Rparen+1, OperatorType, nil)
		case *gopast.SelectorExpr:
			addToken(node.Sel.Pos()-1, node.Sel.Pos(), OperatorType, nil)
		case *gopast.IndexExpr:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			addToken(node.Rbrack, node.Rbrack+1, OperatorType, nil)
		case *gopast.IndexListExpr:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			addToken(node.Rbrack, node.Rbrack+1, OperatorType, nil)
		case *gopast.SliceExpr:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			addToken(node.Rbrack, node.Rbrack+1, OperatorType, nil)
		case *gopast.TypeAssertExpr:
			addToken(node.Lparen-1, node.Lparen, OperatorType, nil)
			addToken(node.Lparen, node.Lparen+1, OperatorType, nil)
			if node.Type == nil {
				addToken(node.Lparen+1, node.Lparen+1+goptoken.Pos(len("type")), KeywordType, nil)
			}
			addToken(node.Rparen, node.Rparen+1, OperatorType, nil)
		case *gopast.CallExpr:
			addToken(node.Lparen, node.Lparen+1, OperatorType, nil)
			addToken(node.Rparen, node.Rparen+1, OperatorType, nil)
			if node.Ellipsis.IsValid() {
				addToken(node.Ellipsis, node.Ellipsis+3, OperatorType, nil)
			}
		case *gopast.KeyValueExpr:
			addToken(node.Colon, node.Colon+1, OperatorType, nil)
		case *gopast.ErrWrapExpr:
			addToken(node.TokPos, node.TokPos+1, OperatorType, nil)
			if node.Default != nil {
				addToken(node.TokPos+1, node.TokPos+2, OperatorType, nil)
			}
		case *gopast.EnvExpr:
			addToken(node.TokPos, node.TokPos+1, OperatorType, nil)
			if node.HasBrace() {
				addToken(node.Lbrace, node.Lbrace+1, OperatorType, nil)
				addToken(node.Rbrace, node.Rbrace+1, OperatorType, nil)
			}
		case *gopast.RangeExpr:
			addToken(node.To, node.To+1, OperatorType, nil)
			if node.Colon2.IsValid() {
				addToken(node.Colon2, node.Colon2+1, OperatorType, nil)
			}
		case *gopast.ArrayType:
			addToken(node.Lbrack, node.Lbrack+1, OperatorType, nil)
			if node.Len == nil {
				addToken(node.Lbrack+1, node.Lbrack+2, OperatorType, nil)
			}
		case *gopast.StructType:
			addToken(node.Struct, node.Struct+goptoken.Pos(len("struct")), KeywordType, nil)
		case *gopast.InterfaceType:
			addToken(node.Interface, node.Interface+goptoken.Pos(len("interface")), KeywordType, nil)
		case *gopast.FuncType:
			if node.Func.IsValid() {
				addToken(node.Func, node.Func+goptoken.Pos(len("func")), KeywordType, nil)
			}
			if node.TypeParams != nil {
				addToken(node.TypeParams.Opening, node.TypeParams.Opening+1, OperatorType, nil)
				addToken(node.TypeParams.Closing, node.TypeParams.Closing+1, OperatorType, nil)
			}
		case *gopast.MapType:
			addToken(node.Map, node.Map+goptoken.Pos(len("map")), KeywordType, nil)
		case *gopast.ChanType:
			addToken(node.Begin, node.Begin+goptoken.Pos(len("chan")), KeywordType, nil)
			if node.Arrow.IsValid() {
				addToken(node.Arrow, node.Arrow+2, OperatorType, nil)
			}
		case *gopast.GenDecl:
			switch node.Tok {
			case goptoken.IMPORT:
				addToken(node.TokPos, node.TokPos+goptoken.Pos(len("import")), KeywordType, nil)
			case goptoken.CONST:
				addToken(node.TokPos, node.TokPos+goptoken.Pos(len("const")), KeywordType, nil)
			case goptoken.TYPE:
				addToken(node.TokPos, node.TokPos+goptoken.Pos(len("type")), KeywordType, nil)
			case goptoken.VAR:
				addToken(node.TokPos, node.TokPos+goptoken.Pos(len("var")), KeywordType, nil)
			}
			if node.Lparen.IsValid() {
				addToken(node.Lparen, node.Lparen+1, OperatorType, nil)
			}
			if node.Rparen.IsValid() {
				addToken(node.Rparen, node.Rparen+1, OperatorType, nil)
			}
		case *gopast.FuncDecl:
			if node.Shadow {
				return true
			}

			addToken(node.Type.Func, node.Type.Func+goptoken.Pos(len("func")), KeywordType, nil)
			if node.Recv != nil {
				addToken(node.Recv.Opening, node.Recv.Opening+1, OperatorType, nil)
				addToken(node.Recv.Closing, node.Recv.Closing+1, OperatorType, nil)
			}
			if node.Operator {
				addToken(node.Name.Pos(), node.Name.End(), OperatorType, []SemanticTokenModifiers{ModDeclaration})
			}
		case *gopast.OverloadFuncDecl:
			addToken(node.Func, node.Func+goptoken.Pos(len("func")), KeywordType, nil)
			if node.Recv != nil {
				addToken(node.Recv.Opening, node.Recv.Opening+1, OperatorType, nil)
				addToken(node.Recv.Closing, node.Recv.Closing+1, OperatorType, nil)
			}
			if node.Operator {
				addToken(node.Name.Pos(), node.Name.End(), OperatorType, []SemanticTokenModifiers{ModDeclaration})
			} else {
				var tokenType SemanticTokenTypes
				if node.Recv != nil {
					tokenType = MethodType
				} else {
					tokenType = FunctionType
				}
				addToken(node.Name.Pos(), node.Name.End(), tokenType, []SemanticTokenModifiers{ModDeclaration})
			}
			addToken(node.Assign, node.Assign+1, OperatorType, nil)
			addToken(node.Lparen, node.Lparen+1, OperatorType, nil)
			addToken(node.Rparen, node.Rparen+1, OperatorType, nil)
		case *gopast.ImportSpec:
			if node.Path != nil {
				addToken(node.Path.Pos(), node.Path.End(), StringType, nil)
			}
		case *gopast.ValueSpec:
			if node.Type != nil {
				addToken(node.Type.Pos(), node.Type.End(), TypeType, nil)
			}
		case *gopast.FieldList:
			if node.Opening.IsValid() {
				addToken(node.Opening, node.Opening+1, OperatorType, nil)
			}
			if node.Closing.IsValid() {
				addToken(node.Closing, node.Closing+1, OperatorType, nil)
			}
		case *gopast.LabeledStmt:
			addToken(node.Label.Pos(), node.Label.End(), LabelType, nil)
			addToken(node.Colon, node.Colon+1, OperatorType, nil)
		case *gopast.SendStmt:
			addToken(node.Arrow, node.Arrow+2, OperatorType, nil)
		case *gopast.IncDecStmt:
			addToken(node.TokPos, node.TokPos+2, OperatorType, nil)
		case *gopast.AssignStmt:
			opLen := len(node.Tok.String())
			addToken(node.TokPos, node.TokPos+goptoken.Pos(opLen), OperatorType, nil)
		case *gopast.GoStmt:
			addToken(node.Go, node.Go+goptoken.Pos(len("go")), KeywordType, nil)
		case *gopast.DeferStmt:
			addToken(node.Defer, node.Defer+goptoken.Pos(len("defer")), KeywordType, nil)
		case *gopast.ReturnStmt:
			addToken(node.Return, node.Return+goptoken.Pos(len("return")), KeywordType, nil)
		case *gopast.BranchStmt:
			opLen := len(node.Tok.String())
			addToken(node.TokPos, node.TokPos+goptoken.Pos(opLen), KeywordType, nil)
		case *gopast.BlockStmt:
			addToken(node.Lbrace, node.Lbrace+1, OperatorType, nil)
			addToken(node.Rbrace, node.Rbrace+1, OperatorType, nil)
		case *gopast.IfStmt:
			addToken(node.If, node.If+goptoken.Pos(len("if")), KeywordType, nil)
		case *gopast.CaseClause:
			if node.List == nil {
				addToken(node.Case, node.Case+goptoken.Pos(len("default")), KeywordType, nil)
			} else {
				addToken(node.Case, node.Case+goptoken.Pos(len("case")), KeywordType, nil)
			}
		case *gopast.SwitchStmt:
			addToken(node.Switch, node.Switch+goptoken.Pos(len("switch")), KeywordType, nil)
		case *gopast.TypeSwitchStmt:
			addToken(node.Switch, node.Switch+goptoken.Pos(len("switch")), KeywordType, nil)
		case *gopast.CommClause:
			if node.Comm == nil {
				addToken(node.Case, node.Case+goptoken.Pos(len("default")), KeywordType, nil)
			} else {
				addToken(node.Case, node.Case+goptoken.Pos(len("case")), KeywordType, nil)
			}
			addToken(node.Colon, node.Colon+1, OperatorType, nil)
		case *gopast.SelectStmt:
			addToken(node.Select, node.Select+goptoken.Pos(len("select")), KeywordType, nil)
		case *gopast.ForStmt:
			addToken(node.For, node.For+goptoken.Pos(len("for")), KeywordType, nil)
		case *gopast.RangeStmt:
			addToken(node.For, node.For+goptoken.Pos(len("for")), KeywordType, nil)
			if !node.NoRangeOp {
				addToken(node.For+goptoken.Pos(len("for")+1), node.For+goptoken.Pos(len("for range")), KeywordType, nil)
			}
			if node.Tok != goptoken.ILLEGAL {
				addToken(node.TokPos, node.TokPos+goptoken.Pos(len(node.Tok.String())), OperatorType, nil)
			}
		case *gopast.LambdaExpr:
			addToken(node.Rarrow, node.Rarrow+2, OperatorType, nil)
			if node.LhsHasParen {
				addToken(node.First, node.First+1, OperatorType, nil)
				addToken(node.Rarrow-1, node.Rarrow, OperatorType, nil)
			}
			if node.RhsHasParen {
				addToken(node.Rarrow+2, node.Rarrow+3, OperatorType, nil)
				addToken(node.Last-1, node.Last, OperatorType, nil)
			}
		case *gopast.LambdaExpr2:
			addToken(node.Rarrow, node.Rarrow+2, OperatorType, nil)
			if node.LhsHasParen {
				addToken(node.First, node.First+1, OperatorType, nil)
				addToken(node.Rarrow-1, node.Rarrow, OperatorType, nil)
			}
		case *gopast.ForPhrase:
			addToken(node.For, node.For+goptoken.Pos(len("for")), KeywordType, nil)
			addToken(node.TokPos, node.TokPos+2, OperatorType, nil)
			if node.IfPos.IsValid() {
				addToken(node.IfPos, node.IfPos+goptoken.Pos(len("if")), KeywordType, nil)
			}
		case *gopast.ForPhraseStmt:
			addToken(node.For, node.For+goptoken.Pos(len("for")), KeywordType, nil)
			addToken(node.TokPos, node.TokPos+2, OperatorType, nil)
			if node.IfPos.IsValid() {
				addToken(node.IfPos, node.IfPos+goptoken.Pos(len("if")), KeywordType, nil)
			}
			if node.Body != nil {
				addToken(node.Body.Lbrace, node.Body.Lbrace+1, OperatorType, nil)
				addToken(node.Body.Rbrace, node.Body.Rbrace+1, OperatorType, nil)
			}
		case *gopast.ComprehensionExpr:
			addToken(node.Lpos, node.Lpos+1, OperatorType, nil)
			addToken(node.Rpos, node.Rpos+1, OperatorType, nil)
			if kvExpr, ok := node.Elt.(*gopast.KeyValueExpr); ok {
				addToken(kvExpr.Colon, kvExpr.Colon+1, OperatorType, nil)
			}
		case *gopast.Ellipsis:
			addToken(node.Ellipsis, node.Ellipsis+3, OperatorType, nil)
		case *gopast.ElemEllipsis:
			addToken(node.Ellipsis, node.Ellipsis+3, OperatorType, nil)
		}
		return true
	})

	sort.Slice(tokenInfos, func(i, j int) bool {
		if tokenInfos[i].startPos != tokenInfos[j].startPos {
			return tokenInfos[i].startPos < tokenInfos[j].startPos
		}
		return tokenInfos[i].endPos < tokenInfos[j].endPos
	})

	var (
		tokensData         = make([]uint32, 0, len(tokenInfos))
		prevLine, prevChar uint32
	)
	for _, info := range tokenInfos {
		start := result.fset.Position(info.startPos)
		end := result.fset.Position(info.endPos)

		line := uint32(start.Line - 1)
		char := uint32(start.Column - 1)
		length := uint32(end.Offset - start.Offset)
		if line < prevLine || (line == prevLine && char < prevChar) {
			continue
		}

		typeIndex := getSemanticTokenTypeIndex(info.tokenType)
		modifiersMask := getSemanticTokenModifiersMask(info.tokenModifiers)

		if line == prevLine {
			tokensData = append(tokensData, 0, char-prevChar, length, typeIndex, modifiersMask)
		} else {
			tokensData = append(tokensData, line-prevLine, char, length, typeIndex, modifiersMask)
		}

		prevLine = line
		prevChar = char
	}
	return &SemanticTokens{
		Data: tokensData,
	}, nil
}
