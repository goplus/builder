package server

import (
	"fmt"
	"go/types"
	"regexp"

	"github.com/goplus/gogen"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// gopASTFileMapToSlice converts a map of [gopast.File] to a slice of [gopast.File].
func gopASTFileMapToSlice(fileMap map[string]*gopast.File) []*gopast.File {
	files := make([]*gopast.File, 0, len(fileMap))
	for _, file := range fileMap {
		files = append(files, file)
	}
	return files
}

// unwrapPointerType returns the underlying type of t. For pointer types, it
// returns the element type that the pointer points to. For non-pointer types,
// it returns the type unchanged.
func unwrapPointerType(t types.Type) types.Type {
	if ptr, ok := t.(*types.Pointer); ok {
		return ptr.Elem()
	}
	return t
}

// getStringLitOrConstValue attempts to get the value from a string literal or
// constant. It returns the string value and true if successful, or empty string
// and false if the expression is not a string literal or constant, or if the
// value cannot be determined.
func getStringLitOrConstValue(expr gopast.Expr, tv types.TypeAndValue) (string, bool) {
	switch e := expr.(type) {
	case *gopast.BasicLit:
		if e.Kind != goptoken.STRING {
			return "", false
		}
		s := e.Value[1 : len(e.Value)-1] // Unquote the string.
		return s, true
	case *gopast.Ident:
		if tv.Value != nil {
			// If it's a constant, we can get its value.
			s := tv.Value.String()
			s = s[1 : len(s)-1] // Unquote the string.
			return s, true
		}
		// There is nothing we can do for string variables.
		return "", false
	default:
		return "", false
	}
}

// deduplicateLocations deduplicates locations.
func deduplicateLocations(locations []Location) []Location {
	result := make([]Location, 0, len(locations))
	seen := make(map[string]struct{})
	for _, loc := range locations {
		key := fmt.Sprintf("%s:%d:%d", loc.URI, loc.Range.Start.Line, loc.Range.Start.Character)
		if _, ok := seen[key]; !ok {
			seen[key] = struct{}{}
			result = append(result, loc)
		}
	}
	return result
}

// toLowerCamelCase converts the first character of a Go identifier to lowercase.
func toLowerCamelCase(s string) string {
	if s == "" {
		return s
	}
	return string(s[0]|32) + s[1:]
}

// walkStruct walks a struct and calls the given function for each field and method.
func walkStruct(typ types.Type, onMember func(named *types.Named, namedParents []*types.Named, member types.Object)) {
	seenFields := make(map[string]struct{})
	seenMethods := make(map[string]struct{})

	var walk func(typ types.Type, namedParents []*types.Named)
	walk = func(typ types.Type, namedParents []*types.Named) {
		st, ok := typ.Underlying().(*types.Struct)
		if !ok {
			return
		}
		named := typ.(*types.Named)

		for i := range st.NumFields() {
			field := st.Field(i)
			if field.Embedded() {
				fieldType := unwrapPointerType(field.Type())
				if _, ok := fieldType.Underlying().(*types.Struct); ok {
					walk(fieldType, append(namedParents, named))
				}
			}
			if onMember != nil {
				if _, ok := seenFields[field.Name()]; ok {
					continue
				}
				seenFields[field.Name()] = struct{}{}

				onMember(named, namedParents, field)
			}
		}

		for i := range named.NumMethods() {
			method := named.Method(i)
			if onMember != nil {
				if _, ok := seenMethods[method.Name()]; ok {
					continue
				}
				seenMethods[method.Name()] = struct{}{}

				onMember(named, namedParents, method)
			}
		}
	}
	walk(typ, nil)
}

// gopOverloadFuncNameRE is the regular expression of the Go+ overloaded
// function name.
var gopOverloadFuncNameRE = regexp.MustCompile(`^(.+)__([0-9a-z])$`)

// isGopOverloadedFuncName reports whether the given function name is a Go+
// overloaded function name.
func isGopOverloadedFuncName(name string) bool {
	return gopOverloadFuncNameRE.MatchString(name)
}

// parseGopFuncName parses the Go+ overloaded function name.
func parseGopFuncName(name string) (parsedName string, overloadID *string) {
	parsedName = name
	if matches := gopOverloadFuncNameRE.FindStringSubmatch(parsedName); len(matches) == 3 {
		parsedName = matches[1]
		overloadID = &matches[2]
	}
	parsedName = toLowerCamelCase(parsedName)
	return
}

// expandGoptOverloadedMethod expands the given Go+ template method to all
// its overloads.
func expandGoptOverloadedMethod(method *types.Func) []*types.Func {
	typ, objs := gogen.CheckSigFuncExObjects(method.Type().(*types.Signature))
	if typ == nil {
		return nil
	}
	if _, ok := typ.(*gogen.TyTemplateRecvMethod); !ok {
		return nil
	}
	overloads := make([]*types.Func, 0, len(objs))
	for _, obj := range objs {
		overloads = append(overloads, obj.(*types.Func))
	}
	return overloads
}

// spxEventHandlerFuncNameRE is the regular expression of the spx event handler
// function name.
var spxEventHandlerFuncNameRE = regexp.MustCompile(`^on[A-Z]\w*$`)

// isSpxEventHandlerFuncName reports whether the given function name is an
// spx event handler function name.
func isSpxEventHandlerFuncName(name string) bool {
	return spxEventHandlerFuncNameRE.MatchString(name)
}

// isMainPkgObject reports whether the given object is defined in the main package.
func isMainPkgObject(obj types.Object) bool {
	return obj != nil && obj.Pkg() != nil && obj.Pkg().Path() == "main"
}

// isRenameableObject reports whether the given object can be renamed.
func isRenameableObject(obj types.Object) bool {
	if !isMainPkgObject(obj) || obj.Parent() == types.Universe {
		return false
	}
	switch obj.(type) {
	case *types.Var, *types.Const, *types.TypeName, *types.Func, *types.Label:
		return true
	case *types.PkgName:
		return false
	}
	return false
}

// getSimplifiedTypeString returns the string representation of the given type,
// with the spx package name omitted while other packages use their short names.
func getSimplifiedTypeString(typ types.Type) string {
	return types.TypeString(typ, func(p *types.Package) string {
		if p.Path() == spxPkgPath {
			return ""
		}
		return p.Name()
	})
}
