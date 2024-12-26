package server

import (
	"fmt"
	"go/types"
	"slices"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/util"
	gopast "github.com/goplus/gop/ast"
)

// SpxDefinition represents an spx definition.
type SpxDefinition struct {
	ID       SpxDefinitionIdentifier
	Overview string
	Detail   string

	CompletionItemLabel            string
	CompletionItemKind             CompletionItemKind
	CompletionItemInsertText       string
	CompletionItemInsertTextFormat InsertTextFormat
}

// HTML returns the HTML representation of the definition.
func (def SpxDefinition) HTML() string {
	return fmt.Sprintf("<definition-item def-id=%q overview=%q>\n%s</definition-item>\n", def.ID, def.Overview, def.Detail)
}

// CompletionItem constructs a [CompletionItem] from the definition.
func (def SpxDefinition) CompletionItem() CompletionItem {
	return CompletionItem{
		Label:            def.CompletionItemLabel,
		Kind:             def.CompletionItemKind,
		Documentation:    &Or_CompletionItem_documentation{Value: MarkupContent{Kind: Markdown, Value: def.HTML()}},
		InsertText:       def.CompletionItemInsertText,
		InsertTextFormat: &def.CompletionItemInsertTextFormat,
		Data: &CompletionItemData{
			Definition: &def.ID,
		},
	}
}

var (
	// SpxGeneralDefinitions are general spx definitions.
	SpxGeneralDefinitions = []SpxDefinition{
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("for_iterate")},
			Overview: "for i, v <- set { ... }",
			Detail:   "Iterate within given set",

			CompletionItemLabel:            "for",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "for ${1:i}, ${2:v} <- ${3:set} {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("for_loop_with_condition")},
			Overview: "for condition { ... }",
			Detail:   "Loop with condition",

			CompletionItemLabel:            "for",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "for ${1:condition} {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("for_loop_with_range")},
			Overview: "for i <- start:end { ... }",
			Detail:   "Loop with range",

			CompletionItemLabel:            "for",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "for ${1:i} <- ${2:start}:${3:end} {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("if_statement")},
			Overview: "if condition { ... }",
			Detail:   "If statement",

			CompletionItemLabel:            "if",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "if ${1:condition} {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("if_else_statement")},
			Overview: "if condition { ... } else { ... }",
			Detail:   "If else statement",

			CompletionItemLabel:            "if",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "if ${1:condition} {\n\t${2:}\n} else {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("var_declaration")},
			Overview: "var name type",
			Detail:   "Variable declaration, e.g., `var count int`",

			CompletionItemLabel:            "var",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "var ${1:name} $0",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
	}

	// SpxFileScopeDefinitions are spx definitions that are only available
	// in file scope.
	SpxFileScopeDefinitions = []SpxDefinition{
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("func_declaration")},
			Overview: "func name(params) { ... }",
			Detail:   "Function declaration, e.g., `func add(a int, b int) int {}`",

			CompletionItemLabel:            "func",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "func ${1:name}(${2:params}) ${3:returnType} {\n\t$0\n}",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
	}

	// spxBuiltinDefinitionOverviews contains overview descriptions for spx
	// builtin definitions.
	spxBuiltinDefinitionOverviews = map[string]string{
		// Variables.
		"nil": "var nil Type",

		// Constants.
		"false": "const false = 0 != 0",
		"iota":  "const iota = 0",
		"true":  "const true = 0 == 0",

		// Types.
		"any":        "type any interface{}",
		"bool":       "type bool bool",
		"byte":       "type byte = uint8",
		"complex64":  "type complex64 complex64",
		"complex128": "type complex128 complex128",
		"error":      "type error interface { Error() string }",
		"float32":    "type float32 float32",
		"float64":    "type float64 float64",
		"int":        "type int int",
		"int8":       "type int8 int8",
		"int16":      "type int16 int16",
		"int32":      "type int32 int32",
		"int64":      "type int64 int64",
		"rune":       "type rune = int32",
		"string":     "type string string",
		"uint":       "type uint uint",
		"uint8":      "type uint8 uint8",
		"uint16":     "type uint16 uint16",
		"uint32":     "type uint32 uint32",
		"uint64":     "type uint64 uint64",
		"uintptr":    "type uintptr uintptr",

		// Functions.
		"append":  "func append(slice []T, elems ...T) []T",
		"cap":     "func cap(v Type) int",
		"clear":   "func clear(m Type)",
		"close":   "func close(c chan<- Type)",
		"complex": "func complex(r, i FloatType) ComplexType",
		"copy":    "func copy(dst, src []Type) int",
		"delete":  "func delete(m map[Type]Type1, key Type)",
		"imag":    "func imag(c ComplexType) FloatType",
		"len":     "func len(v Type) int",
		"make":    "func make(t Type, size ...IntegerType) Type",
		"max":     "func max(x Type, y ...Type) Type",
		"min":     "func min(x Type, y ...Type) Type",
		"new":     "func new(Type) *Type",
		"panic":   "func panic(v interface{})",
		"print":   "func print(args ...Type)",
		"println": "func println(args ...Type)",
		"real":    "func real(c ComplexType) FloatType",
		"recover": "func recover() interface{}",
	}
)

