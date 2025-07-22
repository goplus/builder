// Animation API Migrator
//
// Overview:
//
// Rewrites `animate` to `animateAndWait` (`animate` becomes non-blocking; the
// new blocking call is `animateAndWait`). Emits command-style calls at top-level.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `animate "walk"`
//
// After (pre.9)
//   - `animateAndWait "walk"`
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertAnimationAPIs rewrites animation-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `animate` -> `animateAndWait` (animate becomes non-blocking; animateAndWait blocks)
//
// Examples:
//
// Before (legacy)
//   - `animate "walk"`
//
// After (pre.9)
//   - `animateAndWait "walk"`
func (m *Migrator) convertAnimationAPIs() (int, error) {
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

		// Walk through AST to find and convert animation calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					if transformAnimationCall(call) {
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformAnimationCall(call) {
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

// transformAnimationCall rewrites a single animation API call when applicable.
// It returns true if a transformation was performed.
func transformAnimationCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: animate(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		originalName := ident.Name
		if matchFunctionName(originalName, "animate") {
			// Convert animate to animateAndWait
			ident.Name = preserveCase(originalName, "animateAndWait")
			return true
		}
	}

	// Handle method calls: obj.animate(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		originalName := sel.Sel.Name
		if matchFunctionName(originalName, "animate") {
			// Convert animate to animateAndWait
			sel.Sel.Name = preserveCase(originalName, "animateAndWait")
			return true
		}
	}

	return false
}
