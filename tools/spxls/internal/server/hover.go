package server

import (
	"errors"
	"fmt"
	"go/types"
	"slices"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_hover
func (s *Server) textDocumentHover(params *HoverParams) (*Hover, error) {
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

	if refKey, ref := result.spxResourceRefAtASTFilePosition(astFile, params.Position); refKey != nil {
		return &Hover{
			Contents: MarkupContent{
				Kind: Markdown,
				Value: formatHoverSpxResource(hoverSpxResource{
					Preview: string(refKey.URI()),
				}),
			},
			Range: Range{
				Start: FromGopTokenPosition(result.fset.Position(ref.Node.Pos())),
				End:   FromGopTokenPosition(result.fset.Position(ref.Node.End())),
			},
		}, nil
	}

	ident, obj := result.identAndObjectAtASTFilePosition(astFile, params.Position)
	if obj == nil {
		return nil, nil
	}

	var defs []hoverDefinition
	if obj.Pkg() == nil {
		pkgPath := "builtin"
		idName := obj.Name()
		overview, ok := builtinDefinitionOverviews[idName]
		if !ok {
			overview = "builtin " + idName
		}

		var detail string
		if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
			if doc, ok := pkgDoc.Vars[idName]; ok {
				detail = doc
			} else if doc, ok := pkgDoc.Consts[idName]; ok {
				detail = doc
			} else if typeDoc, ok := pkgDoc.Types[idName]; ok {
				if doc, ok := typeDoc.Fields[idName]; ok {
					detail = doc
				} else if doc, ok := typeDoc.Methods[idName]; ok {
					detail = doc
				} else {
					detail = typeDoc.Doc
				}
			} else if doc, ok := pkgDoc.Funcs[idName]; ok {
				detail = doc
			}
		}

		defs = append(defs, hoverDefinition{
			ID: SpxDefinitionIdentifier{
				Package: &pkgPath,
				Name:    &idName,
			},
			Overview: overview,
			Detail:   detail,
		})
	} else {
		switch obj := obj.(type) {
		case *types.Builtin:
		case *types.Var:
			defs = append(defs, makeVarHoverDefinition(result, obj))
		case *types.Const:
			defs = append(defs, makeConstHoverDefinition(result, obj))
		case *types.Func:
			defs = append(defs, makeFuncHoverDefinition(result, obj)...)
		case *types.TypeName:
			defs = append(defs, makeTypeHoverDefinition(result, obj))
		case *types.PkgName:
			defs = append(defs, makePkgNameHoverDefinition(result, obj))
		}
	}
	return &Hover{
		Contents: MarkupContent{
			Kind:  Markdown,
			Value: formatHoverDefinitions(defs...),
		},
		Range: Range{
			Start: FromGopTokenPosition(result.fset.Position(ident.Pos())),
			End:   FromGopTokenPosition(result.fset.Position(ident.End())),
		},
	}, nil
}

// builtinDefinitionOverviews contains overview descriptions for Go builtin
// functions and types.
var builtinDefinitionOverviews = map[string]string{
	"any":        "type any interface{}",
	"append":     "func append(slice []T, elems ...T) []T",
	"bool":       "type bool bool",
	"byte":       "type byte = uint8",
	"cap":        "func cap(v Type) int",
	"clear":      "func clear(m Type)",
	"close":      "func close(c chan<- Type)",
	"complex":    "func complex(r, i FloatType) ComplexType",
	"complex64":  "type complex64 complex64",
	"complex128": "type complex128 complex128",
	"copy":       "func copy(dst, src []Type) int",
	"delete":     "func delete(m map[Type]Type1, key Type)",
	"error":      "type error interface { Error() string }",
	"float32":    "type float32 float32",
	"float64":    "type float64 float64",
	"imag":       "func imag(c ComplexType) FloatType",
	"int":        "type int int",
	"int8":       "type int8 int8",
	"int16":      "type int16 int16",
	"int32":      "type int32 int32",
	"int64":      "type int64 int64",
	"len":        "func len(v Type) int",
	"make":       "func make(t Type, size ...IntegerType) Type",
	"max":        "func max(x Type, y ...Type) Type",
	"min":        "func min(x Type, y ...Type) Type",
	"new":        "func new(Type) *Type",
	"panic":      "func panic(v interface{})",
	"print":      "func print(args ...Type)",
	"println":    "func println(args ...Type)",
	"real":       "func real(c ComplexType) FloatType",
	"recover":    "func recover() interface{}",
	"rune":       "type rune = int32",
	"string":     "type string string",
	"uint":       "type uint uint",
	"uint8":      "type uint8 uint8",
	"uint16":     "type uint16 uint16",
	"uint32":     "type uint32 uint32",
	"uint64":     "type uint64 uint64",
	"uintptr":    "type uintptr uintptr",
}

