package internal

import (
	"fmt"
	"github.com/goplus/gop"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/cl"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/mod/env"
	"github.com/goplus/mod/gopmod"
	"github.com/goplus/mod/modfile"
	"github.com/goplus/mod/modload"
	"go/types"
	"syscall/js"
)

type Class = cl.Class

var (
	projects = make(map[string]*cl.Project)
)

func RegisterClassFileType(ext string, class string, works []*Class, pkgPaths ...string) {
	cls := &cl.Project{
		Ext:      ext,
		Class:    class,
		Works:    works,
		PkgPaths: pkgPaths,
	}
	if ext != "" {
		projects[ext] = cls
	}
	for _, w := range works {
		projects[w.Ext] = cls
	}
}

var spxProject = &modfile.Project{
	Ext: ".gmx", Class: "*Game",
	Works:    []*modfile.Class{{Ext: ".spx", Class: "Sprite"}},
	PkgPaths: []string{"github.com/goplus/spx", "math"}}

var spxMod *gopmod.Module

func StartSPXTypesAnalyser_JS(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return StartSPXTypesAnalyser(fileName, fileCode)
}

func StartSPXTypesAnalyser(fileName string, fileCode string) interface{} {
	// init spx mode
	initSPXMod()
	// init conf
	conf := initSPXParserConf()
	// init fset
	fileSet := token.NewFileSet()

	info, err := spxInfo(spxMod, fileSet, fileName, fileCode, conf)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(info)
	return info
}

// init function
func initSPXMod() {
	// init spxMod
	spxMod = gopmod.New(modload.Default)
	spxMod.Opt.Projects = append(spxMod.Opt.Projects, spxProject)
	spxMod.ImportClasses()
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

func spxInfo(mod *gopmod.Module, fileSet *token.FileSet, fileName string, fileCode string, parseConf parser.Config) (*typesutil.Info, error) {
	// new parser
	f, err := parser.ParseEntry(fileSet, fileName, fileCode, parseConf)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	// init types conf
	conf := &types.Config{}
	conf.Importer = gop.NewImporter(nil, &env.Gop{Root: "../..", Version: "1.0"}, fileSet)
	chkOpts := &typesutil.Config{
		Types:                 types.NewPackage("main", f.Name.Name),
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
	err = check.Files(nil, []*ast.File{f})
	return info, err
}
