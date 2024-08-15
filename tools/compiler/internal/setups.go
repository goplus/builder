package internal

import (
	"fmt"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/mod/gopmod"
	"github.com/goplus/mod/modfile"
	"github.com/goplus/mod/modload"
	"go/types"
)

// default spx project mod file
var spxProject = &modfile.Project{
	Ext: ".gmx", Class: "*Game",
	Works:    []*modfile.Class{{Ext: ".spx", Class: "Sprite"}},
	PkgPaths: []string{"github.com/goplus/spx", "math"}}

// init spx mod
func initSPXMod() *gopmod.Module {
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
		Mode: parser.DeclarationErrors,
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

func initTypeConfig(file *ast.File, fileSet *token.FileSet, mod *gopmod.Module) *typesutil.Config {
	return &typesutil.Config{
		Types:                 types.NewPackage("main", file.Name.Name),
		Fset:                  fileSet,
		Mod:                   mod,
		UpdateGoTypesOverload: false,
	}
}

func initTypeInfo() *typesutil.Info {
	return &typesutil.Info{
		Types:      make(map[ast.Expr]types.TypeAndValue),
		Defs:       make(map[*ast.Ident]types.Object),
		Uses:       make(map[*ast.Ident]types.Object),
		Implicits:  make(map[ast.Node]types.Object),
		Selections: make(map[*ast.SelectorExpr]*types.Selection),
		Scopes:     make(map[ast.Node]*types.Scope),
		Overloads:  make(map[*ast.Ident][]types.Object),
	}
}

func initParser(fileSet *token.FileSet, fileName string, fileCode string) (*ast.File, error) {
	// new parser
	return parser.ParseEntry(fileSet, fileName, fileCode, initSPXParserConf())
}
