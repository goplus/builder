package migrator

import (
	"bytes"
	"fmt"
	"strings"

	xgoast "github.com/goplus/xgo/ast"
	xgoformat "github.com/goplus/xgo/format"
	xgoparser "github.com/goplus/xgo/parser"
	xgotoken "github.com/goplus/xgo/token"
)

// matchFunctionName reports whether a function name matches another name,
// comparing the first rune case-insensitively and the remainder case-sensitively.
// It handles both PrevBackdrop/prevBackdrop style variations in spx.
func matchFunctionName(actual, expected string) bool {
	if len(actual) == 0 || len(expected) == 0 {
		return false
	}
	if len(actual) != len(expected) {
		return false
	}
	// Compare first letter (case-insensitive) and rest (case-sensitive)
	return strings.EqualFold(actual[:1], expected[:1]) && actual[1:] == expected[1:]
}

// preserveCase returns the target name with the same initial case as the source.
// If the source starts with uppercase, the target will start with uppercase.
func preserveCase(source, target string) string {
	if len(source) == 0 || len(target) == 0 {
		return target
	}
	if source[0] >= 'A' && source[0] <= 'Z' {
		// Source is uppercase, make target uppercase
		return strings.ToUpper(target[:1]) + target[1:]
	} else {
		// Source is lowercase, make target lowercase
		return strings.ToLower(target[:1]) + target[1:]
	}
}

// isSpxFile reports whether the path ends with .spx.
func isSpxFile(path string) bool {
	return strings.HasSuffix(path, ".spx")
}

// parseFile parses a .spx file using the XGo parser.
func (m *Migrator) parseFile(path string, content []byte) (*xgoast.File, error) {
	// For spx/XGo classfile DSL, enable classfile grammar and collect all errors
	// so we can still traverse partially parsed ASTs.
	mode := xgoparser.ParseComments | xgoparser.AllErrors
	if isSpxFile(path) {
		mode |= xgoparser.ParseGoPlusClass
	}
	return xgoparser.ParseEntry(m.fset, path, content, xgoparser.Config{Mode: mode})
}

// updateFile formats and updates a file in the migrator's file map.
func (m *Migrator) updateFile(path string, file *xgoast.File) error {
	var buf bytes.Buffer
	if err := xgoformat.Node(&buf, m.fset, file); err != nil {
		return fmt.Errorf("failed to format %s: %w", path, err)
	}
	m.files[path] = buf.Bytes()
	return nil
}

// shouldUseWait reports whether a wait argument indicates a waiting call.
func shouldUseWait(waitArg xgoast.Expr) bool {
	// Check for boolean literal
	if basicLit, ok := waitArg.(*xgoast.BasicLit); ok {
		return basicLit.Kind == xgotoken.IDENT && basicLit.Value == "true"
	}
	// Check for identifier (true/false)
	if identArg, ok := waitArg.(*xgoast.Ident); ok {
		return identArg.Name == "true"
	}
	// Default to false if we can't determine
	return false
}
