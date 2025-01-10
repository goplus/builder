package server

import (
	"fmt"
	"go/types"
	"html/template"
	"io/fs"
	"regexp"
	"strings"

	"github.com/goplus/gogen"
	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// listSpxFiles returns a list of .spx files in the rootFS.
func listSpxFiles(rootFS fs.ReadDirFS) ([]string, error) {
	entries, err := fs.ReadDir(rootFS, ".")
	if err != nil {
		return nil, err
	}
	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(entry.Name(), ".spx") {
			continue
		}
		files = append(files, entry.Name())
	}
	return files, nil
}

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

// walkStruct walks a struct and calls the given onMember for each field and
// method. If onMember returns false, the walk is stopped.
func walkStruct(named *types.Named, onMember func(member types.Object, selector *types.Named) bool) {
	walked := make(map[*types.Named]struct{})
	seenMembers := make(map[string]struct{})
	var walk func(named *types.Named, namedPath []*types.Named) bool
	walk = func(named *types.Named, namedPath []*types.Named) bool {
		if _, ok := walked[named]; ok {
			return true
		}
		walked[named] = struct{}{}

		st, ok := named.Underlying().(*types.Struct)
		if !ok {
			return true
		}

		selector := named
		for _, named := range namedPath {
			if !isExportedOrMainPkgObject(named.Obj()) {
				break
			}
			selector = named

			if isSpxPkgObject(selector.Obj()) && (selector == GetSpxGameType() || selector == GetSpxSpriteImplType()) {
				break
			}
		}

		for i := range st.NumFields() {
			field := st.Field(i)
			if _, ok := seenMembers[field.Name()]; ok || !isExportedOrMainPkgObject(field) {
				continue
			}
			seenMembers[field.Name()] = struct{}{}

			if !onMember(field, selector) {
				return false
			}
		}
		for i := range named.NumMethods() {
			method := named.Method(i)
			if _, ok := seenMembers[method.Name()]; ok || !isExportedOrMainPkgObject(method) {
				continue
			}
			seenMembers[method.Name()] = struct{}{}

			if !onMember(method, selector) {
				return false
			}
		}
		for i := range st.NumFields() {
			field := st.Field(i)
			if !field.Embedded() {
				continue
			}
			fieldType := unwrapPointerType(field.Type())
			namedField, ok := fieldType.(*types.Named)
			if !ok || !isNamedStructType(namedField) {
				continue
			}

			if !walk(namedField, append(namedPath, namedField)) {
				return false
			}
		}
		return true
	}
	walk(named, []*types.Named{named})
}

// isNamedStructType reports whether the given named type is a struct type.
func isNamedStructType(named *types.Named) bool {
	_, ok := named.Underlying().(*types.Struct)
	return ok
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

// isGopOverloadableFunc reports whether the given function is a Go+ overloadable
// function with a signature like `func(__gop_overload_args__ interface{_()})`.
func isGopOverloadableFunc(fun *types.Func) bool {
	typ, _ := gogen.CheckSigFuncExObjects(fun.Type().(*types.Signature))
	return typ != nil
}

// expandGopOverloadableFunc expands the given Go+ function with a signature
// like `func(__gop_overload_args__ interface{_()})` to all its overloads. It
// returns nil if the function is not qualified for overload expansion.
func expandGopOverloadableFunc(fun *types.Func) []*types.Func {
	typ, objs := gogen.CheckSigFuncExObjects(fun.Type().(*types.Signature))
	if typ == nil {
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

// isSpxPkgObject reports whether the given object is defined in the spx package.
func isSpxPkgObject(obj types.Object) bool {
	return obj != nil && obj.Pkg() != nil && obj.Pkg().Path() == spxPkgPath
}

// isMainPkgObject reports whether the given object is defined in the main package.
func isMainPkgObject(obj types.Object) bool {
	return obj != nil && obj.Pkg() != nil && obj.Pkg().Path() == "main"
}

// isExportedOrMainPkgObject reports whether the given object is exported or
// defined in the main package.
func isExportedOrMainPkgObject(obj types.Object) bool {
	return obj != nil && (obj.Exported() || isMainPkgObject(obj))
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

// attr transforms given string value to an HTML attribute value (with quotes).
func attr(value string) string {
	return fmt.Sprintf(`"%s"`, template.HTMLEscapeString(value))
}
