//go:build wasm

package main

import (
	"fmt"
	"runtime/debug"
	"syscall/js"
)

// wasm entry
func main() {
	defer handlePanic("main", nil)

	fmt.Println("WASM Init")
	// js functions
	jsFuncRegister()

	select {}
}

func handlePanic(name string, ret *js.Value) {
	if r := recover(); r != nil {
		fmt.Printf("`%s` Recovered from panic: %v\n", name, r)
		debug.PrintStack()
		if ret != nil {
			*ret = js.ValueOf(`{"ok":false,"content":null}`)
		}
	}
}
