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
	// TypeHint represents a type hint for this definition. It may be nil if
	// the definition has no associated type.
	TypeHint types.Type

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
	return fmt.Sprintf("<definition-item def-id=%s overview=%s>\n%s</definition-item>\n", attr(def.ID.String()), attr(def.Overview), def.Detail)
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
	// GeneralSpxDefinitions are general spx definitions.
	GeneralSpxDefinitions = []SpxDefinition{
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

	// FileScopeSpxDefinitions are spx definitions that are only available
	// in file scope.
	FileScopeSpxDefinitions = []SpxDefinition{
		{
			ID:       SpxDefinitionIdentifier{Name: util.ToPtr("import_declaration")},
			Overview: "import \"package\"",
			Detail:   "Import package declaration, e.g., `import \"fmt\"`",

			CompletionItemLabel:            "import",
			CompletionItemKind:             KeywordCompletion,
			CompletionItemInsertText:       "import \"${1:package}\"$0",
			CompletionItemInsertTextFormat: SnippetTextFormat,
		},
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

	// builtinSpxDefinitionOverviews contains overview descriptions for
	// builtin spx definitions.
	builtinSpxDefinitionOverviews = map[string]string{
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

	// gopBuiltinAliases contains aliases for Go+ builtins.
	//
	// See github.com/goplus/gop/cl.initBuiltin for the list of Go+ builtin aliases.
	gopBuiltinAliases = map[string]string{
		// Types.
		"bigfloat": "github.com/goplus/gop/builtin/ng#Bigfloat",
		"bigint":   "github.com/goplus/gop/builtin/ng#Bigint",
		"bigrat":   "github.com/goplus/gop/builtin/ng#Bigrat",
		"int128":   "github.com/goplus/gop/builtin/ng#Int128",
		"uint128":  "github.com/goplus/gop/builtin/ng#Uint128",

		// Functions.
		"blines":   "github.com/goplus/gop/builtin/iox#BLines",
		"create":   "os#Create",
		"echo":     "fmt#Println",
		"errorf":   "fmt#Errorf",
		"fprint":   "fmt#Fprint",
		"fprintf":  "fmt#Fprintf",
		"fprintln": "fmt#Fprintln",
		"lines":    "github.com/goplus/gop/builtin/iox#Lines",
		"newRange": "github.com/goplus/gop/builtin#NewRange__0",
		"open":     "os#Open",
		"print":    "fmt#Print",
		"printf":   "fmt#Printf",
		"println":  "fmt#Println",
		"sprint":   "fmt#Sprint",
		"sprintf":  "fmt#Sprintf",
		"sprintln": "fmt#Sprintln",
		// "type":     "reflect#TypeOf",
	}
)

// GetSpxDefinitionForBuiltinObj returns the spx definition for the given object.
func GetSpxDefinitionForBuiltinObj(obj types.Object) SpxDefinition {
	const pkgPath = "builtin"

	idName := obj.Name()
	if def, err := getSpxDefinitionForGopBuiltinAlias(idName); err == nil {
		return def
	}

	overview, ok := builtinSpxDefinitionOverviews[idName]
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
			switch idName {
			case "any", "error":
				completionItemKind = InterfaceCompletion
			default:
				completionItemKind = ClassCompletion
			}
		case "func":
			completionItemKind = FunctionCompletion
		}
	}

	return SpxDefinition{
		TypeHint: obj.Type(),

		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(pkgPath),
			Name:    &idName,
		},
		Overview: overview,
		Detail:   detail,

		CompletionItemLabel:            obj.Name(),
		CompletionItemKind:             completionItemKind,
		CompletionItemInsertText:       obj.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
}

