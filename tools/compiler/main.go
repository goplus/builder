//go:build wasm

package main

import (
	"fmt"
)

// wasm entry
func main() {
	// make channel
	c := make(chan struct{})

	fmt.Println("WASM Init")
	// js functions
	jsFuncRegister()

	<-c
}
