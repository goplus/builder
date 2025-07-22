// Graphic Effect API Migrator
//
// Overview:
//
// Rewrites `setEffect`/`changeEffect` to `setGraphicEffect`/`changeGraphicEffect`.
// Emits command-style calls at top-level.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `setEffect Color, 50`
//   - `changeEffect Color, -10`
//
// After (pre.9)
//   - `setGraphicEffect Color, 50`
//   - `changeGraphicEffect Color, -10`
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertEffectAPIs rewrites graphic effect-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `setEffect`    -> `setGraphicEffect`
//   - `changeEffect` -> `changeGraphicEffect`
//
// Examples:
//
// Before (legacy)
//   - `setEffect Color, 50`
//   - `changeEffect Color, -10`
//
// After (pre.9)
//   - `setGraphicEffect Color, 50`
//   - `changeGraphicEffect Color, -10`
func (m *Migrator) convertEffectAPIs() (int, error) {
	converted := 0

	for path, content := range m.files {
		if !isSpxFile(path) {
			continue
		}

		file, err := m.parseFile(path, content)
		if err != nil {
			continue // Skip unparseable files
		}

		modified := false

		// Walk through AST to find and convert effect calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					if transformEffectCall(call) {
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformEffectCall(call) {
					modified = true
					converted++
				}
			}
			return true
		})

		// Write back modified file if changed
		if modified {
			if err := m.updateFile(path, file); err != nil {
				return converted, err
			}
		}
	}

	return converted, nil
}

// transformEffectCall rewrites a single effect API call when applicable.
// It returns true if a transformation was performed.
func transformEffectCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: setEffect(...), changeEffect(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		originalName := ident.Name
		if matchFunctionName(originalName, "setEffect") {
			// Convert setEffect to setGraphicEffect
			ident.Name = preserveCase(originalName, "setGraphicEffect")
			return true
		}
		if matchFunctionName(originalName, "changeEffect") {
			// Convert changeEffect to changeGraphicEffect
			ident.Name = preserveCase(originalName, "changeGraphicEffect")
			return true
		}
	}

	// Handle method calls: obj.setEffect(...), obj.changeEffect(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		originalName := sel.Sel.Name
		if matchFunctionName(originalName, "setEffect") {
			// Convert setEffect to setGraphicEffect
			sel.Sel.Name = preserveCase(originalName, "setGraphicEffect")
			return true
		}
		if matchFunctionName(originalName, "changeEffect") {
			// Convert changeEffect to changeGraphicEffect
			sel.Sel.Name = preserveCase(originalName, "changeGraphicEffect")
			return true
		}
	}

	return false
}