// GetBuiltinSpxDefinitions returns the builtin spx definitions.
var GetBuiltinSpxDefinitions = sync.OnceValue(func() []SpxDefinition {
	names := types.Universe.Names()
	defs := make([]SpxDefinition, 0, len(names)+len(gopBuiltinAliases))
	for _, name := range names {
		if _, ok := gopBuiltinAliases[name]; ok {
			continue
		}
		if obj := types.Universe.Lookup(name); obj != nil && obj.Pkg() == nil {
			defs = append(defs, GetSpxDefinitionForBuiltinObj(obj))
		}
	}
	for alias := range gopBuiltinAliases {
		def, err := getSpxDefinitionForGopBuiltinAlias(alias)
		if err != nil {
			panic(fmt.Errorf("failed to get spx definition for gop builtin alias %q: %w", alias, err))
		}
		defs = append(defs, def)
	}
	return slices.Clip(defs)
})

// getSpxDefinitionForGopBuiltinAlias returns the spx definition for the
// given Go+ builtin alias.
func getSpxDefinitionForGopBuiltinAlias(alias string) (SpxDefinition, error) {
	ref, ok := gopBuiltinAliases[alias]
	if !ok {
		return SpxDefinition{}, fmt.Errorf("unknown gop builtin alias: %s", alias)
	}

	pkgPath, name, ok := strings.Cut(ref, "#")
	if !ok {
		return SpxDefinition{}, fmt.Errorf("invalid gop builtin alias: %s", alias)
	}
	pkg, err := internal.Importer.Import(pkgPath)
	if err != nil {
		return SpxDefinition{}, fmt.Errorf("failed to import package for gop builtin alias %q: %w", alias, err)
	}
	pkgDoc, err := pkgdata.GetPkgDoc(pkgPath)
	if err != nil {
		return SpxDefinition{}, fmt.Errorf("failed to get package doc for gop builtin alias %q: %w", alias, err)
	}

	obj := pkg.Scope().Lookup(name)
	if obj == nil {
		return SpxDefinition{}, fmt.Errorf("symbol %s not found in package %s", name, pkgPath)
	}
	var def SpxDefinition
	switch obj := obj.(type) {
	case *types.TypeName:
		def = GetSpxDefinitionForType(obj, pkgDoc)
	case *types.Func:
		def = GetSpxDefinitionForFunc(obj, "", pkgDoc)
	default:
		return SpxDefinition{}, fmt.Errorf("unexpected object type for gop builtin alias %q: %T", alias, obj)
	}

	return SpxDefinition{
		TypeHint: obj.Type(),
		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr("builtin"),
			Name:    &alias,
		},
		Overview: def.Overview,
		Detail:   def.Detail,

		CompletionItemLabel:            alias,
		CompletionItemKind:             def.CompletionItemKind,
		CompletionItemInsertText:       alias,
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}, nil
}

