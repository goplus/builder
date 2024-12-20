package server

import (
	"errors"
	"slices"

	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_documentHighlight
func (s *Server) textDocumentDocumentHighlight(params *DocumentHighlightParams) (*[]DocumentHighlight, error) {
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

	_, targetObj := result.identAndObjectAtASTFilePosition(astFile, params.Position)
	if targetObj == nil {
		return nil, nil
	}

	var highlights []DocumentHighlight
	gopast.Inspect(astFile, func(node gopast.Node) bool {
		if node == nil {
			return true
		}
		ident, ok := node.(*gopast.Ident)
		if !ok {
			return true
		}
		obj := result.typeInfo.ObjectOf(ident)
		if obj != targetObj {
			return true
		}
		path, _ := util.PathEnclosingInterval(astFile, ident.Pos(), ident.End())
		if len(path) < 2 {
			return true
		}

		kind := Text

		for _, parent := range slices.Backward(path[:len(path)-1]) {
			switch p := parent.(type) {
			case *gopast.ValueSpec:
				for _, name := range p.Names {
					if name == ident {
						kind = Write
						break
					}
				}
			case *gopast.Field:
				if p.Names != nil {
					for _, name := range p.Names {
						if name == ident {
							kind = Write
							break
						}
					}
				}
			case *gopast.FuncDecl:
				if p.Name == ident {
					kind = Write
				}
			case *gopast.TypeSpec:
				if p.Name == ident {
					kind = Write
				}
			case *gopast.LabeledStmt:
				if p.Label == ident {
					kind = Write
				}
			case *gopast.AssignStmt:
				switch p.Tok {
				case goptoken.ASSIGN:
					for _, lhs := range p.Lhs {
						if lhs == ident {
							kind = Write
							break
						}
					}
					if kind != Write {
						for _, rhs := range p.Rhs {
							if rhs == ident {
								kind = Read
								break
							}
						}
					}
				case goptoken.DEFINE:
					for _, lhs := range p.Lhs {
						if lhs == ident {
							kind = Write
							break
						}
					}
				default:
					kind = Write
				}
			case *gopast.IncDecStmt:
				if p.X == ident {
					kind = Write
				}
			case *gopast.RangeStmt:
				if p.X == ident {
					kind = Read
				} else if p.Key == ident || p.Value == ident {
					kind = Write
				}
			case *gopast.TypeSwitchStmt:
				if p.Assign != nil {
					if assign, ok := p.Assign.(*gopast.AssignStmt); ok {
						for _, lhs := range assign.Lhs {
							if lhs == ident {
								kind = Write
								break
							}
						}
					}
				}
			case *gopast.BinaryExpr,
				*gopast.UnaryExpr,
				*gopast.CallExpr,
				*gopast.CompositeLit,
				*gopast.IndexExpr,
				*gopast.ReturnStmt,
				*gopast.SendStmt:
				kind = Read
			case *gopast.KeyValueExpr:
				if p.Key == ident || p.Value == ident {
					kind = Read
				}
			case *gopast.SelectorExpr:
				if p.X == ident {
					kind = Read
				}
			}
			if kind != Text {
				break
			}
		}

		highlights = append(highlights, DocumentHighlight{
			Range: Range{
				Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
				End:   FromGopTokenPosition(result.fset.Position(ident.End())),
			},
			Kind: kind,
		})
		return true
	})
	return &highlights, nil
}