// hoverSpxResource represents a SPX resource used in hover displays.
type hoverSpxResource struct {
	Preview string
}

// formatHoverSpxResource formats a SPX resource for display.
func formatHoverSpxResource(resource hoverSpxResource) string {
	return fmt.Sprintf("<resource-preview resource=%q />\n", resource.Preview)
}

// hoverDefinition represents a definition used in hover displays.
type hoverDefinition struct {
	ID       SpxDefinitionIdentifier
	Overview string
	Detail   string
}

// formatHoverDefinitions formats hover definitions display.
func formatHoverDefinitions(defs ...hoverDefinition) string {
	var sb strings.Builder
	for _, def := range defs {
		sb.WriteString("<definition-overview-wrapper>")
		sb.WriteString(def.Overview)
		sb.WriteString("</definition-overview-wrapper>\n")
		sb.WriteString(fmt.Sprintf("<definition-detail def-id=%q>\n", def.ID))
		sb.WriteString(def.Detail)
		sb.WriteString("</definition-detail>\n")
	}
	return sb.String()
}

// makeVarHoverDefinition makes hover definition for variables.
func makeVarHoverDefinition(result *compileResult, v *types.Var) hoverDefinition {
	pkg := v.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(v)

	var overview strings.Builder
	if !v.IsField() {
		overview.WriteString("var ")
	} else if pkgPath != "main" || (defIdent != nil && !result.isInMainSpxFirstVarBlock(defIdent.Pos())) {
		overview.WriteString("field ")
	} else {
		overview.WriteString("var ")
	}
	overview.WriteString(v.Name())
	overview.WriteString(" ")
	overview.WriteString(v.Type().String())

	var detail, typeName string
	if pkgPath == "main" {
		if defIdent != nil && defIdent.Obj != nil {
			switch decl := defIdent.Obj.Decl.(type) {
			case *gopast.ValueSpec:
				detail = decl.Doc.Text()
				if detail == "" {
					genDecl, ok := result.mainASTPkgSpecToGenDecl[decl]
					if ok && len(genDecl.Specs) == 1 {
						detail = genDecl.Doc.Text()
					}
				}
			case *gopast.Field:
				detail = decl.Doc.Text()
				for spec := range result.mainASTPkgSpecToGenDecl {
					typeSpec, ok := spec.(*gopast.TypeSpec)
					if !ok {
						continue
					}
					structType, ok := typeSpec.Type.(*gopast.StructType)
					if !ok {
						continue
					}

					if slices.Contains(structType.Fields.List, decl) {
						typeName = typeSpec.Name.Name
						break
					}
				}
			}
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		detail = pkgDoc.Vars[v.Name()]
		if v.IsField() {
			for _, obj := range result.typeInfo.Defs {
				named, ok := unwrapPointerType(obj.Type()).(*types.Named)
				if !ok || named.Obj().Pkg() != pkg {
					continue
				}
				if _, ok := named.Underlying().(*types.Struct); !ok {
					continue
				}
				walkStruct(named, func(named *types.Named, namedParents []*types.Named, member types.Object) {
					field, ok := member.(*types.Var)
					if !ok {
						return
					}

					if field == v {
						typeName = named.Obj().Name()
					}
				})
				if typeName != "" {
					break
				}
			}
		}
	}

	idName := v.Name()
	if typeName != "" {
		idName = typeName + "." + idName
	}
	return hoverDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,
	}
}

// makeConstHoverDefinition makes hover definition for constants.
func makeConstHoverDefinition(result *compileResult, c *types.Const) hoverDefinition {
	pkg := c.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(c)

	var overview strings.Builder
	overview.WriteString("const ")
	overview.WriteString(c.Name())
	overview.WriteString(" = ")
	overview.WriteString(c.Val().String())

	var detail string
	if pkgPath == "main" {
		if defIdent != nil && defIdent.Obj != nil {
			switch decl := defIdent.Obj.Decl.(type) {
			case *gopast.ValueSpec:
				detail = decl.Doc.Text()
				if detail == "" {
					genDecl, ok := result.mainASTPkgSpecToGenDecl[decl]
					if ok && len(genDecl.Specs) == 1 {
						detail = genDecl.Doc.Text()
					}
				}
			}
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		detail = pkgDoc.Consts[c.Name()]
	}

	idName := c.Name()
	return hoverDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,
	}
}