var (
	// GetSpxPkg returns the spx package.
	GetSpxPkg = sync.OnceValue(func() *types.Package {
		spxPkg, err := internal.Importer.Import("github.com/goplus/spx")
		if err != nil {
			panic(fmt.Errorf("failed to import spx package: %w", err))
		}
		return spxPkg
	})

	// GetSpxGameType returns the [spx.Game] type.
	GetSpxGameType = sync.OnceValue(func() *types.Named {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("Game").Type().(*types.Named)
	})

	// GetSpxBackdropNameType returns the [spx.BackdropName] type.
	GetSpxBackdropNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("BackdropName").Type().(*types.Alias)
	})

	// GetSpxSpriteType returns the [spx.Sprite] type.
	GetSpxSpriteType = sync.OnceValue(func() *types.Named {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("Sprite").Type().(*types.Named)
	})

	// GetSpxSpriteImplType returns the [spx.SpriteImpl] type.
	GetSpxSpriteImplType = sync.OnceValue(func() *types.Named {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("SpriteImpl").Type().(*types.Named)
	})

	// GetSpxSpriteNameType returns the [spx.SpriteName] type.
	GetSpxSpriteNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("SpriteName").Type().(*types.Alias)
	})

	// GetSpxSpriteCostumeNameType returns the [spx.SpriteCostumeName] type.
	GetSpxSpriteCostumeNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("SpriteCostumeName").Type().(*types.Alias)
	})

	// GetSpxSpriteAnimationNameType returns the [spx.SpriteAnimationName] type.
	GetSpxSpriteAnimationNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("SpriteAnimationName").Type().(*types.Alias)
	})

	// GetSpxSoundType returns the [spx.Sound] type.
	GetSpxSoundType = sync.OnceValue(func() *types.Named {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("Sound").Type().(*types.Named)
	})

	// GetSpxSoundNameType returns the [spx.SoundName] type.
	GetSpxSoundNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("SoundName").Type().(*types.Alias)
	})

	// GetSpxWidgetNameType returns the [spx.WidgetName] type.
	GetSpxWidgetNameType = sync.OnceValue(func() *types.Alias {
		spxPkg := GetSpxPkg()
		return spxPkg.Scope().Lookup("WidgetName").Type().(*types.Alias)
	})

	// GetSpxPkgDefinitions returns the spx definitions for the spx package.
	GetSpxPkgDefinitions = sync.OnceValue(func() []SpxDefinition {
		spxPkg := GetSpxPkg()
		spxPkgDoc, err := pkgdata.GetPkgDoc(spxPkg.Path())
		if err != nil {
			panic(fmt.Errorf("failed to get spx package doc: %w", err))
		}
		return GetSpxDefinitionsForPkg(spxPkg, spxPkgDoc)
	})
)

// nonMainPkgSpxDefsCache is a cache of non-main package spx definitions.
var nonMainPkgSpxDefsCache sync.Map // map[*types.Package][]SpxDefinition

