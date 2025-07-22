// Layer API Migrator
//
// Overview:
//
// Rewrites `gotoBack`/`gotoFront`/`goBackLayers` to `setLayer`. Emits command-style
// calls at top-level.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `gotoFront`
//   - `goBackLayers 2`
//
// After (pre.9)
//   - `setLayer Front`
//   - `setLayer Backward, 2`
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertLayerAPIs rewrites layer-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `gotoBack` / `gotoBack()`   -> `setLayer Back`
//   - `gotoFront` / `gotoFront()` -> `setLayer Front`
//   - `goBackLayers n`            -> `setLayer Backward, n`
//
// Examples:
//
// Before (legacy)
//   - `gotoFront`
//   - `goBackLayers 2`
//
// After (pre.9)
//   - `setLayer Front`
//   - `setLayer Backward, 2`
func (m *Migrator) convertLayerAPIs() (int, error) {
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

		// Walk through AST to find and convert layer calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			// Prefer handling top-level expression statements to decide command-style printing.
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				switch x := exprStmt.X.(type) {
				case *xgoast.Ident:
					if transformLayerIdentifier(x, exprStmt) {
						if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
							call.NoParenEnd = xgotoken.Pos(1) // command-style: no parentheses
						}
						modified = true
						converted++
					}
				case *xgoast.SelectorExpr:
					// Convert bare selector to call expression and transform
					call := &xgoast.CallExpr{Fun: x, Args: []xgoast.Expr{}}
					if transformLayerCall(call) {
						exprStmt.X = call
						call.NoParenEnd = xgotoken.Pos(1) // command-style: no parentheses
						modified = true
						converted++
					}
				case *xgoast.CallExpr:
					if transformLayerCall(x) {
						// top-level call, prefer command-style
						x.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			// Handle nested calls (keep parentheses)
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformLayerCall(call) {
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

// transformLayerCall rewrites a single layer API call when applicable.
// It returns true if a transformation was performed.
func transformLayerCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: gotoBack(), gotoFront(), goBackLayers()
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		originalName := ident.Name
		if matchFunctionName(originalName, "gotoBack") {
			// Rewrite `gotoBack`/`gotoBack()` to: `setLayer Back`.
			ident.Name = preserveCase(originalName, "setLayer")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Back"},
			}
			return true
		}
		if matchFunctionName(originalName, "gotoFront") {
			// Rewrite `gotoFront`/`gotoFront()` to: `setLayer Front`.
			ident.Name = preserveCase(originalName, "setLayer")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Front"},
			}
			return true
		}
		if matchFunctionName(originalName, "goBackLayers") {
			// Rewrite goBackLayers n to: setLayer Backward, n.
			if len(call.Args) == 1 {
				ident.Name = preserveCase(originalName, "setLayer")
				oldArg := call.Args[0]
				call.Args = []xgoast.Expr{
					&xgoast.Ident{Name: "Backward"},
					oldArg,
				}
				return true
			}
		}
	}

	// Handle method calls: obj.gotoBack(), obj.gotoFront(), obj.goBackLayers()
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		originalName := sel.Sel.Name
		if matchFunctionName(originalName, "gotoBack") {
			// Rewrite `obj.gotoBack()` to: `obj.setLayer Back`.
			sel.Sel.Name = preserveCase(originalName, "setLayer")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Back"},
			}
			return true
		}
		if matchFunctionName(originalName, "gotoFront") {
			// Rewrite `obj.gotoFront()` to: `obj.setLayer Front`.
			sel.Sel.Name = preserveCase(originalName, "setLayer")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Front"},
			}
			return true
		}
		if matchFunctionName(originalName, "goBackLayers") {
			// Rewrite obj.goBackLayers n to: obj.setLayer Backward, n.
			if len(call.Args) == 1 {
				sel.Sel.Name = preserveCase(originalName, "setLayer")
				oldArg := call.Args[0]
				call.Args = []xgoast.Expr{
					&xgoast.Ident{Name: "Backward"},
					oldArg,
				}
				return true
			}
		}
	}

	return false
}

// transformLayerIdentifier rewrites layer API identifiers to function calls.
// It returns true if a transformation was performed.
func transformLayerIdentifier(ident *xgoast.Ident, exprStmt *xgoast.ExprStmt) bool {
	originalName := ident.Name
	if matchFunctionName(originalName, "gotoBack") {
		// Rewrite gotoBack to: setLayer Back.
		exprStmt.X = &xgoast.CallExpr{
			Fun: &xgoast.Ident{Name: preserveCase(originalName, "setLayer")},
			Args: []xgoast.Expr{
				&xgoast.Ident{Name: "Back"},
			},
		}
		return true
	}
	if matchFunctionName(originalName, "gotoFront") {
		// Rewrite gotoFront to: setLayer Front.
		exprStmt.X = &xgoast.CallExpr{
			Fun: &xgoast.Ident{Name: preserveCase(originalName, "setLayer")},
			Args: []xgoast.Expr{
				&xgoast.Ident{Name: "Front"},
			},
		}
		return true
	}
	return false
}
