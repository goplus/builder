//go:build wasm

package main

import (
	"fmt"
)

// wasm entry
func main() {
	defer handlePanic()

	fmt.Println("WASM Init")
	// js functions
	jsFuncRegister()

	select {}
}

func handlePanic() {
	if r := recover(); r != nil {
		fmt.Println("Recovered from panic: ", r)
	}
}
