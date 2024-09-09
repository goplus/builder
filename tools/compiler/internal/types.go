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
)

// codeInfo is use igop to analyse spx code and get info.
func codeInfo(file *ast.File, fileSet *token.FileSet, pkg map[string]*ast.Package) (*typesutil.Info, error) {
	// init types conf
	ctx := igop.NewContext(0)
	c := gopbuild.NewContext(ctx)
	//TODO(callme-taota): change igop importer
	conf := &types.Config{}
	// replace it!
	conf.Importer = c
	chkOpts := initTypeConfig(file, fileSet)

	// init info
	info := initTypeInfo()
	check := typesutil.NewChecker(conf, chkOpts, nil, info)

	var files []*ast.File
	for _, f := range pkg[PKG].Files {
		files = append(files, f)
	}
	err := check.Files(nil, files)
	return info, err
}

// node item contains the ast node item info.
type nodeItem struct {
	Position token.Position `json:"position"`
	ExprName string         `json:"exprName"`
	ExprType string         `json:"exprType"`
	Mode     string         `json:"mode"`
	Type     string         `json:"type"`
}

// def2List make defer to string list.
func def2List(fset *token.FileSet, defs map[*ast.Ident]types.Object) []string {
	var items []string
	for expr, obj := range defs {
		if obj == nil {
			continue
		}
		var buf strings.Builder
		posn := fset.Position(expr.Pos())
		// line:col | expr | mode : type = value
		fmt.Fprintf(&buf, "%2d:%2d | %-19s | %40s | %10s",
			posn.Line, posn.Column, expr,
			obj, obj.Parent())
		items = append(items, buf.String())
	}
	sort.Strings(items)
	return items
}

func usesList(fset *token.FileSet, uses map[*ast.Ident]types.Object) []string {
	var items []string
	for expr, obj := range uses {
		var buf strings.Builder
		posn := fset.Position(expr.Pos())
		// line:col | expr | mode : type = value
		fmt.Fprintf(&buf, "%2d:%2d | %-19s | %-20s | %10s | %10s | %10s ",
			posn.Line, posn.Column, expr, obj, obj.Id(), obj.Parent(), obj.Pkg())
		items = append(items, buf.String())
	}
	sort.Strings(items)
	return items
}

func info2List(fset *token.FileSet, types map[ast.Expr]types.TypeAndValue) []nodeItem {
	var items []nodeItem
	for expr, tv := range types {
		posn := fset.Position(expr.Pos())
		tvstr := tv.Type.String()
		if tv.Value != nil {
			tvstr += " = " + tv.Value.String()
		}
		item := nodeItem{
			Position: posn,
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
