package pkgdoc

import (
	"go/ast"
	"go/doc"
	"go/token"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/util"
)

// PkgDoc is the documentation for a package.
type PkgDoc struct {
	Doc    string
	Path   string
	Name   string
	Vars   map[string]string
	Consts map[string]string
	Types  map[string]TypeDoc
	Funcs  map[string]string
}

// TypeDoc is the documentation for a type.
type TypeDoc struct {
	Doc     string
	Fields  map[string]string
	Methods map[string]string
}

// New creates a new [PkgDoc] from the given [ast.Package].
func New(pkg *ast.Package, pkgPath string) *PkgDoc {
	docPkg := doc.New(pkg, pkgPath, doc.AllDecls|doc.AllMethods|doc.PreserveAST)
	pkgDoc := &PkgDoc{
		Doc:    docPkg.Doc,
		Path:   pkgPath,
		Name:   pkg.Name,
		Vars:   make(map[string]string),
		Consts: make(map[string]string),
		Types:  make(map[string]TypeDoc),
		Funcs:  make(map[string]string),
	}

	for _, v := range docPkg.Vars {
		for _, name := range v.Names {
			if token.IsExported(name) {
				pkgDoc.Vars[name] = v.Doc
			}
		}
	}

	isGopPackage := false
	for _, c := range docPkg.Consts {
		for _, name := range c.Names {
			if token.IsExported(name) {
				pkgDoc.Consts[name] = c.Doc
				if name == util.GopPackage {
					isGopPackage = true
				}
			}
		}
	}

	for _, t := range docPkg.Types {
		if !token.IsExported(t.Name) {
			continue
		}

		for _, v := range t.Vars {
			for _, name := range v.Names {
				if token.IsExported(name) {
					pkgDoc.Vars[name] = v.Doc
				}
			}
		}
		for _, c := range t.Consts {
			for _, name := range c.Names {
				if token.IsExported(name) {
					pkgDoc.Consts[name] = c.Doc
				}
			}
		}

		typeDoc := TypeDoc{
			Doc:     t.Doc,
			Fields:  make(map[string]string),
			Methods: make(map[string]string),
		}
		for _, spec := range t.Decl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}
			structType, ok := typeSpec.Type.(*ast.StructType)
			if !ok {
				continue
			}
			for _, field := range structType.Fields.List {
				if len(field.Names) == 0 {
					if ident, ok := field.Type.(*ast.Ident); ok && token.IsExported(ident.Name) {
						typeDoc.Fields[ident.Name] = field.Doc.Text()
					}
				} else {
					for _, name := range field.Names {
						if token.IsExported(name.Name) {
							typeDoc.Fields[name.Name] = field.Doc.Text()
						}
					}
				}
			}
		}
		for _, m := range t.Methods {
			if token.IsExported(m.Name) {
				typeDoc.Methods[m.Name] = m.Doc
			}
		}
		pkgDoc.Types[t.Name] = typeDoc
	}

	for _, f := range docPkg.Funcs {
		if !token.IsExported(f.Name) {
			continue
		}
		pkgDoc.Funcs[f.Name] = f.Doc
		if !isGopPackage {
			continue
		}
		switch {
		case strings.HasPrefix(f.Name, util.GoptPrefix):
			recvTypeName, methodName, ok := util.SplitGoptMethod(f.Name)
			if !ok {
				break
			}
			recvTypeDoc, ok := pkgDoc.Types[recvTypeName]
			if !ok {
				recvTypeDoc = TypeDoc{
					Methods: make(map[string]string),
				}
				pkgDoc.Types[recvTypeName] = recvTypeDoc
			}
			recvTypeDoc.Methods[methodName] = f.Doc
		}
	}

	return pkgDoc
}
