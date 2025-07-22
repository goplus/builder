package migrator

import (
	"errors"
	"fmt"

	xgoast "github.com/goplus/xgo/ast"
)

// ErrRemovedAPIsUsed is the sentinel error for usages of removed APIs with no replacements.
var ErrRemovedAPIsUsed = errors.New("removed APIs used")

// RemovedUsage describes one removed-API usage found in source.
type RemovedUsage struct {
	File   string
	Line   int
	Column int
	Name   string // API name as found (normalized key)
	Note   string // brief note/reason
}

// RemovedAPIsError aggregates all removed-API usages to present a clear failure.
type RemovedAPIsError struct {
	Usages []RemovedUsage
}

func (e *RemovedAPIsError) Error() string {
	if len(e.Usages) == 0 {
		return ErrRemovedAPIsUsed.Error()
	}
	// Compose a concise multi-line error message.
	s := fmt.Sprintf("Detected removed APIs with no replacements; aborting migration. %d occurrence(s) found:\n", len(e.Usages))
	for _, u := range e.Usages {
		s += fmt.Sprintf("  %s:%d:%d: %s (%s)\n", u.File, u.Line, u.Column, u.Name, u.Note)
	}
	return s
}

// Unwrap allows errors.Is(err, ErrRemovedAPIsUsed) to match.
func (e *RemovedAPIsError) Unwrap() error { return ErrRemovedAPIsUsed }

// removedAPIs holds API names (DSL/camelCase) that were removed with no replacements.
// The key is the canonical DSL name; matching uses matchFunctionName to allow first-letter case variations.
var removedAPIs = map[string]string{
	// Game-level
	"isRunned":     "Game.isRunned removed; no replacement",
	"layout":       "Game.layout removed; internal engine responsibility",
	"mouseHitItem": "Game.mouseHitItem removed; no replacement",

	// Sprite-level
	"setDying":      "Sprite.setDying removed; no replacement",
	"parent":        "Sprite.parent removed; no replacement",
	"bounds":        "Sprite.bounds removed; no replacement",
	"costumeWidth":  "Sprite.costumeWidth removed; no replacement",
	"costumeHeight": "Sprite.costumeHeight removed; no replacement",
	"onMoving":      "Sprite.onMoving event removed; refactor motion logic",
	"onTurning":     "Sprite.onTurning event removed; refactor turning logic",
}

// scanRemovedAPIs scans all .spx files for usages of removed APIs. It does not modify files.
func (m *Migrator) scanRemovedAPIs() ([]RemovedUsage, error) {
	var usages []RemovedUsage

	for path, content := range m.files {
		if !isSpxFile(path) {
			continue
		}

		file, err := m.parseFile(path, content)
		if err != nil {
			// Skip unparseable files, keep best-effort behavior (legacy validation should have passed already)
			continue
		}

		xgoast.Inspect(file, func(n xgoast.Node) bool {
			switch v := n.(type) {
			case *xgoast.ExprStmt:
				// Bare identifier statement: `foo` (command style)
				if ident, ok := v.X.(*xgoast.Ident); ok {
					if name, note, ok := isRemovedName(ident.Name); ok {
						pos := m.fset.Position(ident.Pos())
						usages = append(usages, RemovedUsage{File: path, Line: pos.Line, Column: pos.Column, Name: name, Note: note})
					}
				}
				// Bare selector statement: `obj.foo` (command style)
				if sel, ok := v.X.(*xgoast.SelectorExpr); ok {
					if name, note, ok := isRemovedName(sel.Sel.Name); ok {
						pos := m.fset.Position(sel.Sel.Pos())
						usages = append(usages, RemovedUsage{File: path, Line: pos.Line, Column: pos.Column, Name: name, Note: note})
					}
				}
				// Top-level call: `foo ...` or `obj.foo ...`
				if call, ok := v.X.(*xgoast.CallExpr); ok {
					recordIfRemovedCall(m, path, call, &usages)
				}
			case *xgoast.CallExpr:
				// Any call in expression context
				recordIfRemovedCall(m, path, v, &usages)
			}
			return true
		})
	}

	return usages, nil
}

func recordIfRemovedCall(m *Migrator, path string, call *xgoast.CallExpr, usages *[]RemovedUsage) {
	switch fun := call.Fun.(type) {
	case *xgoast.Ident:
		if name, note, ok := isRemovedName(fun.Name); ok {
			pos := m.fset.Position(fun.Pos())
			*usages = append(*usages, RemovedUsage{File: path, Line: pos.Line, Column: pos.Column, Name: name, Note: note})
		}
	case *xgoast.SelectorExpr:
		if name, note, ok := isRemovedName(fun.Sel.Name); ok {
			pos := m.fset.Position(fun.Sel.Pos())
			*usages = append(*usages, RemovedUsage{File: path, Line: pos.Line, Column: pos.Column, Name: name, Note: note})
		}
	}
}

func isRemovedName(actual string) (name string, note string, ok bool) {
	for key, why := range removedAPIs {
		if matchFunctionName(actual, key) {
			return key, why, true
		}
	}
	return "", "", false
}
