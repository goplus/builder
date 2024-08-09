package internal

import (
	"fmt"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/format"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	"github.com/goplus/mod/gopmod"
	"github.com/goplus/mod/modfile"
	"github.com/goplus/mod/modload"
	"go/constant"
	"go/types"
	"strings"
)

var spxProject = &modfile.Project{
	Ext: ".gmx", Class: "*Game",
	Works:    []*modfile.Class{{Ext: ".spx", Class: "Sprite"}},
	PkgPaths: []string{"github.com/goplus/spx", "math"}}

// init function
func initSPXMod() *gopmod.Module {
	//init spxMod
	var spxMod *gopmod.Module
	spxMod = gopmod.New(modload.Default)
	spxMod.Opt.Projects = append(spxMod.Opt.Projects, spxProject)
	err := spxMod.ImportClasses()
	if err != nil {
		fmt.Println(err)
		return nil
	}
	return spxMod
}

// init function
func initSPXParserConf() parser.Config {
	return parser.Config{
		ClassKind: func(fname string) (isProj bool, ok bool) {
			ext := modfile.ClassExt(fname)
			c, ok := lookupClass(ext)
			if ok {
				isProj = c.IsProj(ext, fname)
			}
			return
		},
	}
}

// check function
func lookupClass(ext string) (c *modfile.Project, ok bool) {
	switch ext {
	case ".gmx", ".spx":
		return spxProject, true
	}
	return
}

func GetSPXFileType(fileName, fileCode string) interface{} {
	fset := token.NewFileSet()
	info, err := spxInfo(initSPXMod(), fset, fileName, fileCode, initSPXParserConf())
	if err != nil {
		fmt.Println(err)
	}
	i := typesListInfo(fset, info.Types)
	return i
}

func spxInfo(mod *gopmod.Module, fileSet *token.FileSet, fileName string, fileCode string, parseConf parser.Config) (*typesutil.Info, error) {
	// new parser
	file, err := parser.ParseEntry(fileSet, fileName, fileCode, parseConf)
	if err != nil {
		return nil, err
	}
	// init types conf
	ctx := igop.NewContext(0)
	c := gopbuild.NewContext(ctx)
	//TODO: igop
	conf := &types.Config{}
	// replace it!
	conf.Importer = c
	chkOpts := &typesutil.Config{
		Types:                 types.NewPackage("main", file.Name.Name),
		Fset:                  fileSet,
		Mod:                   mod,
		UpdateGoTypesOverload: false,
	}

	// init info
	info := &typesutil.Info{
		Types:      make(map[ast.Expr]types.TypeAndValue),
		Defs:       make(map[*ast.Ident]types.Object),
		Uses:       make(map[*ast.Ident]types.Object),
		Implicits:  make(map[ast.Node]types.Object),
		Selections: make(map[*ast.SelectorExpr]*types.Selection),
		Scopes:     make(map[ast.Node]*types.Scope),
		Overloads:  make(map[*ast.Ident][]types.Object),
	}
	check := typesutil.NewChecker(conf, chkOpts, nil, info)
	err = check.Files(nil, []*ast.File{file})
	return info, err
}

type operandMode byte

type TypeAndValue struct {
	mode  operandMode
	Type  types.Type
	Value constant.Value
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

func exprType(expr ast.Expr) string {
	switch expr.(type) {
	case *ast.Ident:
		return "ast.Ident"
	case *ast.BasicLit:
		return "ast.BasicLit"
	case *ast.BinaryExpr:
		return "ast.BinaryExpr"
	case *ast.CallExpr:
		return "ast.CallExpr"
	case *ast.IndexExpr:
		return "ast.IndexExpr"
	case *ast.SliceExpr:
		return "ast.SliceExpr"
	case *ast.SelectorExpr:
		return "ast.SelectorExpr"
	case *ast.StarExpr:
		return "ast.StarExpr"
	case *ast.UnaryExpr:
		return "ast.UnaryExpr"
	case *ast.ParenExpr:
		return "ast.ParenExpr"
	case *ast.TypeAssertExpr:
		return "ast.TypeAssertExpr"
	case *ast.CompositeLit:
		return "ast.CompositeLit"
	case *ast.FuncLit:
		return "ast.FuncLit"
	case *ast.KeyValueExpr:
		return "ast.KeyValueExpr"
	case *ast.ArrayType:
		return "ast.ArrayType"
	case *ast.StructType:
		return "ast.StructType"
	case *ast.FuncType:
		return "ast.FuncType"
	case *ast.InterfaceType:
		return "ast.InterfaceType"
	case *ast.MapType:
		return "ast.MapType"
	case *ast.ChanType:
		return "ast.ChanType"
	default:
		return "unknown"
	}
}

type Position struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type TokenInfo struct {
	Position Position `json:"position"`
	ExprName string   `json:"exprName"`
	ExprType string   `json:"exprType"`
	Mode     string   `json:"mode"`
	Type     string   `json:"type"`
}

func typesListInfo(fset *token.FileSet, types map[ast.Expr]types.TypeAndValue) []TokenInfo {
	var items []TokenInfo
	for expr, tv := range types {
		posn := fset.Position(expr.Pos())
		tvstr := tv.Type.String()
		if tv.Value != nil {
			tvstr += " = " + tv.Value.String()
		}
		item := TokenInfo{
			Position: Position{
				Line:   posn.Line,
				Column: posn.Column,
			},
			ExprName: exprString(fset, expr),
			ExprType: exprType(expr),
			Mode:     mode(tv),
			Type:     tvstr,
		}
		items = append(items, item)
	}
	return items
}
