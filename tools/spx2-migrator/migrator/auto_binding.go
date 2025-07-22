// Auto-Binding Remover
//
// Overview:
//
// Removes legacy auto-binding variable declarations (Sound/Sprite) from
// main.spx. It preserves unrelated variables and only trims matched names
// inside the first var block.
//
// Summary:
//
// Before (legacy)
//   - var bgm Sound
//   - onStart => { play bgm }
//
// After (pre.9)
//   - onStart => { play "bgm" }
//
// Notes:
//   - This module only edits declarations; the callsite string literal rewrite
//     is handled by the sound calls migrator.
package migrator

import (
	"bytes"
	"fmt"
	"strings"

	xgoast "github.com/goplus/xgo/ast"
	xgoformat "github.com/goplus/xgo/format"
	xgotoken "github.com/goplus/xgo/token"
)

// removeAutoBindings removes auto-binding variable declarations from main.spx.
//
// It scans the first var block and deletes variables that match the legacy
// auto-binding patterns (Sound and Sprite), keeping the remaining names and
// preserving unrelated declarations.
//
// Example (legacy):
//   - `var bgm Sound`
//   - `onStart => { play bgm }`
//
// After removal + call rewrite:
//   - `onStart => { play "bgm" }`
func (m *Migrator) removeAutoBindings() (int, error) {
	// Find main.spx file (may be in subdirectory)
	var (
		mainPath    string
		mainContent []byte
		exists      bool
	)
	for path, content := range m.files {
		if strings.HasSuffix(path, "/main.spx") || path == "main.spx" {
			mainPath = path
			mainContent = content
			exists = true
			break
		}
	}
	if !exists {
		return 0, fmt.Errorf("main.spx not found")
	}

	// Parse main.spx with XGo classfile grammar and collect all errors.
	file, err := m.parseFile("main.spx", mainContent)
	if err != nil {
		return 0, fmt.Errorf("failed to parse main.spx: %w", err)
	}

	// Find the first var declaration.
	var firstVarDecl *xgoast.GenDecl
	for _, decl := range file.Decls {
		if genDecl, ok := decl.(*xgoast.GenDecl); ok && genDecl.Tok == xgotoken.VAR {
			firstVarDecl = genDecl
			break
		}
	}
	if firstVarDecl == nil {
		return 0, nil // No var declarations
	}

	// Identify auto-binding variables to remove.
	removed := 0
	newSpecs := []xgoast.Spec{}
	for _, spec := range firstVarDecl.Specs {
		valueSpec, ok := spec.(*xgoast.ValueSpec)
		if !ok {
			newSpecs = append(newSpecs, spec)
			continue
		}

		// Skip if it has initialization values
		if len(valueSpec.Values) > 0 {
			newSpecs = append(newSpecs, spec)
			continue
		}

		// Check each variable in this spec
		newNames := []*xgoast.Ident{}
		for _, name := range valueSpec.Names {
			if !isAutoBinding(valueSpec, name.Name, m.resources) {
				newNames = append(newNames, name)
			} else {
				removed++
			}
		}

		// Keep the spec if it has remaining variables
		if len(newNames) > 0 {
			valueSpec.Names = newNames
			newSpecs = append(newSpecs, valueSpec)
		}
	}

	// Update or remove the var declaration.
	if len(newSpecs) == 0 {
		// Remove the entire var block
		newDecls := []xgoast.Decl{}
		for _, decl := range file.Decls {
			if decl != firstVarDecl {
				newDecls = append(newDecls, decl)
			}
		}
		file.Decls = newDecls
	} else {
		// Update the var block
		firstVarDecl.Specs = newSpecs
	}

	// Write back the modified file.
	var buf bytes.Buffer
	if err := xgoformat.Node(&buf, m.fset, file); err != nil {
		return removed, fmt.Errorf("failed to format main.spx: %w", err)
	}
	m.files[mainPath] = buf.Bytes()

	return removed, nil
}

// isAutoBinding reports whether a variable declaration is an auto-binding.
//
// Supported forms (per https://github.com/goplus/spx/issues/379):
//   - Sound:  var sd1 Sound; var sd2 *Sound.
//   - Sprite: var Sp1 Sp1; var Sp2 *Sp2; var Sp3 Sprite; var Sp4 *Sprite.
func isAutoBinding(spec *xgoast.ValueSpec, varName string, resources *resourceSet) bool {
	if spec.Type == nil {
		return false
	}

	baseTypeName := extractTypeName(spec.Type)

	// Sound auto-binding (2 forms).
	// 1) var sd1 Sound.
	// 2) var sd2 *Sound.
	if baseTypeName == "Sound" && resources.sounds[varName] {
		return true
	}

	// Sprite auto-binding (4 forms).
	if resources.sprites[varName] {
		// 1) var Sp1 Sp1 (type name matches variable name).
		// 2) var Sp2 *Sp2 (pointer type, type name matches variable name).
		if baseTypeName == varName {
			return true
		}

		// 3) var Sp3 Sprite (generic Sprite interface).
		// 4) var Sp4 *Sprite (pointer to generic Sprite interface).
		if baseTypeName == "Sprite" {
			return true
		}
	}

	return false
}

// extractTypeName extracts the base type name from a type expression.
func extractTypeName(expr xgoast.Expr) string {
	switch t := expr.(type) {
	case *xgoast.Ident:
		return t.Name
	case *xgoast.SelectorExpr:
		if x, ok := t.X.(*xgoast.Ident); ok && x.Name == "spx" {
			return t.Sel.Name
		}
	case *xgoast.StarExpr:
		// Handle pointer types like *Sprite, *Sound
		return extractTypeName(t.X)
	}
	return ""
}