// GetSpxDefinitionsForPkg returns the spx definitions for the given package.
func GetSpxDefinitionsForPkg(pkg *types.Package, pkgDoc *pkgdoc.PkgDoc) (defs []SpxDefinition) {
	if pkg.Path() != "main" {
		if defsIface, ok := nonMainPkgSpxDefsCache.Load(pkg); ok {
			return defsIface.([]SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefsCache.Store(pkg, defs)
		}()
	}

	names := pkg.Scope().Names()
	defs = make([]SpxDefinition, 0, len(names))
	for _, name := range names {
		if obj := pkg.Scope().Lookup(name); obj != nil && obj.Exported() {
			switch obj := obj.(type) {
			case *types.Var:
				defs = append(defs, GetSpxDefinitionForVar(obj, "", false, pkgDoc))
			case *types.Const:
				defs = append(defs, GetSpxDefinitionForConst(obj, pkgDoc))
			case *types.TypeName:
				defs = append(defs, GetSpxDefinitionForType(obj, pkgDoc))
			case *types.Func:
				if funcOverloads := expandGopOverloadableFunc(obj); funcOverloads != nil {
					for _, funcOverload := range funcOverloads {
						defs = append(defs, GetSpxDefinitionForFunc(funcOverload, "", pkgDoc))
					}
				} else {
					defs = append(defs, GetSpxDefinitionForFunc(obj, "", pkgDoc))
				}
			case *types.PkgName:
				defs = append(defs, GetSpxDefinitionForPkg(obj, pkgDoc))
			}
		}
	}
	return slices.Clip(defs)
}

// nonMainPkgSpxDefCacheForVars is a cache of non-main package spx definitions
// for variables.
var nonMainPkgSpxDefCacheForVars sync.Map // map[nonMainPkgSpxDefCacheForVarsKey]SpxDefinition

// nonMainPkgSpxDefCacheForVarsKey is the key for the non-main package spx
// definition cache for variables.
type nonMainPkgSpxDefCacheForVarsKey struct {
	v                *types.Var
	selectorTypeName string
}

// GetSpxDefinitionForVar returns the spx definition for the provided variable.
func GetSpxDefinitionForVar(v *types.Var, selectorTypeName string, forceVar bool, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
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
		TypeHint: v.Type(),

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

// GetSpxDefinitionForConst returns the spx definition for the provided constant.
func GetSpxDefinitionForConst(c *types.Const, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
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
		TypeHint: c.Type(),

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

// GetSpxDefinitionForType returns the spx definition for the provided type.
func GetSpxDefinitionForType(typeName *types.TypeName, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
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

	completionKind := ClassCompletion
	if named, ok := typeName.Type().(*types.Named); ok {
		switch named.Underlying().(type) {
		case *types.Interface:
			completionKind = InterfaceCompletion
		case *types.Struct:
			completionKind = StructCompletion
		}
	}

	def = SpxDefinition{
		TypeHint: typeName.Type(),

		ID: SpxDefinitionIdentifier{
			Package: util.ToPtr(typeName.Pkg().Path()),
			Name:    util.ToPtr(typeName.Name()),
		},
		Overview: overview.String(),
		Detail:   detail,

		CompletionItemLabel:            typeName.Name(),
		CompletionItemKind:             completionKind,
		CompletionItemInsertText:       typeName.Name(),
		CompletionItemInsertTextFormat: PlainTextTextFormat,
	}
	return
}

// nonMainPkgSpxDefCacheForFuncs is a cache of non-main package spx definitions
// for functions.
var nonMainPkgSpxDefCacheForFuncs sync.Map // map[nonMainPkgSpxDefCacheForFuncsKey]SpxDefinition

// nonMainPkgSpxDefCacheForFuncsKey is the key for the non-main package spx
// definition cache for functions.
type nonMainPkgSpxDefCacheForFuncsKey struct {
	fun          *types.Func
	recvTypeName string
}

// GetSpxDefinitionForFunc returns the spx definition for the provided function.
func GetSpxDefinitionForFunc(fun *types.Func, recvTypeName string, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
	if !isMainPkgObject(fun) {
		cacheKey := nonMainPkgSpxDefCacheForFuncsKey{
			fun:          fun,
			recvTypeName: recvTypeName,
		}
		if defIface, ok := nonMainPkgSpxDefCacheForFuncs.Load(cacheKey); ok {
			return defIface.(SpxDefinition)
		}
		defer func() {
			nonMainPkgSpxDefCacheForFuncs.Store(cacheKey, def)
		}()
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

	idName := parsedName
	if recvTypeName != "" {
		recvTypeDisplayName := recvTypeName
		if isSpxPkgObject(fun) && recvTypeDisplayName == "SpriteImpl" {
			recvTypeDisplayName = "Sprite"
		}
		idName = recvTypeDisplayName + "." + idName
	}
	def = SpxDefinition{
		TypeHint: fun.Type(),

		ID: SpxDefinitionIdentifier{
			Package:    util.ToPtr(fun.Pkg().Path()),
			Name:       &idName,
			OverloadID: overloadID,
		},
		Overview: overview,
		Detail:   detail,

		CompletionItemLabel:            parsedName,
		CompletionItemKind:             FunctionCompletion,
		CompletionItemInsertText:       parsedName,
		CompletionItemInsertTextFormat: PlainTextTextFormat,
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
	params := make([]string, 0, sig.TypeParams().Len()+sig.Params().Len())
	for i := range sig.TypeParams().Len() {
		tp := sig.TypeParams().At(i)
		params = append(params, tp.Obj().Name()+" Type")
	}
	for i := range sig.Params().Len() {
		if isGoptMethod && i == 0 {
			continue
		}
		param := sig.Params().At(i)
		params = append(params, param.Name()+" "+getSimplifiedTypeString(param.Type()))
	}
	sb.WriteString(strings.Join(params, ", "))
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

// GetSpxDefinitionForPkg returns the spx definition for the provided package.
func GetSpxDefinitionForPkg(pkgName *types.PkgName, pkgDoc *pkgdoc.PkgDoc) (def SpxDefinition) {
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
		TypeHint: pkgName.Type(),

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
