// Sound Calls Migrator
//
// Overview:
//
// Rewrites legacy sound usages to the new API. It replaces legacy Sound
// auto-binding identifiers with string literals, converts PlayOptions-based
// calls to the dedicated APIs, and normalizes the (sound, wait) signature.
//
// Summary (command style at top-level):
//
// Before (legacy)
//   - `play bgm`
//   - `play bgm, true`
//   - `play bgm, &PlayOptions{Loop: true}`
//   - `play bgm, &PlayOptions{Action: PlayStop}`
//
// After (pre.9)
//   - `play "bgm"`
//   - `playAndWait "bgm"`
//   - `play "bgm", true`
//   - `stopPlaying "bgm"`
//
// Notes:
//   - Variable-based usage is still valid if it's a string variable (e.g. `name := "bgm"; play name`).
//   - Only calls that we rewrite are emitted in command style; others remain untouched.
package migrator

import (
	"bytes"
	"fmt"
	"strings"

	xgoast "github.com/goplus/xgo/ast"
	xgoformat "github.com/goplus/xgo/format"
	xgotoken "github.com/goplus/xgo/token"
)

// convertSoundCalls rewrites legacy sound usages to the new API.
//
// It converts sound identifiers to string literals, rewrites PlayOptions-based
// calls to the dedicated APIs, and normalizes the (sound, wait) signature.
//
// Legacy examples (pre.5):
//   - `play bgm`                   // bgm: Sound auto-binding variable.
//   - `play bgm, true`             // wait until finished.
//   - `play bgm, &PlayOptions{Loop: true}`
//   - `play bgm, &PlayOptions{Action: PlayStop}`
//
// New examples (pre.9):
//   - `play "bgm"`                // recommend using string literal for assets.
//   - `playAndWait "bgm"`         // explicit blocking.
//   - `play "bgm", true`          // loop.
//   - `stopPlaying "bgm"` / `pausePlaying "bgm"` / `resumePlaying "bgm"`
//
// Note: variable-based usage is still valid if it's a string variable, e.g.:
//   - `name := "bgm"; play name`
//
// The migrator only rewrites legacy Sound variables (auto-binding) to string literals.
func (m *Migrator) convertSoundCalls() (int, error) {
	converted := 0

	for path, content := range m.files {
		if !strings.HasSuffix(path, ".spx") {
			continue
		}

		// Parse the file using XGo classfile grammar and collect all errors
		file, err := m.parseFile(path, content)
		if err != nil {
			continue // Skip unparseable files
		}

		modified := false

		// Walk through AST to find and convert sound calls
		// Keep track of top-level calls that have been processed
		processedCalls := make(map[*xgoast.CallExpr]bool)

		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if exprStmt, ok := n.(*xgoast.ExprStmt); ok {
				if call, ok := exprStmt.X.(*xgoast.CallExpr); ok {
					if isPlayFunc(call) && len(call.Args) > 0 {
						// Mark this call as processed
						processedCalls[call] = true

						argConverted := transformSoundArgument(call, m.resources)
						signatureConverted := transformPlaySignature(call)
						optsConverted := transformPlayOptions(call)
						if argConverted || signatureConverted || optsConverted {
							// top-level sound calls prefer command style
							call.NoParenEnd = xgotoken.Pos(1)
							modified = true
							converted++
						}
					}
				}
				return true
			}
			if call, ok := n.(*xgoast.CallExpr); ok {
				// Skip if this call was already processed as a top-level call
				if processedCalls[call] {
					return true
				}

				if isPlayFunc(call) && len(call.Args) > 0 {
					argConverted := transformSoundArgument(call, m.resources)
					signatureConverted := transformPlaySignature(call)
					optsConverted := transformPlayOptions(call)
					if argConverted || signatureConverted || optsConverted {
						modified = true
						converted++
					}
				}
			}
			return true
		})

		// Write back modified file if changed
		if modified {
			var buf bytes.Buffer
			if err := xgoformat.Node(&buf, m.fset, file); err != nil {
				return converted, fmt.Errorf("failed to format %s: %w", path, err)
			}
			m.files[path] = buf.Bytes()
		}
	}

	return converted, nil
}

// transformSoundArgument rewrites a sound variable argument to a string literal when applicable.
// It handles cases like: `play mySound` -> `play "mySound"`.
// It returns true if a transformation was performed.
func transformSoundArgument(call *xgoast.CallExpr, resources *resourceSet) bool {
	if len(call.Args) == 0 {
		return false
	}

	// Only convert the first argument (the sound/media parameter)
	firstArg := call.Args[0]

	// Check if it's an identifier that refers to a sound resource
	if ident, ok := firstArg.(*xgoast.Ident); ok {
		if resources.sounds[ident.Name] {
			// Convert identifier to string literal
			call.Args[0] = &xgoast.BasicLit{
				Kind:  xgotoken.STRING,
				Value: fmt.Sprintf(`"%s"`, ident.Name),
			}
			return true
		}
	}

	return false
}

