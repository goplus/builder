// Broadcast API Migrator
//
// Overview:
//
// Rewrites `broadcast msg[, data], wait` to `broadcast`/`broadcastAndWait`.
// Emits command-style calls at top-level.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `broadcast "flash", true`
//   - `broadcast "flash", cube, false`
//
// After (pre.9)
//   - `broadcastAndWait "flash"`
//   - `broadcast "flash", cube`
package migrator

import (
	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertBroadcastAPIs rewrites broadcast-related API calls to the new format.
//
// Mappings (command style at top-level):
//   - `broadcast "msg", true|false` -> `broadcastAndWait "msg"` | `broadcast "msg"`
//   - `broadcast "msg", data, wait` -> `broadcastAndWait "msg", data` | `broadcast "msg", data`
//
// Examples:
//
// Before (legacy)
//   - `broadcast "flash", true`
//   - `broadcast "flash", cube, false`
//
// After (pre.9)
//   - `broadcastAndWait "flash"`
//   - `broadcast "flash", cube`
func (m *Migrator) convertBroadcastAPIs() (int, error) {
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

		// Walk through AST to find and convert broadcast calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					if transformBroadcastCall(call) {
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformBroadcastCall(call) {
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

// transformBroadcastCall rewrites a single broadcast API call when applicable.
// It returns true if a transformation was performed.
func transformBroadcastCall(call *xgoast.CallExpr) bool {
	// Handle regular function calls: broadcast(...)
	if ident, ok := call.Fun.(*xgoast.Ident); ok && matchFunctionName(ident.Name, "broadcast") {
		// Handle `broadcast "msg", wait` - 2 arguments.
		if len(call.Args) == 2 {
			if isBooleanWaitParam(call.Args[1]) {
				return transformBroadcastWithWait(call, ident, nil, call.Args[:1])
			}
		}
		// Handle `broadcast "msg", data, wait` - 3 arguments.
		if len(call.Args) == 3 {
			if isBooleanWaitParam(call.Args[2]) {
				return transformBroadcastWithWait(call, ident, nil, call.Args[:2])
			}
		}
	}

	// Handle method calls: obj.broadcast(...)
	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok && matchFunctionName(sel.Sel.Name, "broadcast") {
		// Handle `obj.broadcast "msg", wait` - 2 arguments.
		if len(call.Args) == 2 {
			if isBooleanWaitParam(call.Args[1]) {
				return transformBroadcastWithWait(call, nil, sel, call.Args[:1])
			}
		}
		// Handle `obj.broadcast "msg", data, wait` - 3 arguments.
		if len(call.Args) == 3 {
			if isBooleanWaitParam(call.Args[2]) {
				return transformBroadcastWithWait(call, nil, sel, call.Args[:2])
			}
		}
	}

	return false
}

// transformBroadcastWithWait rewrites broadcast calls that carry a wait parameter.
func transformBroadcastWithWait(call *xgoast.CallExpr, ident *xgoast.Ident, sel *xgoast.SelectorExpr, newArgs []xgoast.Expr) bool {
	waitArg := call.Args[len(call.Args)-1]
	var originalName string
	if ident != nil {
		originalName = ident.Name
	} else {
		originalName = sel.Sel.Name
	}

	if shouldUseWait(waitArg) {
		if ident != nil {
			ident.Name = preserveCase(originalName, "broadcastAndWait")
		} else {
			sel.Sel.Name = preserveCase(originalName, "broadcastAndWait")
		}
	}
	// else keep the original name with preserved case

	// Remove the wait parameter
	call.Args = newArgs
	return true
}

// isBooleanWaitParam reports whether an expression is a boolean wait parameter.
func isBooleanWaitParam(expr xgoast.Expr) bool {
	// Check for boolean literal
	if basicLit, ok := expr.(*xgoast.BasicLit); ok {
		return basicLit.Kind == xgotoken.IDENT && (basicLit.Value == "true" || basicLit.Value == "false")
	}
	// Check for identifier (true/false)
	if identArg, ok := expr.(*xgoast.Ident); ok {
		return identArg.Name == "true" || identArg.Name == "false"
	}
	return false
}
