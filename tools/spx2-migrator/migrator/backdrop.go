// Backdrop API Migrator
//
// Overview:
//
// Rewrites startBackdrop/nextBackdrop/prevBackdrop to setBackdrop or
// setBackdropAndWait. Emits command-style calls at top-level.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `startBackdrop Next, true`
//   - `nextBackdrop false`
//
// After (pre.9)
//   - `setBackdropAndWait Next`
//   - `setBackdrop Next`
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertBackdropAPIs rewrites legacy backdrop APIs to the new format.
//
// Mappings (command style at top-level):
//   - `startBackdrop ...`       -> `setBackdrop ...`
//   - `startBackdrop x, true`   -> `setBackdropAndWait ...`
//   - `startBackdrop x, false`  -> `setBackdrop ...`
//   - `nextBackdrop`            -> `setBackdrop Next`
//   - `nextBackdrop true|false` -> `setBackdropAndWait Next` | `setBackdrop Next`
//   - `prevBackdrop`            -> `setBackdrop Prev`
//   - `prevBackdrop true|false` -> `setBackdropAndWait Prev` | `setBackdrop Prev`
//
// Examples:
//
// Before (legacy)
//   - `startBackdrop Next, true`
//   - `nextBackdrop false`
//
// After (pre.9)
//   - `setBackdropAndWait Next`
//   - `setBackdrop Next`
func (m *Migrator) convertBackdropAPIs() (int, error) {
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

		// Walk through AST to find and convert backdrop calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				switch x := exprStmt.X.(type) {
				case *xgoast.Ident:
					if transformBackdropIdentifier(x, exprStmt) {
						if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
							call.NoParenEnd = xgotoken.Pos(1)
						}
						modified = true
						converted++
					}
				case *xgoast.SelectorExpr:
					// Convert bare selector to call expression and transform
					call := &xgoast.CallExpr{Fun: x, Args: []xgoast.Expr{}}
					if transformBackdropCall(call) {
						exprStmt.X = call
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				case *xgoast.CallExpr:
					if transformBackdropCall(x) {
						x.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformBackdropCall(call) {
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

// transformBackdropCall rewrites a single backdrop API call when applicable.
// It returns true if a transformation was performed.
func transformBackdropCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: startBackdrop(...), nextBackdrop(...), prevBackdrop(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		if matchFunctionName(ident.Name, "startBackdrop") {
			return transformStartBackdropCall(call, ident, nil)
		}
		if matchFunctionName(ident.Name, "nextBackdrop") {
			return transformNextPrevBackdropCall(call, ident, nil, "Next")
		}
		if matchFunctionName(ident.Name, "prevBackdrop") {
			return transformNextPrevBackdropCall(call, ident, nil, "Prev")
		}
	}

	// Handle method calls: obj.startBackdrop(...), obj.nextBackdrop(...), obj.prevBackdrop(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		if matchFunctionName(sel.Sel.Name, "startBackdrop") {
			return transformStartBackdropCall(call, nil, sel)
		}
		if matchFunctionName(sel.Sel.Name, "nextBackdrop") {
			return transformNextPrevBackdropCall(call, nil, sel, "Next")
		}
		if matchFunctionName(sel.Sel.Name, "prevBackdrop") {
			return transformNextPrevBackdropCall(call, nil, sel, "Prev")
		}
	}

	return false
}

// transformBackdropIdentifier rewrites bare backdrop API identifiers used as statements.
// Example: `nextBackdrop` -> `setBackdrop Next`; `prevBackdrop` -> `setBackdrop Prev`.
func transformBackdropIdentifier(ident *xgoast.Ident, exprStmt *xgoast.ExprStmt) bool {
	originalName := ident.Name
	if matchFunctionName(originalName, "nextBackdrop") {
		exprStmt.X = &xgoast.CallExpr{
			Fun:  &xgoast.Ident{Name: preserveCase(originalName, "setBackdrop")},
			Args: []xgoast.Expr{&xgoast.Ident{Name: "Next"}},
		}
		return true
	}
	if matchFunctionName(originalName, "prevBackdrop") {
		exprStmt.X = &xgoast.CallExpr{
			Fun:  &xgoast.Ident{Name: preserveCase(originalName, "setBackdrop")},
			Args: []xgoast.Expr{&xgoast.Ident{Name: "Prev"}},
		}
		return true
	}
	return false
}

// transformStartBackdropCall rewrites startBackdrop with an optional wait parameter.
func transformStartBackdropCall(call *xgoast.CallExpr, ident *xgoast.Ident, sel *xgoast.SelectorExpr) bool {
	var originalName string
	if ident != nil {
		originalName = ident.Name
	} else {
		originalName = sel.Sel.Name
	}

	setFunName := func(name string) {
		if ident != nil {
			ident.Name = preserveCase(originalName, name)
		} else {
			sel.Sel.Name = preserveCase(originalName, name)
		}
	}

	if len(call.Args) == 1 {
		// `startBackdrop name` -> `setBackdrop ...`
		setFunName("setBackdrop")
		return true
	} else if len(call.Args) == 2 {
		// `startBackdrop name, wait` -> `setBackdrop ...` or `setBackdropAndWait ...`
		if waitArg := call.Args[1]; waitArg != nil {
			if shouldUseWait(waitArg) {
				setFunName("setBackdropAndWait")
			} else {
				setFunName("setBackdrop")
			}
			// Remove the wait parameter
			call.Args = call.Args[:1]
			return true
		}
	}
	return false
}

// transformNextPrevBackdropCall rewrites nextBackdrop/prevBackdrop with an optional wait parameter.
func transformNextPrevBackdropCall(call *xgoast.CallExpr, ident *xgoast.Ident, sel *xgoast.SelectorExpr, direction string) bool {
	var originalName string
	if ident != nil {
		originalName = ident.Name
	} else {
		originalName = sel.Sel.Name
	}

	setFunName := func(name string) {
		if ident != nil {
			ident.Name = preserveCase(originalName, name)
		} else {
			sel.Sel.Name = preserveCase(originalName, name)
		}
	}

	if len(call.Args) == 0 {
		// `nextBackdrop` -> `setBackdrop Next`
		setFunName("setBackdrop")
		call.Args = []xgoast.Expr{
			&xgoast.Ident{Name: direction},
		}
		return true
	} else if len(call.Args) == 1 {
		// `nextBackdrop wait` -> `setBackdrop Next` or `setBackdropAndWait Next`
		if waitArg := call.Args[0]; waitArg != nil {
			if shouldUseWait(waitArg) {
				setFunName("setBackdropAndWait")
			} else {
				setFunName("setBackdrop")
			}
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: direction},
			}
			return true
		}
	}
	return false
}
