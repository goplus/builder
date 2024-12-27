package pkgdoc

import (
	"go/ast"
	"go/doc"
	"go/token"
	"path"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// PkgDoc is the documentation for a package.
type PkgDoc struct {
	Doc    string
	Path   string
	Name   string
	Vars   map[string]string
	Consts map[string]string
	Types  map[string]*TypeDoc
	Funcs  map[string]string
}

// typeDoc returns the documentation for the given type name. It creates a new
// [TypeDoc] if the type name is not found.
func (p *PkgDoc) typeDoc(typeName string) *TypeDoc {
	if _, ok := p.Types[typeName]; !ok {
		p.Types[typeName] = &TypeDoc{
			Fields:  make(map[string]string),
			Methods: make(map[string]string),
		}
	}
	return p.Types[typeName]
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
		Types:  make(map[string]*TypeDoc),
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

		typeDoc := pkgDoc.typeDoc(t.Name)
		typeDoc.Doc = t.Doc
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
				continue
			}
			pkgDoc.typeDoc(recvTypeName).Methods[methodName] = f.Doc
		}
	}

	return pkgDoc
}

// NewForSpxMainPackage creates a new [PkgDoc] for the spx main package.
func NewForSpxMainPackage(pkg *gopast.Package) *PkgDoc {
	pkgDoc := &PkgDoc{
		Path:   "main",
		Name:   "main",
		Vars:   make(map[string]string),
		Consts: make(map[string]string),
		Types:  make(map[string]*TypeDoc),
		Funcs:  make(map[string]string),
	}

	for _, astFile := range pkg.Files {
		if astFile.Doc != nil {
			pkgDoc.Doc = astFile.Doc.Text()
			break
		}
	}

	for spxFile, astFile := range pkg.Files {
		var spxBaseSelectorTypeName string
		if spxFileBaseName := path.Base(spxFile); spxFileBaseName == "main.spx" {
			spxBaseSelectorTypeName = "Game"
		} else {
			spxBaseSelectorTypeName = strings.TrimSuffix(spxFileBaseName, ".spx")
		}
		spxBaseSelectorTypeDoc := pkgDoc.typeDoc(spxBaseSelectorTypeName)

		var firstVarBlock *gopast.GenDecl
		for _, decl := range astFile.Decls {
			switch decl := decl.(type) {
			case *gopast.GenDecl:
				if firstVarBlock == nil && decl.Tok == goptoken.VAR {
					firstVarBlock = decl
				}

				for _, spec := range decl.Specs {
					var doc string
					switch spec := spec.(type) {
					case *gopast.ValueSpec:
						if spec.Doc != nil {
							doc = spec.Doc.Text()
						}
					case *gopast.TypeSpec:
						if spec.Doc != nil {
							doc = spec.Doc.Text()
						}
					case *gopast.ImportSpec:
						if spec.Doc != nil {
							doc = spec.Doc.Text()
						}
					}
					if doc == "" && decl.Doc != nil && len(decl.Specs) == 1 {
						doc = decl.Doc.Text()
					}

					switch spec := spec.(type) {
					case *gopast.ValueSpec:
						for _, name := range spec.Names {
							switch decl.Tok {
							case goptoken.VAR:
								if decl == firstVarBlock {
									spxBaseSelectorTypeDoc.Fields[name.Name] = doc
								} else {
									pkgDoc.Vars[name.Name] = doc
								}
							case goptoken.CONST:
								pkgDoc.Consts[name.Name] = doc
							}
						}
					case *gopast.TypeSpec:
						if structType, ok := spec.Type.(*gopast.StructType); ok {
							typeDoc := pkgDoc.typeDoc(spec.Name.Name)
							typeDoc.Doc = doc
							for _, field := range structType.Fields.List {
								fieldDoc := ""
								if field.Doc != nil {
									fieldDoc = field.Doc.Text()
								}

								if len(field.Names) == 0 {
									ident, ok := field.Type.(*gopast.Ident)
									if !ok {
										continue
									}
									typeDoc.Fields[ident.Name] = fieldDoc
								} else {
									for _, name := range field.Names {
										typeDoc.Fields[name.Name] = fieldDoc
									}
								}
							}
						}
					}
				}
			case *gopast.FuncDecl:
				if decl.Shadow {
					continue
				}

				var doc string
				if decl.Doc != nil {
					doc = decl.Doc.Text()
				}

				var recvTypeDoc *TypeDoc
				if decl.Recv == nil {
					recvTypeDoc = spxBaseSelectorTypeDoc
				} else if len(decl.Recv.List) == 1 {
					recvType := decl.Recv.List[0].Type
					if star, ok := recvType.(*gopast.StarExpr); ok {
						recvType = star.X
					}
					recvTypeName := recvType.(*gopast.Ident).Name
					recvTypeDoc = pkgDoc.typeDoc(recvTypeName)
				}

				recvTypeDoc.Methods[decl.Name.Name] = doc
			}
		}
	}

	return pkgDoc
}
