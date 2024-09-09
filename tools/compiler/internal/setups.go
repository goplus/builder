package internal

import (
	"fmt"
	"go/types"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
	"github.com/goplus/igop/gopbuild"
	"github.com/goplus/mod/gopmod"
	"github.com/goplus/mod/modload"
)

// init spx mod
func initSPXMod() *gopmod.Module {
	spxMod := gopmod.New(modload.Default)
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
		ClassKind: gopbuild.ClassKind,
		Mode:      parser.DeclarationErrors,
	}
}

// init type utils config.
func initTypeConfig(file *ast.File, fileSet *token.FileSet) *typesutil.Config {
	return &typesutil.Config{
		Types:                 types.NewPackage("main", file.Name.Name),
		Fset:                  fileSet,
		Mod:                   initSPXMod(),
		UpdateGoTypesOverload: false,
	}
}

// init type info
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

// init file parser
func initParser(fileSet *token.FileSet, fileName string, fileCode string) (*ast.File, error) {
	// new parser
	return parser.ParseEntry(fileSet, fileName, fileCode, initSPXParserConf())
}

// init project parser
func initProjectParser(fileSet *token.FileSet, files map[string]string) (map[string]*ast.Package, error) {
	var fileNames []string
	vfs := NewVFS()
	for fileName, fileCode := range files {
		fileNames = append(fileNames, fileName)
		vfs.AddFile(fileName, fileCode)
	}
	return parser.ParseFSEntries(fileSet, vfs, fileNames, initSPXParserConf())
}
