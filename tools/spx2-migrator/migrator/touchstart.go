// TouchStart API Migrator
//
// Overview:
//
// Rewrites legacy global onTouchStart variants to new signatures that require
// explicit targets. Emits command-style calls at top-level and preserves an
// existing selector argument if present.
package migrator

import (
	"sort"

	xgoast "github.com/goplus/xgo/ast"
	xgotoken "github.com/goplus/xgo/token"
)

// convertTouchStartAPIs rewrites onTouchStart API calls to the new format.
//
// Background: legacy global onTouchStart variants are removed. Callers must
// specify a target sprite or sprite list.
//
// Mappings (command style at top-level):
//   - `onTouchStart => {...}`           -> `onTouchStart ["Sprite1", "Sprite2",...], => {...}`
//   - `onTouchStart dst => {...}`       -> `onTouchStart ["Sprite1", "Sprite2",...], dst => {...}`
//   - `onTouchStart func(...) => {...}` -> `onTouchStart ["Sprite1", "Sprite2",...], func(...) => {...}`
//
// Note: If a selector already exists as first argument, it is preserved.
//
// Examples:
//
// Before (legacy)
//   - `onTouchStart => { destroy }`
//   - `onTouchStart dst => { handle dst }`
//
// After (pre.9)
//   - `onTouchStart ["Hero", "Enemy"], => { destroy }`
//   - `onTouchStart ["Hero", "Enemy"], dst => { handle dst }`
func (m *Migrator) convertTouchStartAPIs() (int, error) {
	converted := 0

	// Collect all sprite names from the project.
	allSprites := m.getAllSpriteNames()

	for path, content := range m.files {
		if !isSpxFile(path) {
			continue
		}

		file, err := m.parseFile(path, content)
		if err != nil {
			continue // Skip unparseable files
		}

		modified := false

		// Walk through AST to find and convert onTouchStart calls.
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					if transformTouchStartCall(call, allSprites) {
						call.NoParenEnd = xgotoken.Pos(1)
						modified = true
						converted++
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				if transformTouchStartCall(call, allSprites) {
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

// getAllSpriteNames collects all sprite names from the project resources.
// It returns a sorted list for consistent array generation.
func (m *Migrator) getAllSpriteNames() []string {
	sprites := make([]string, 0, len(m.resources.sprites))
	for spriteName := range m.resources.sprites {
		sprites = append(sprites, spriteName)
	}
	sort.Strings(sprites) // Ensure consistent ordering.
	return sprites
}

// transformTouchStartCall rewrites a single onTouchStart API call when applicable.
// It returns true if a transformation was performed.
func transformTouchStartCall(call *xgoast.CallExpr, allSprites []string) bool {
	// Check if this is an onTouchStart call (either function or method call)
	var isOnTouchStart bool
	if ident, ok := call.Fun.(*xgoast.Ident); ok && ident.Name == "onTouchStart" {
		isOnTouchStart = true
	} else if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok && sel.Sel.Name == "onTouchStart" {
		isOnTouchStart = true
	}

	if isOnTouchStart {
		// Cases to handle:
		// 1) onTouchStart => {...}
		// 2) onTouchStart dstSp => {...}
		// 3) onTouchStart func(...) => {...}
		// 4) onTouchStart "Sprite", => {...}           (already new API) no change
		// 5) onTouchStart ["A", "B"], dstSp => {...}    (already new API) no change

		// Helper: detect whether the first argument is a sprite selector (string literal, ["..."] or []string{"..."}).
		isSpriteSelector := func(expr xgoast.Expr) bool {
			switch v := expr.(type) {
			case *xgoast.BasicLit:
				return v.Kind == xgotoken.STRING
			case *xgoast.SliceLit:
				// XGo slice literal: ["A", "B"].
				return true
			case *xgoast.CompositeLit:
				// Expect an array literal of strings: []string{"A", "B"}
				if arr, ok := v.Type.(*xgoast.ArrayType); ok {
					if eltIdent, ok := arr.Elt.(*xgoast.Ident); ok && eltIdent.Name == "string" {
						return true
					}
				}
				return false
			default:
				return false
			}
		}

		// 0-arg: insert an all-sprites selector.
		if len(call.Args) == 0 {
			call.Args = []xgoast.Expr{createSpriteArrayLiteral(allSprites)}
			return true
		}

		// If the first argument is already a selector (string or []string), do nothing.
		if isSpriteSelector(call.Args[0]) {
			return false
		}

		// Otherwise, treat the first argument as a handler/lambda-like value and insert the selector as arg0.
		// This covers lambda (=>) forms which are not *FuncLit in XGo AST.
		newArgs := make([]xgoast.Expr, 0, len(call.Args)+1)
		newArgs = append(newArgs, createSpriteArrayLiteral(allSprites))
		newArgs = append(newArgs, call.Args...)
		call.Args = newArgs
		return true
	}

	return false
}

// createSpriteArrayLiteral creates an array literal AST node containing all sprite names.
// It returns a literal like: `["Sprite1", "Sprite2", "Sprite3"]`.
func createSpriteArrayLiteral(sprites []string) *xgoast.SliceLit {
	elts := make([]xgoast.Expr, len(sprites))
	for i, spriteName := range sprites {
		elts[i] = &xgoast.BasicLit{
			Kind:  xgotoken.STRING,
			Value: `"` + spriteName + `"`,
		}
	}
	return &xgoast.SliceLit{Elts: elts}
}