// GetSpxBuiltinDefinition returns the spx definition for the given name.
func GetSpxBuiltinDefinition(name string) SpxDefinition {
	const pkgPath = "builtin"

	idName := name
	overview, ok := spxBuiltinDefinitionOverviews[idName]
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

	completionItemKind := TextCompletion
	if keyword, _, ok := strings.Cut(overview, " "); ok {
		switch keyword {
		case "var":
			completionItemKind = VariableCompletion
		case "const":
			completionItemKind = ConstantCompletion
		case "type":
			completionItemKind = StructCompletion
		case "func":
			completionItemKind = FunctionCompletion
		}
	}

	return SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(pkgPath),
			Name:    &idName,
		},
		Overview: overview,
		Detail:   detail,

		CompletionItemLabel:            name,
		CompletionItemKind:             completionItemKind,
		CompletionItemInsertText:       name,
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}

// GetSpxBuiltinDefinitions returns the builtin spx definitions.
func GetSpxBuiltinDefinitions() []SpxDefinition {
	names := types.Universe.Names()
	defs := make([]SpxDefinition, 0, len(names))
	for _, name := range names {
		if obj := types.Universe.Lookup(name); obj != nil && obj.Pkg() == nil {
			defs = append(defs, GetSpxBuiltinDefinition(name))
		}
	}
	return defs
}

// NewSpxDefinitionForVar creates a new [SpxDefinition] the provided variable.
func NewSpxDefinitionForVar(result *compileResult, v *types.Var, selectorTypeNameOverride string) SpxDefinition {
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
	overview.WriteString(getSimplifiedTypeString(v.Type()))

	var detail, selectorTypeName string
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
						selectorTypeName = typeSpec.Name.Name
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
						selectorTypeName = named.Obj().Name()
					}
				})
				if selectorTypeName != "" {
					break
				}
			}
		}
	}
	if selectorTypeNameOverride != "" {
		selectorTypeName = selectorTypeNameOverride
	}

	idName := v.Name()
	if selectorTypeName != "" {
		idName = selectorTypeName + "." + idName
	}
	completionItemKind := VariableCompletion
	if strings.HasPrefix(overview.String(), "field ") {
		completionItemKind = FieldCompletion
	}
	return SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            v.Name(),
		CompletionItemKind:             completionItemKind,
		CompletionItemInsertText:       v.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}

// NewSpxDefinitionForConst makes a new [SpxDefinition] for the provided constant.
func NewSpxDefinitionForConst(result *compileResult, c *types.Const) SpxDefinition {
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
	return SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            c.Name(),
		CompletionItemKind:             ConstantCompletion,
		CompletionItemInsertText:       c.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}

