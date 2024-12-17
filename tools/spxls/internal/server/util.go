package server

import (
	"fmt"
	"go/types"
	"regexp"
	"strings"

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

// toStringPtr returns a pointer to the string.
func toStringPtr(s string) *string {
	return &s
}

// fromStringPtr returns the string value from a pointer to a string.
func fromStringPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// toIntPtr returns a pointer to the int.
func toIntPtr(i int) *int {
	return &i
}

// fromIntPtr returns the int value from a pointer to an int.
func fromIntPtr(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

// walkStruct walks a struct and calls the given functions for each field and
// method.
func walkStruct(
	typ types.Type,
	onField func(named *types.Named, namedParents []*types.Named, field *types.Var),
	onMethod func(named *types.Named, namedParents []*types.Named, method *types.Func),
) {
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
				fieldType := field.Type()
				if ptr, ok := fieldType.(*types.Pointer); ok {
					fieldType = ptr.Elem()
				}
				if _, ok := fieldType.Underlying().(*types.Struct); ok {
					walk(fieldType, append(namedParents, named))
				}
			}
			if onField != nil {
				if _, ok := seenFields[field.Name()]; ok {
					continue
				}
				seenFields[field.Name()] = struct{}{}

				onField(named, namedParents, field)
			}
		}

		for i := range named.NumMethods() {
			method := named.Method(i)
			if onMethod != nil {
				if _, ok := seenMethods[method.Name()]; ok {
					continue
				}
				seenMethods[method.Name()] = struct{}{}

				onMethod(named, namedParents, method)
			}
		}
	}
	walk(typ, nil)
}

// gopOverloadFuncNameRE is the regular expression of the Go+ overloaded
// function name.
var gopOverloadFuncNameRE = regexp.MustCompile(`^(.+)__(\d+)$`)

// parseGopFuncName parses the Go+ overloaded function name.
func parseGopFuncName(name string) (funcName string, overloadId *string) {
	funcName = name
	if matches := gopOverloadFuncNameRE.FindStringSubmatch(funcName); len(matches) == 3 {
		funcName = matches[1]
		overloadId = &matches[2]
	}
	funcName = strings.ToLower(string(funcName[0])) + funcName[1:] // Make it lowerCamelCase.
	return
}

// spxEventHandlerFuncNameRE is the regular expression of the spx event handler
// function name.
var spxEventHandlerFuncNameRE = regexp.MustCompile(`^on[A-Z]\w*$`)

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