// transformPlaySignature rewrites the (sound, wait) form.
//
// Mappings (command style):
//   - `play "name", true`  -> `playAndWait "name"`.
//   - `play "name", false` -> `play "name"`.
func transformPlaySignature(call *xgoast.CallExpr) bool {
	// Check if this is a play call with 2 arguments (sound, wait)
	if len(call.Args) != 2 {
		return false
	}

	// Check if the second argument is a boolean literal
	secondArg := call.Args[1]
	var isWaitTrue bool
	var isWaitFalse bool

	if ident, ok := secondArg.(*xgoast.Ident); ok {
		isWaitTrue = ident.Name == "true"
		isWaitFalse = ident.Name == "false"
	} else if basicLit, ok := secondArg.(*xgoast.BasicLit); ok {
		isWaitTrue = basicLit.Value == "true"
		isWaitFalse = basicLit.Value == "false"
	}

	if !isWaitTrue && !isWaitFalse {
		return false
	}

	// Transform the function name and remove the wait parameter
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		if isWaitTrue {
			ident.Name = "playAndWait"
		}
		// If isWaitFalse, keep the name as "play"
		call.Args = call.Args[:1] // Remove the wait parameter
		return true
	}

	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		if isWaitTrue {
			sel.Sel.Name = "playAndWait"
		}
		// If isWaitFalse, keep the name as "play"
		call.Args = call.Args[:1] // Remove the wait parameter
		return true
	}

	return false
}

// isPlayFunc reports whether a call expression is a play invocation.
//
// It handles these variants:
//  1. `play(...)`                          - standalone function.
//  2. `this.Play(...)`, `sprite.Play(...)` - method calls.
//  3. `Play__0/1/2`                        - method overloads.
func isPlayFunc(call *xgoast.CallExpr) bool {
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		// Standalone func call: `play(...)`, `playAndWait(...)`.
		name := strings.ToLower(ident.Name)
		return name == "play" || name == "playandwait"
	}

	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		// Method call: `this.Play(...)`, `sprite.Play(...)`, etc.
		name := strings.ToLower(sel.Sel.Name)
		// Match Play, play, playAndWait, Play__0, Play__1, Play__2
		return name == "play" || name == "playandwait" || strings.HasPrefix(name, "play__")
	}

	return false
}

// transformPlayOptions rewrites `play name, &PlayOptions{...}` to the new API forms.
//
// Mappings:
//   - `Action: PlayStop`   -> `stopPlaying "name"`.
//   - `Action: PlayPause`  -> `pausePlaying "name"`.
//   - `Action: PlayResume` -> `resumePlaying "name"`.
//   - `Loop: true`         -> `play "name", true`.
//   - `Wait: true`         -> `playAndWait "name"`.
//
// When both Loop and Wait are present, Loop takes precedence (`play "name", true`).
func transformPlayOptions(call *xgoast.CallExpr) bool {
	if len(call.Args) < 2 {
		return false
	}

	second := call.Args[1]

	// Unwrap &PlayOptions{...} or PlayOptions{...}
	var lit *xgoast.CompositeLit
	switch v := second.(type) {
	case *xgoast.UnaryExpr:
		if v.Op == xgotoken.AND {
			if cl, ok := v.X.(*xgoast.CompositeLit); ok {
				lit = cl
			}
		}
	case *xgoast.CompositeLit:
		lit = v
	}
	if lit == nil {
		return false
	}
	// Ensure type is PlayOptions (may be qualified or unqualified) or untyped
	isPlayOptions := false
	switch t := lit.Type.(type) {
	case nil:
		// Untyped composite literal like `{Loop: true}`
		isPlayOptions = true
	case *xgoast.Ident:
		isPlayOptions = t.Name == "PlayOptions"
	case *xgoast.SelectorExpr:
		isPlayOptions = t.Sel.Name == "PlayOptions"
	}
	if !isPlayOptions {
		return false
	}

	// Parse fields
	var (
		hasAction bool
		actionVal string
		hasLoop   bool
		loopVal   bool
		hasWait   bool
		waitVal   bool
	)

	for _, elt := range lit.Elts {
		kv, ok := elt.(*xgoast.KeyValueExpr)
		if !ok {
			continue
		}
		keyIdent, ok := kv.Key.(*xgoast.Ident)
		if !ok {
			continue
		}
		key := keyIdent.Name
		switch key {
		case "Action":
			if ident, ok := kv.Value.(*xgoast.Ident); ok {
				hasAction = true
				actionVal = ident.Name // PlayStop/PlayPause/PlayResume/...
			}
		case "Loop":
			hasLoop = true
			switch v := kv.Value.(type) {
			case *xgoast.Ident:
				loopVal = strings.ToLower(v.Name) == "true"
			case *xgoast.BasicLit:
				loopVal = strings.ToLower(v.Value) == "true"
			}
		case "Wait":
			hasWait = true
			switch v := kv.Value.(type) {
			case *xgoast.Ident:
				waitVal = strings.ToLower(v.Name) == "true"
			case *xgoast.BasicLit:
				waitVal = strings.ToLower(v.Value) == "true"
			}
		}
	}

	// Helper to set function name (ident or selector)
	setFunName := func(name string) {
		if ident, ok := call.Fun.(*xgoast.Ident); ok {
			ident.Name = name
		} else if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
			sel.Sel.Name = name
		}
	}

	nameArg := call.Args[0]

	if hasAction {
		switch actionVal {
		case "PlayStop":
			setFunName("stopPlaying")
			call.Args = []xgoast.Expr{nameArg}
			return true
		case "PlayPause":
			setFunName("pausePlaying")
			call.Args = []xgoast.Expr{nameArg}
			return true
		case "PlayResume", "PlayContinue":
			setFunName("resumePlaying")
			call.Args = []xgoast.Expr{nameArg}
			return true
			// PlayRewind or others: fall through to non-action handling
		}
	}

	// Prefer Loop over Wait when both present
	if hasLoop && loopVal {
		setFunName("play")
		call.Args = []xgoast.Expr{nameArg, &xgoast.Ident{Name: "true"}}
		return true
	}
	if hasWait && waitVal {
		setFunName("playAndWait")
		call.Args = []xgoast.Expr{nameArg}
		return true
	}

	// Default: play "name".
	setFunName("play")
	call.Args = []xgoast.Expr{nameArg}
	return true
}
