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
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		if matchFunctionName(ident.Name, "startBackdrop") {
			return transformStartBackdropCall(call, ident)
		}
		if matchFunctionName(ident.Name, "nextBackdrop") {
			return transformNextPrevBackdropCall(call, ident, "Next")
		}
		if matchFunctionName(ident.Name, "prevBackdrop") {
			return transformNextPrevBackdropCall(call, ident, "Prev")
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
func transformStartBackdropCall(call *xgoast.CallExpr, ident *xgoast.Ident) bool {
	originalName := ident.Name
	if len(call.Args) == 1 {
		// `startBackdrop name` -> `setBackdrop ...`
		ident.Name = preserveCase(originalName, "setBackdrop")
		return true
	} else if len(call.Args) == 2 {
		// `startBackdrop name, wait` -> `setBackdrop ...` or `setBackdropAndWait ...`
		if waitArg := call.Args[1]; waitArg != nil {
			if shouldUseWait(waitArg) {
				ident.Name = preserveCase(originalName, "setBackdropAndWait")
			} else {
				ident.Name = preserveCase(originalName, "setBackdrop")
			}
			// Remove the wait parameter
			call.Args = call.Args[:1]
			return true
		}
	}
	return false
}

// transformNextPrevBackdropCall rewrites nextBackdrop/prevBackdrop with an optional wait parameter.
func transformNextPrevBackdropCall(call *xgoast.CallExpr, ident *xgoast.Ident, direction string) bool {
	originalName := ident.Name
	if len(call.Args) == 0 {
		// `nextBackdrop` -> `setBackdrop Next`
		ident.Name = preserveCase(originalName, "setBackdrop")
		call.Args = []xgoast.Expr{
			&xgoast.Ident{Name: direction},
		}
		return true
	} else if len(call.Args) == 1 {
		// `nextBackdrop wait` -> `setBackdrop Next` or `setBackdropAndWait Next`
		if waitArg := call.Args[0]; waitArg != nil {
			if shouldUseWait(waitArg) {
				ident.Name = preserveCase(originalName, "setBackdropAndWait")
			} else {
				ident.Name = preserveCase(originalName, "setBackdrop")
			}
			call.Args = []xgoast.Expr{
				&xgoast.Ident{Name: direction},
			}
			return true
		}
	}
	return false
}
