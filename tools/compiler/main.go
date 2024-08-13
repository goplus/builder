//go:build wasm

package main

import (
	"fmt"
)

func main() {
	// make channel
	c := make(chan struct{})

	fmt.Println("WASM Init")
	// js functions
	jsFuncRegister()

	<-c
}