// makeFuncHoverDefinition makes hover definition for functions.
func makeFuncHoverDefinition(result *compileResult, fun *types.Func) []hoverDefinition {
	pkg := fun.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(fun)

	overview, parsedName, recvTypeNamed, overloadID := makeFuncHoverDefinitionOverview(fun)
	var recvTypeNamedName string
	if recvTypeNamed != nil {
		recvTypeNamedName = recvTypeNamed.Obj().Name()
		if pkgPath == spxPkgPath {
			switch recvTypeNamedName {
			case "Sprite":
				recvTypeNamedName = "SpriteImpl"
			}
		}
	}

	var detail string
	if pkgPath == "main" {
		switch decl := defIdent.Obj.Decl.(type) {
		case *gopast.FuncDecl:
			detail = decl.Doc.Text()
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		if recvTypeNamed == nil {
			detail = pkgDoc.Funcs[fun.Name()]
		} else if spxRecvTypeDoc, ok := pkgDoc.Types[recvTypeNamedName]; ok {
			detail = spxRecvTypeDoc.Methods[fun.Name()]
		}
	}

	idName := parsedName
	if recvTypeNamed != nil {
		recvTypeNamedNameToDisplay := recvTypeNamedName
		if pkgPath == spxPkgPath && recvTypeNamedName == "SpriteImpl" {
			recvTypeNamedNameToDisplay = "Sprite"
		}
		idName = recvTypeNamedNameToDisplay + "." + idName
	}
	defs := []hoverDefinition{
		{
			ID: SpxDefinitionIdentifier{
				Package:    &pkgPath,
				Name:       &idName,
				OverloadID: overloadID,
			},
			Overview: overview,
			Detail:   detail,
		},
	}
	if overloadID == nil {
		return defs
	}
	pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
	if err != nil {
		return defs
	}
	if recvTypeNamed != nil {
		recvType := pkg.Scope().Lookup(recvTypeNamedName).Type()
		if recvType == nil {
			return defs
		}
		if _, ok := recvType.Underlying().(*types.Struct); !ok {
			return defs
		}

		recvTypeDoc, ok := pkgDoc.Types[recvTypeNamedName]
		if !ok {
			return defs
		}
		for name, doc := range recvTypeDoc.Methods {
			if name == fun.Name() {
				continue
			}
			pn, oID := parseGopFuncName(name)
			if pn != parsedName {
				continue
			}

			walkStruct(recvType, func(named *types.Named, namedParents []*types.Named, member types.Object) {
				method, ok := member.(*types.Func)
				if !ok {
					return
				}

				methodName := method.Name()
				if methodOverloads := expandGoptOverloadedMethod(method); len(methodOverloads) > 0 {
					for i := range methodOverloads {
						method = methodOverloads[i]
						methodName = method.Name()
						if methodName != fun.Name() {
							_, methodName, _ = util.SplitGoptMethod(methodName)
							if methodName == name {
								break
							}
						}
					}
				}

				if methodName == name {
					overview, _, _, _ := makeFuncHoverDefinitionOverview(method)
					defs = append(defs, hoverDefinition{
						ID: SpxDefinitionIdentifier{
							Package:    &pkgPath,
							Name:       &idName,
							OverloadID: oID,
						},
						Overview: overview,
						Detail:   doc,
					})
				}
			})
		}
	} else {
		for name, doc := range pkgDoc.Funcs {
			if name == fun.Name() {
				continue
			}
			pn, oID := parseGopFuncName(name)
			if pn != parsedName {
				continue
			}
			fun, ok := pkg.Scope().Lookup(name).(*types.Func)
			if !ok {
				continue
			}

			overview, _, _, _ := makeFuncHoverDefinitionOverview(fun)
			defs = append(defs, hoverDefinition{
				ID: SpxDefinitionIdentifier{
					Package:    &pkgPath,
					Name:       &idName,
					OverloadID: oID,
				},
				Overview: overview,
				Detail:   doc,
			})
		}
	}
	return defs
}

// makeFuncHoverDefinitionOverview makes hover definition overview for the
// provided function.
func makeFuncHoverDefinitionOverview(fun *types.Func) (overview, parsedName string, recvTypeNamed *types.Named, overloadID *string) {
	pkg := fun.Pkg()
	pkgPath := pkg.Path()
	isGopPkg := pkg.Scope().Lookup(util.GopPackage) != nil
	name := fun.Name()
	sig := fun.Type().(*types.Signature)

	var sb strings.Builder
	sb.WriteString("func ")

	var isGoptMethod bool
	if recv := sig.Recv(); recv != nil {
		recvType := unwrapPointerType(recv.Type())
		if named, ok := recvType.(*types.Named); ok {
			recvTypeNamed = named
		}
	} else if isGopPkg {
		switch {
		case strings.HasPrefix(name, util.GoptPrefix):
			recvTypeName, methodName, ok := util.SplitGoptMethod(name)
			if !ok {
				break
			}
			name = methodName
			isGoptMethod = true

			recvTypeObj := pkg.Scope().Lookup(recvTypeName)
			if recvTypeObj == nil {
				break
			}
			recvTypeNamed = recvTypeObj.Type().(*types.Named)
		}
	}

	parsedName = name
	if isGopPkg {
		parsedName, overloadID = parseGopFuncName(parsedName)
	} else if pkgPath != "main" {
		parsedName = toLowerCamelCase(parsedName)
	}
	sb.WriteString(parsedName)
	sb.WriteString("(")
	for i := range sig.Params().Len() {
		if isGoptMethod {
			if i == 0 {
				continue
			} else if i > 1 {
				sb.WriteString(", ")
			}
		} else if i > 0 {
			sb.WriteString(", ")
		}
		param := sig.Params().At(i)
		sb.WriteString(param.Name())
		sb.WriteString(" ")
		sb.WriteString(param.Type().String())
	}
	sb.WriteString(")")

	if results := sig.Results(); results.Len() > 0 {
		if results.Len() == 1 {
			sb.WriteString(" ")
			sb.WriteString(results.At(0).Type().String())
		} else {
			sb.WriteString(" (")
			for i := range results.Len() {
				if i > 0 {
					sb.WriteString(", ")
				}
				result := results.At(i)
				if name := result.Name(); name != "" {
					sb.WriteString(name)
					sb.WriteString(" ")
				}
				sb.WriteString(result.Type().String())
			}
			sb.WriteString(")")
		}
	}

	overview = sb.String()
	return
}

// makeTypeHoverDefinition makes hover definition for types.
func makeTypeHoverDefinition(result *compileResult, typeName *types.TypeName) hoverDefinition {
	pkg := typeName.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(typeName)

	var overview strings.Builder
	overview.WriteString("type ")
	overview.WriteString(typeName.Name())
	overview.WriteString(" ")
	if named, ok := typeName.Type().(*types.Named); ok {
		overview.WriteString(named.Underlying().String())
	} else {
		overview.WriteString(typeName.Type().String())
	}

	var detail string
	if pkgPath == "main" {
		if defIdent != nil && defIdent.Obj != nil {
			switch decl := defIdent.Obj.Decl.(type) {
			case *gopast.TypeSpec:
				detail = decl.Doc.Text()
				if detail == "" {
					genDecl, ok := result.mainASTPkgSpecToGenDecl[decl]
					if ok && len(genDecl.Specs) == 1 {
						detail = genDecl.Doc.Text()
					}
				}
			}
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		typeDoc, ok := pkgDoc.Types[typeName.Name()]
		if ok {
			detail = typeDoc.Doc
		}
	}

	idName := typeName.Name()
	return hoverDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,
	}
}

// makePkgNameHoverDefinition makes hover definition for package names.
func makePkgNameHoverDefinition(result *compileResult, pkgName *types.PkgName) hoverDefinition {
	pkg := pkgName.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(pkgName)

	var detail string
	if pkgPath == "main" {
		if defIdent != nil && defIdent.Obj != nil {
			switch decl := defIdent.Obj.Decl.(type) {
			case *gopast.ImportSpec:
				detail = decl.Doc.Text()
				if detail == "" {
					genDecl, ok := result.mainASTPkgSpecToGenDecl[decl]
					if ok && len(genDecl.Specs) == 1 {
						detail = genDecl.Doc.Text()
					}
				}
			case *gopast.File:
				detail = decl.Doc.Text()
			}
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		detail = pkgDoc.Doc
	}

	return hoverDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
		},
		Overview: "package " + pkgName.Name(),
		Detail:   detail,
	}
}
