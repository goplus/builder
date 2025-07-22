// Costume API Migrator
//
// Overview:
//
// Rewrites `nextCostume`/`prevCostume` to `setCostume Next/Prev`. Emits
// command-style calls at top-level and handles bare identifiers.
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertCostumeAPIs rewrites costume-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `nextCostume` / `nextCostume()` -> `setCostume Next`.
//   - `prevCostume` / `prevCostume()` -> `setCostume Prev`.
//
// Examples:
//
// Before (legacy)
//   - `nextCostume`
//   - `prevCostume()`
//
// After (pre.9)
//   - `setCostume Next`
//   - `setCostume Prev`
func (m *Migrator) convertCostumeAPIs() (int, error) {
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

		// Walk through AST to find and convert costume calls or bare identifiers
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				switch x := exprStmt.X.(type) {
				case *xgoast.Ident:
					if transformCostumeIdentifier(x, exprStmt) {
						if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
							call.NoParenEnd = xgotoken.Pos(1)
						}
						modified = true
						converted++
					}
				case *xgoast.SelectorExpr:
					// Convert bare selector to call expression and transform
					call := &xgoast.CallExpr{Fun: x, Args: []xgoast.Expr{}}
					if transformCostumeCall(call) {
						exprStmt.X = call
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				case *xgoast.CallExpr:
					if transformCostumeCall(x) {
						x.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformCostumeCall(call) {
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

// transformCostumeCall transforms a single costume API call if applicable.
// It returns true if transformation was performed.
func transformCostumeCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: nextCostume(), prevCostume()
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		originalName := ident.Name
		if matchFunctionName(originalName, "nextCostume") {
			// Rewrite `nextCostume` to `setCostume Next`.
			ident.Name = preserveCase(originalName, "setCostume")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Next"},
			}
			return true
		}
		if matchFunctionName(originalName, "prevCostume") {
			// Rewrite `prevCostume` to `setCostume Prev`.
			ident.Name = preserveCase(originalName, "setCostume")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Prev"},
			}
			return true
		}
	}

	// Handle method calls: obj.nextCostume(), obj.prevCostume()
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		originalName := sel.Sel.Name
		if matchFunctionName(originalName, "nextCostume") {
			// Rewrite `obj.nextCostume()` to `obj.setCostume Next`.
			sel.Sel.Name = preserveCase(originalName, "setCostume")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Next"},
			}
			return true
		}
		if matchFunctionName(originalName, "prevCostume") {
			// Rewrite `obj.prevCostume()` to `obj.setCostume Prev`.
			sel.Sel.Name = preserveCase(originalName, "setCostume")
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: "Prev"},
			}
			return true
		}
	}

	return false
}

// transformCostumeIdentifier transforms bare costume API identifiers used as statements.
// Example: `nextCostume` -> `setCostume Next`; `prevCostume` -> `setCostume Prev`.
func transformCostumeIdentifier(ident *xgoast.Ident, exprStmt *xgoast.ExprStmt) bool {
	originalName := ident.Name
	if matchFunctionName(originalName, "nextCostume") {
		exprStmt.X = &xgoast.CallExpr{
			Fun:  &xgoast.Ident{Name: preserveCase(originalName, "setCostume")},
			Args: []xgoast.Expr{&xgoast.Ident{Name: "Next"}},
		}
		return true
	}
	if matchFunctionName(originalName, "prevCostume") {
		exprStmt.X = &xgoast.CallExpr{
			Fun:  &xgoast.Ident{Name: preserveCase(originalName, "setCostume")},
			Args: []xgoast.Expr{&xgoast.Ident{Name: "Prev"}},
		}
		return true
	}
	return false
}
