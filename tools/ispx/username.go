//go:build js && wasm

package main

import (
	"syscall/js"

	"github.com/goplus/spx/v3/pkg/spx"
)

func init() {
	js.Global().Set("xbuilder_set_username", js.FuncOf(setUsername))
}

// setUsername sets the spx runtime username from JavaScript. It should be
// called before the game runs so that the spx runtime reports the current
// logged-in username via `Game.Username`. An empty string represents an
// anonymous user. See https://github.com/goplus/builder/issues/3364.
func setUsername(this js.Value, args []js.Value) any {
	if len(args) > 0 {
		spx.SetUsername(args[0].String())
	}
	return nil
}