// NewSpxDefinitionForType makes a new [SpxDefinition] for the provided type.
func NewSpxDefinitionForType(result *compileResult, typeName *types.TypeName) SpxDefinition {
	pkg := typeName.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(typeName)

	var overview strings.Builder
	overview.WriteString("type ")
	overview.WriteString(typeName.Name())
	overview.WriteString(" ")
	if named, ok := typeName.Type().(*types.Named); ok {
		overview.WriteString(getSimplifiedTypeString(named.Underlying()))
	} else {
		overview.WriteString(getSimplifiedTypeString(typeName.Type()))
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
	return SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            typeName.Name(),
		CompletionItemKind:             StructCompletion,
		CompletionItemInsertText:       typeName.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}

// NewSpxDefinitionsForFunc creates new [SpxDefinition]s for the provided
// function. It returns multiple definitions if the function has overloaded
// variants.
func NewSpxDefinitionsForFunc(result *compileResult, fun *types.Func, recvTypeNameOverride string) []SpxDefinition {
	if funcOverloads := expandGopOverloadedFunc(fun); len(funcOverloads) > 0 {
		// When encountering a overload signature like `func(__gop_overload_args__ interface{_()})`,
		// we expand it to concrete overloads and use the first one as the default representation.
		// All overload variants will still be included in the returned definitions.
		fun = funcOverloads[0]
	}

	pkg := fun.Pkg()
	pkgPath := pkg.Path()
	defIdent := result.defIdentOf(fun)

	overview, parsedName, recvTypeName, overloadID := makeSpxDefinitionOverviewForFunc(fun)
	if recvTypeNameOverride != "" {
		recvTypeName = recvTypeNameOverride
	}
	if pkgPath == spxPkgPath && recvTypeName == "Sprite" {
		recvTypeName = "SpriteImpl"
	}

	var detail string
	if pkgPath == "main" {
		if defIdent != nil && defIdent.Obj != nil {
			switch decl := defIdent.Obj.Decl.(type) {
			case *gopast.FuncDecl:
				detail = decl.Doc.Text()
			}
		}
	} else if pkgDoc, err := pkgdata.GetPkgDoc(pkgPath); err == nil {
		if recvTypeName == "" {
			detail = pkgDoc.Funcs[fun.Name()]
		} else if spxRecvTypeDoc, ok := pkgDoc.Types[recvTypeName]; ok {
			detail = spxRecvTypeDoc.Methods[fun.Name()]
		}
	}

	idName := parsedName
	if recvTypeName != "" {
		selectorDisplayName := recvTypeName
		if pkgPath == spxPkgPath && selectorDisplayName == "SpriteImpl" {
			selectorDisplayName = "Sprite"
		}
		idName = selectorDisplayName + "." + idName
	}
	defs := []SpxDefinition{
		{
			ID: SpxDefinitionIdentifier{
				Package:    &pkgPath,
				Name:       &idName,
				OverloadID: overloadID,
			},
			Overview: overview,
			Detail:   detail,

			CompletionItemLabel:            parsedName,
			CompletionItemKind:             FunctionCompletion,
			CompletionItemInsertText:       parsedName,
			CompletionItemInsertTextFormat: PlainTextTextFormat,
		},
	}

	if overloadID == nil {
		return defs
	}

	pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
	if err != nil {
		return defs
	}
	if recvTypeName != "" {
		recvType := pkg.Scope().Lookup(recvTypeName).Type()
		if recvType == nil {
			return defs
		}
		if _, ok := recvType.Underlying().(*types.Struct); !ok {
			return defs
		}

		recvTypeDoc, ok := pkgDoc.Types[recvTypeName]
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
				if methodOverloads := expandGopOverloadedFunc(method); len(methodOverloads) > 0 {
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
					overview, _, _, _ := makeSpxDefinitionOverviewForFunc(method)
					defs = append(defs, SpxDefinition{
						ID: SpxDefinitionIdentifier{
							Package:    &pkgPath,
							Name:       &idName,
							OverloadID: oID,
						},
						Overview: overview,
						Detail:   doc,

						CompletionItemLabel:            parsedName,
						CompletionItemKind:             FunctionCompletion,
						CompletionItemInsertText:       parsedName,
						CompletionItemInsertTextFormat: PlainTextTextFormat,
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

			overview, _, _, _ := makeSpxDefinitionOverviewForFunc(fun)
			defs = append(defs, SpxDefinition{
				ID: SpxDefinitionIdentifier{
					Package:    &pkgPath,
					Name:       &idName,
					OverloadID: oID,
				},
				Overview: overview,
				Detail:   doc,

				CompletionItemLabel:            parsedName,
				CompletionItemKind:             FunctionCompletion,
				CompletionItemInsertText:       parsedName,
				CompletionItemInsertTextFormat: PlainTextTextFormat,
			})
		}
	}
	return defs
}

// makeSpxDefinitionOverviewForFunc makes an overview string for a function that
// is used in [SpxDefinition].
func makeSpxDefinitionOverviewForFunc(fun *types.Func) (overview, parsedName, recvTypeName string, overloadID *string) {
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
			recvTypeName = named.Obj().Name()
		}
	} else if isGopPkg {
		switch {
		case strings.HasPrefix(name, util.GoptPrefix):
			splitRecvTypeName, methodName, ok := util.SplitGoptMethod(name)
			if !ok {
				break
			}
			name = methodName
			recvTypeName = splitRecvTypeName
			isGoptMethod = true
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
		sb.WriteString(getSimplifiedTypeString(param.Type()))
	}
	sb.WriteString(")")

	if results := sig.Results(); results.Len() > 0 {
		if results.Len() == 1 {
			sb.WriteString(" ")
			sb.WriteString(getSimplifiedTypeString(results.At(0).Type()))
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
				sb.WriteString(getSimplifiedTypeString(result.Type()))
			}
			sb.WriteString(")")
		}
	}

	overview = sb.String()
	return
}

// NewSpxDefinitionForPkg creates a new [SpxDefinition] for the provided package.
func NewSpxDefinitionForPkg(result *compileResult, pkgName *types.PkgName) SpxDefinition {
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

	return SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: &pkgPath,
		},
		Overview: "package " + pkgName.Name(),
		Detail:   detail,

		CompletionItemLabel:            pkgName.Name(),
		CompletionItemKind:             ModuleCompletion,
		CompletionItemInsertText:       pkgName.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}
