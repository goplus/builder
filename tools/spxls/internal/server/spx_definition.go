package server

import (
	"fmt"
	"go/types"
	"slices"
	"strings"
	"sync"

	"github.com/goplus/builder/tools/spxls/internal"
	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	"github.com/goplus/builder/tools/spxls/internal/util"
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
var GetSpxBuiltinDefinitions = sync.OnceValue(func() []SpxDefinition {
	names := types.Universe.Names()
	defs := make([]SpxDefinition, 0, len(names))
	for _, name := range names {
		if obj := types.Universe.Lookup(name); obj != nil && obj.Pkg() == nil {
			defs = append(defs, GetSpxBuiltinDefinition(name))
		}
	}
	return slices.Clip(defs)
})

// GetSpxPkg returns the spx package.
var GetSpxPkg = sync.OnceValue(func() *types.Package {
	spxPkg, err := internal.Importer.Import(spxPkgPath)
	if err != nil {
		panic(fmt.Errorf("failed to import spx package: %w", err))
	}
	return spxPkg
})

// GetSpxSpriteImplType returns the [spx.SpriteImpl] type.
var GetSpxSpriteImplType = sync.OnceValue(func() types.Type {
	spxPkg := GetSpxPkg()
	return spxPkg.Scope().Lookup("SpriteImpl").Type()
})

// GetSpxPkgDefinitions returns the spx definitions for the spx package.
var GetSpxPkgDefinitions = sync.OnceValue(func() []SpxDefinition {
	spxPkg := GetSpxPkg()
	spxPkgDoc, err := pkgdata.GetPkgDoc(spxPkgPath)
	if err != nil {
		panic(fmt.Errorf("failed to get spx package doc: %w", err))
	}

	names := spxPkg.Scope().Names()
	defs := make([]SpxDefinition, 0, len(names))
	for _, name := range names {
		if obj := spxPkg.Scope().Lookup(name); obj != nil && obj.Exported() {
			switch obj := obj.(type) {
			case *types.Var:
				defs = append(defs, NewSpxDefinitionForVar(obj, "", false, spxPkgDoc))
			case *types.Const:
				defs = append(defs, NewSpxDefinitionForConst(obj, spxPkgDoc))
			case *types.TypeName:
				defs = append(defs, NewSpxDefinitionForType(obj, spxPkgDoc))
			case *types.Func:
				defs = append(defs, NewSpxDefinitionsForFunc(obj, "", spxPkgDoc)...)
			case *types.PkgName:
				defs = append(defs, NewSpxDefinitionForPkg(obj, spxPkgDoc))
			}
		}
	}
	return slices.Clip(defs)
})

// nonMainPkgSpxDefCacheForVars is a cache of non-main package spx definitions
// for variables.
var nonMainPkgSpxDefCacheForVars sync.Map // map[nonMainPkgSpxDefCacheForVarsKey]SpxDefinition

// nonMainPkgSpxDefCacheForVarsKey is the key for the non-main package spx
// definition cache for variables.
type nonMainPkgSpxDefCacheForVarsKey struct {
	v                *types.Var
	selectorTypeName string
}

// NewSpxDefinitionForVar creates a new [SpxDefinition] the provided variable.
func NewSpxDefinitionForVar(v *types.Var, selectorTypeName string, forceVar bool, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
	if !isMainPkgObject(v) {
		cacheKey := nonMainPkgSpxDefCacheForVarsKey{
			v:                v,
			selectorTypeName: selectorTypeName,
		}
		if defIface, ok := nonMainPkgSpxDefCacheForVars.Load(cacheKey); ok {
			return defIface.(SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefCacheForVars.Store(cacheKey, def)
		}()
	}

	if isSpxPkgObject(v) && selectorTypeName == "Sprite" {
		selectorTypeName = "SpriteImpl"
	}

	var overview strings.Builder
	if !v.IsField() || forceVar {
		overview.WriteString("var ")
	} else {
		overview.WriteString("field ")
	}
	overview.WriteString(v.Name())
	overview.WriteString(" ")
	overview.WriteString(getSimplifiedTypeString(v.Type()))

	var detail string
	if pkgDoc != nil {
		if selectorTypeName == "" {
			detail = pkgDoc.Vars[v.Name()]
		} else if typeDoc, ok := pkgDoc.Types[selectorTypeName]; ok {
			detail = typeDoc.Fields[v.Name()]
		}
	}

	idName := v.Name()
	if selectorTypeName != "" {
		selectorTypeDisplayName := selectorTypeName
		if isSpxPkgObject(v) && selectorTypeDisplayName == "SpriteImpl" {
			selectorTypeDisplayName = "Sprite"
		}
		idName = selectorTypeDisplayName + "." + idName
	}
	completionItemKind := VariableCompletion
	if strings.HasPrefix(overview.String(), "field ") {
		completionItemKind = FieldCompletion
	}
	def = SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(v.Pkg().Path()),
			Name:    &idName,
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            v.Name(),
		CompletionItemKind:             completionItemKind,
		CompletionItemInsertText:       v.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
	return
}

// nonMainPkgSpxDefCacheForConsts is a cache of non-main package spx definitions
// for constants.
var nonMainPkgSpxDefCacheForConsts sync.Map // map[*types.Const]SpxDefinition

// NewSpxDefinitionForConst makes a new [SpxDefinition] for the provided constant.
func NewSpxDefinitionForConst(c *types.Const, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
	if !isMainPkgObject(c) {
		if defIface, ok := nonMainPkgSpxDefCacheForConsts.Load(c); ok {
			return defIface.(SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefCacheForConsts.Store(c, def)
		}()
	}

	var overview strings.Builder
	overview.WriteString("const ")
	overview.WriteString(c.Name())
	overview.WriteString(" = ")
	overview.WriteString(c.Val().String())

	var detail string
	if pkgDoc != nil {
		detail = pkgDoc.Consts[c.Name()]
	}

	def = SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(c.Pkg().Path()),
			Name:    util.ToPtr(c.Name()),
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            c.Name(),
		CompletionItemKind:             ConstantCompletion,
		CompletionItemInsertText:       c.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
	return
}

// nonMainPkgSpxDefCacheForTypes is a cache of non-main package spx definitions
// for types.
var nonMainPkgSpxDefCacheForTypes sync.Map // map[*types.TypeName]SpxDefinition

// NewSpxDefinitionForType makes a new [SpxDefinition] for the provided type.
func NewSpxDefinitionForType(typeName *types.TypeName, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
	if !isMainPkgObject(typeName) {
		if defIface, ok := nonMainPkgSpxDefCacheForTypes.Load(typeName); ok {
			return defIface.(SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefCacheForTypes.Store(typeName, def)
		}()
	}

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
	if pkgDoc != nil {
		typeDoc, ok := pkgDoc.Types[typeName.Name()]
		if ok {
			detail = typeDoc.Doc
		}
	}

	def = SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(typeName.Pkg().Path()),
			Name:    util.ToPtr(typeName.Name()),
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            typeName.Name(),
		CompletionItemKind:             StructCompletion,
		CompletionItemInsertText:       typeName.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
	return
}

// nonMainPkgSpxDefsCacheForFuncs is a cache of non-main package spx definitions
// for functions.
var nonMainPkgSpxDefsCacheForFuncs sync.Map // map[nonMainPkgSpxDefsCacheForFuncsKey][]SpxDefinition

// nonMainPkgSpxDefsCacheForFuncsKey is the key for the non-main package spx
// definition cache for functions.
type nonMainPkgSpxDefsCacheForFuncsKey struct {
	fun          *types.Func
	recvTypeName string
}

// NewSpxDefinitionsForFunc creates new [SpxDefinition]s for the provided
// function. It returns multiple definitions if the function has overloaded
// variants.
func NewSpxDefinitionsForFunc(fun *types.Func, recvTypeName string, pkgDoc *pkgdoc.PkgDoc) (defs []SpxDefinition) {
	if !isMainPkgObject(fun) {
		cacheKey := nonMainPkgSpxDefsCacheForFuncsKey{
			fun:          fun,
			recvTypeName: recvTypeName,
		}
		if defsIface, ok := nonMainPkgSpxDefsCacheForFuncs.Load(cacheKey); ok {
			return defsIface.([]SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefsCacheForFuncs.Store(cacheKey, slices.Clip(defs))
		}()
	}

	if funcOverloads := expandGopOverloadedFunc(fun); len(funcOverloads) > 0 {
		// When encountering a overload signature like `func(__gop_overload_args__ interface{_()})`,
		// we expand it to concrete overloads and use the first one as the default representation.
		// All overload variants will still be included in the returned definitions.
		fun = funcOverloads[0]
	}

	if isSpxPkgObject(fun) && recvTypeName == "Sprite" {
		recvTypeName = "SpriteImpl"
	}

	overview, parsedRecvTypeName, parsedName, overloadID := makeSpxDefinitionOverviewForFunc(fun)
	if recvTypeName == "" {
		recvTypeName = parsedRecvTypeName
	}

	var detail string
	if pkgDoc != nil {
		if recvTypeName == "" {
			detail = pkgDoc.Funcs[fun.Name()]
		} else if typeDoc, ok := pkgDoc.Types[recvTypeName]; ok {
			detail = typeDoc.Methods[fun.Name()]
		}
	}

	pkg := fun.Pkg()
	pkgPath := pkg.Path()
	idName := parsedName
	if recvTypeName != "" {
		recvTypeDisplayName := recvTypeName
		if isSpxPkgObject(fun) && recvTypeDisplayName == "SpriteImpl" {
			recvTypeDisplayName = "Sprite"
		}
		idName = recvTypeDisplayName + "." + idName
	}
	defs = []SpxDefinition{
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
		return
	}

	seenOverloadNames := map[string]struct{}{fun.Name(): {}}
	handleOverloads := func(overloads []*types.Func, funcDocs map[string]string) {
		for _, overload := range overloads {
			overloadName := overload.Name()
			if _, ok := seenOverloadNames[overloadName]; ok {
				continue
			}
			seenOverloadNames[overloadName] = struct{}{}

			if _, methodName, ok := util.SplitGoptMethod(overloadName); ok {
				overloadName = methodName
			}

			var detail string
			if funcDocs != nil {
				detail = funcDocs[overloadName]
			}

			_, oID := parseGopFuncName(overloadName)
			overview, _, _, _ := makeSpxDefinitionOverviewForFunc(overload)
			defs = append(defs, SpxDefinition{
				ID: SpxDefinitionIdentifier{
					Package:    &pkgPath,
					Name:       &idName,
					OverloadID: oID,
				},
				Overview: overview,
				Detail:   detail,

				CompletionItemLabel:            parsedName,
				CompletionItemKind:             FunctionCompletion,
				CompletionItemInsertText:       parsedName,
				CompletionItemInsertTextFormat: PlainTextTextFormat,
			})
		}
	}

	if recvTypeName != "" {
		recvType := pkg.Scope().Lookup(recvTypeName).Type()
		if recvType == nil {
			return
		}
		recvNamed, ok := recvType.(*types.Named)
		if !ok || !isNamedStructType(recvNamed) {
			return
		}

		var methodDocs map[string]string
		if pkgDoc != nil {
			recvTypeDoc, ok := pkgDoc.Types[recvTypeName]
			if ok {
				methodDocs = recvTypeDoc.Methods
			}
		}

		walkStruct(recvNamed, func(member types.Object, selector *types.Named) bool {
			method, ok := member.(*types.Func)
			if !ok {
				return true
			}
			if pn, _ := parseGopFuncName(method.Name()); pn != parsedName {
				return true
			}

			overloads := expandGopOverloadedFunc(method)
			if len(overloads) == 0 {
				overloads = []*types.Func{method}
			}
			handleOverloads(overloads, methodDocs)
			return true
		})
	} else {
		var funcDocs map[string]string
		if pkgDoc != nil {
			funcDocs = pkgDoc.Funcs
		}
		handleOverloads(expandGopOverloadedFunc(fun), funcDocs)
	}
	return
}

// makeSpxDefinitionOverviewForFunc makes an overview string for a function that
// is used in [SpxDefinition].
func makeSpxDefinitionOverviewForFunc(fun *types.Func) (overview, parsedRecvTypeName, parsedName string, overloadID *string) {
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
			parsedRecvTypeName = named.Obj().Name()
		}
	} else if isGopPkg {
		switch {
		case strings.HasPrefix(name, util.GoptPrefix):
			recvTypeName, methodName, ok := util.SplitGoptMethod(name)
			if !ok {
				break
			}
			parsedRecvTypeName = recvTypeName
			name = methodName
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

// nonMainPkgSpxDefCacheForPkgs is a cache of non-main package spx definitions
// for packages.
var nonMainPkgSpxDefCacheForPkgs sync.Map // map[*types.PkgName]SpxDefinition

// NewSpxDefinitionForPkg creates a new [SpxDefinition] for the provided package.
func NewSpxDefinitionForPkg(pkgName *types.PkgName, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
	if !isMainPkgObject(pkgName) {
		if defIface, ok := nonMainPkgSpxDefCacheForPkgs.Load(pkgName); ok {
			return defIface.(SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefCacheForPkgs.Store(pkgName, def)
		}()
	}

	var detail string
	if pkgDoc != nil {
		detail = pkgDoc.Doc
	}

	def = SpxDefinition{
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(pkgName.Pkg().Path()),
		},
		Overview: "package " + pkgName.Name(),
		Detail:   detail,

		CompletionItemLabel:            pkgName.Name(),
		CompletionItemKind:             ModuleCompletion,
		CompletionItemInsertText:       pkgName.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
	return
}
