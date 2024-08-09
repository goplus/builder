//go:build wasm

package main

import (
	"compiler/internal"
	"fmt"
	"syscall/js"
)

func main() {
	// make channel
	c := make(chan struct{})

	fmt.Println("WASM Init")
	// js functions
	jsFuncRegister()

	<-c
}

type jsFuncName string
type jsFuncBody func(this js.Value, p []js.Value) interface{}
type jsFuncList map[jsFuncName]jsFuncBody

func jsFuncRegister() {
	js.Global().Set("getTypes_GO", js.FuncOf(getTypes))
}

func getInlayHints(this js.Value, p []js.Value) interface{} {
	return nil
}

func getDiagnostics(this js.Value, p []js.Value) interface{} {
	return nil
}

func getDefinition(this js.Value, p []js.Value) interface{} {
	return nil
}

func getTypes(this js.Value, p []js.Value) interface{} {
	fileName := p[1].String()
	fileCode := p[2].String()
	json, err := internal.Struct2JSValue(internal.GetSPXFileType(fileName, fileCode))
	if err != nil {
		fmt.Println(err)
	}
	return json
}

func getCompletionItems(this js.Value, p []js.Value) interface{} {
	return nil
}
