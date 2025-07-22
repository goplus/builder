// Movement API Migrator
//
// Overview:
//
// Rewrites `goto` to `stepTo` and normalizes `step` signatures to match pre.9.
// Emits command-style calls at top-level.
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertMovementAPIs rewrites movement-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `goto`              -> `stepTo`
//   - `step X, "anim"`    -> `step float64(X), 1.0, "anim"` (if X is non-literal) | `step X, 1.0, "anim"` (if X is a numeric literal)
//   - `step X` (X is int) -> `step float64(X)` (if X is non-literal) | `step X` (if X is a numeric literal)
//
// Note: Numeric literals (e.g. `10`, `-5`, `1.0`) adapt implicitly to float64.
//
// Examples:
//
// Before (legacy)
//   - `goto target`
//   - `step speed`
//   - `step 10, "run"`
//
// After (pre.9)
//   - `stepTo target`
//   - `step float64(speed)`
//   - `step 10, 1.0, "run"`
func (m *Migrator) convertMovementAPIs() (int, error) {
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

		// First pass: convert goto BranchStmt to stepTo CallExpr in statements
		convertedGotoStmts := 0
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			// Handle goto statements in block statements
			if blockStmt, ok := n.(*xgoast.BlockStmt); ok {
				for i, stmt := range blockStmt.List {
					if branchStmt, ok := stmt.(*xgoast.BranchStmt); ok {
						if branchStmt.Tok == xgotoken.GOTO && branchStmt.Label != nil {
							// Replace with stepTo call wrapped in ExprStmt
							stepToCall := &xgoast.CallExpr{
								Fun: &xgoast.Ident{Name: "stepTo"},
								Args: []xgoast.Expr{
									&xgoast.Ident{Name: branchStmt.Label.Name},
								},
								NoParenEnd: xgotoken.Pos(1), // command-style call
							}
							blockStmt.List[i] = &xgoast.ExprStmt{X: stepToCall}
							modified = true
							convertedGotoStmts++
						}
					}
				}
			}
			return true
		})
		converted += convertedGotoStmts

		// Second pass: convert regular movement API calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					changed := false
					if transformMovementCall(call) {
						changed = true
					}
					if transformStepSingleArgToFloat(call) {
						changed = true
					}
					if transformStepAnimTwoArgs(call) {
						changed = true
					}
					if changed {
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				changed := false
				if transformMovementCall(call) {
					changed = true
				}
				if transformStepSingleArgToFloat(call) {
					changed = true
				}
				if transformStepAnimTwoArgs(call) {
					changed = true
				}
				if changed {
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

// transformMovementCall rewrites a single movement API call when applicable.
// It returns true if a transformation was performed.
func transformMovementCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: goto(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		originalName := ident.Name
		if matchFunctionName(originalName, "goto") {
			// Convert goto to stepTo
			ident.Name = preserveCase(originalName, "stepTo")
			return true
		}
	}

	// Handle method calls: obj.goto(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		originalName := sel.Sel.Name
		if matchFunctionName(originalName, "goto") {
			// Convert goto to stepTo
			sel.Sel.Name = preserveCase(originalName, "stepTo")
			return true
		}
	}

	return false
}

// transformStepSingleArgToFloat ensures that `step X` uses a float argument to match Step__0 in pre.9.
// It wraps the single argument as `float64(X)` to avoid selecting the removed int overload.
func transformStepSingleArgToFloat(call *xgoast.CallExpr) bool {
	// Handle regular function calls: step(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		if matchFunctionName(ident.Name, "step") && len(call.Args) == 1 {
			// Only wrap non-literal arguments; numeric literals are implicitly
			// typed and can adapt to float64 without explicit conversion.
			if !isNumericLiteral(call.Args[0]) && !isFloat64Call(call.Args[0]) {
				arg := call.Args[0]
				call.Args[0] = &xgoast.CallExpr{Fun: &xgoast.Ident{Name: "float64"}, Args: []xgoast.Expr{arg}}
				return true
			}
		}
	}

	// Handle method calls: obj.step(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		if matchFunctionName(sel.Sel.Name, "step") && len(call.Args) == 1 {
			// Only wrap non-literal arguments; numeric literals are implicitly
			// typed and can adapt to float64 without explicit conversion.
			if !isNumericLiteral(call.Args[0]) && !isFloat64Call(call.Args[0]) {
				arg := call.Args[0]
				call.Args[0] = &xgoast.CallExpr{Fun: &xgoast.Ident{Name: "float64"}, Args: []xgoast.Expr{arg}}
				return true
			}
		}
	}

	return false
}

// transformStepAnimTwoArgs rewrites `step X, "anim"` to `step float64(X), 1.0, "anim"` to match the new signature.
func transformStepAnimTwoArgs(call *xgoast.CallExpr) bool {
	// Handle regular function calls: step(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		if matchFunctionName(ident.Name, "step") && len(call.Args) == 2 {
			// If second arg is animation name (string literal), insert default speed 1.0
			if bl, ok := call.Args[1].(*xgoast.BasicLit); ok && bl.Kind == xgotoken.STRING {
				first := call.Args[0]
				// Only wrap non-literal first argument; numeric literals can adapt implicitly.
				if !isNumericLiteral(first) && !isFloat64Call(first) {
					first = &xgoast.CallExpr{Fun: &xgoast.Ident{Name: "float64"}, Args: []xgoast.Expr{first}}
				}
				one := &xgoast.BasicLit{Kind: xgotoken.FLOAT, Value: "1.0"}
				call.Args = []xgoast.Expr{first, one, call.Args[1]}
				return true
			}
		}
	}

	// Handle method calls: obj.step(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		if matchFunctionName(sel.Sel.Name, "step") && len(call.Args) == 2 {
			// If second arg is animation name (string literal), insert default speed 1.0
			if bl, ok := call.Args[1].(*xgoast.BasicLit); ok && bl.Kind == xgotoken.STRING {
				first := call.Args[0]
				// Only wrap non-literal first argument; numeric literals can adapt implicitly.
				if !isNumericLiteral(first) && !isFloat64Call(first) {
					first = &xgoast.CallExpr{Fun: &xgoast.Ident{Name: "float64"}, Args: []xgoast.Expr{first}}
				}
				one := &xgoast.BasicLit{Kind: xgotoken.FLOAT, Value: "1.0"}
				call.Args = []xgoast.Expr{first, one, call.Args[1]}
				return true
			}
		}
	}

	return false
}

// isNumericLiteral reports whether expr is a numeric literal (int or float),
// including a negated numeric literal like -10 or -1.0.
func isNumericLiteral(expr xgoast.Expr) bool {
	switch v := expr.(type) {
	case *xgoast.BasicLit:
		return v.Kind == xgotoken.INT || v.Kind == xgotoken.FLOAT
	case *xgoast.UnaryExpr:
		if v.Op == xgotoken.SUB {
			if bl, ok := v.X.(*xgoast.BasicLit); ok {
				return bl.Kind == xgotoken.INT || bl.Kind == xgotoken.FLOAT
			}
		}
		return false
	default:
		return false
	}
}

// isFloat64Call reports whether expr is a call like `float64(x)`.
func isFloat64Call(expr xgoast.Expr) bool {
	if call, ok := expr.(*xgoast.CallExpr); ok {
		if ident, ok := call.Fun.(*xgoast.Ident); ok && ident.Name == "float64" {
			return true
		}
	}
	return false
}
