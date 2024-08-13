package main

import (
	"compiler/internal"
	"fmt"
	"syscall/js"
)

type jsFuncName string
type jsFuncBody func(this js.Value, p []js.Value) interface{}

var jsFuncList = map[jsFuncName]jsFuncBody{
	"getTypes_GO": getTypes,
}

func jsFuncRegister() {
	for name, f := range jsFuncList {
		js.Global().Set(string(name), js.FuncOf(f))
	}
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
