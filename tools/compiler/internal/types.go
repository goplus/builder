package internal

import (
	"fmt"
	"go/types"
	"sort"
	"strings"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/format"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	"github.com/goplus/mod/gopmod"
)

// GetSPXFileType return a json object with spx type info.
func GetSPXFileType(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	info, err := spxInfo(initSPXMod(), fset, fileName, fileCode)
	if err != nil {
		return []tokenInfo{}
	}
	list := info2List(fset, info.Types)
	return list
}

// spxInfo is use igop to analyse spx code and get info.
func spxInfo(mod *gopmod.Module, fileSet *token.FileSet, fileName string, fileCode string) (*typesutil.Info, error) {
	file, err := initParser(fileSet, fileName, fileCode)
	if err != nil {
		return nil, err
	}
	// init types conf
	ctx := igop.NewContext(0)
	c := gopbuild.NewContext(ctx)
	//TODO(callme-taota): change igop importer
	conf := &types.Config{}
	// replace it!
	conf.Importer = c
	chkOpts := initTypeConfig(file, fileSet, mod)
	// init info
	info := initTypeInfo()
	check := typesutil.NewChecker(conf, chkOpts, nil, info)
	err = check.Files(nil, []*ast.File{file})
	return info, err
}

type position struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type tokenInfo struct {
	Position position `json:"position"`
	ExprName string   `json:"exprName"`
	ExprType string   `json:"exprType"`
	Mode     string   `json:"mode"`
	Type     string   `json:"type"`
}

func info2List(fset *token.FileSet, types map[ast.Expr]types.TypeAndValue) []tokenInfo {
	var items []tokenInfo
	for expr, tv := range types {
		posn := fset.Position(expr.Pos())
		tvstr := tv.Type.String()
		if tv.Value != nil {
			tvstr += " = " + tv.Value.String()
		}
		item := tokenInfo{
			Position: position{
				Line:   posn.Line,
				Column: posn.Column,
			},
			ExprName: exprString(fset, expr),
			ExprType: fmt.Sprintf("%T", expr),
			Mode:     mode(tv),
			Type:     tvstr,
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Position.Line == items[j].Position.Line {
			return items[i].Position.Column < items[j].Position.Column
		}
		return items[i].Position.Line < items[j].Position.Line
	})
	return items
}

func mode(tv types.TypeAndValue) string {
	switch {
	case tv.IsVoid():
		return "void"
	case tv.IsType():
		return "type"
	case tv.IsBuiltin():
		return "builtin"
	case tv.IsNil():
		return "nil"
	case tv.Assignable():
		if tv.Addressable() {
			return "var"
		}
		return "mapindex"
	case tv.IsValue():
		return "value"
	default:
		return "unknown"
	}
}

func exprString(fset *token.FileSet, expr ast.Expr) string {
	var buf strings.Builder
	format.Node(&buf, fset, expr)
	return buf.String()
}
