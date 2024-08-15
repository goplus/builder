package main

import (
	"compiler/internal"
	"syscall/js"
)

type jsFuncName string
type jsFuncBody func(this js.Value, p []js.Value) interface{}

var jsFuncList = map[jsFuncName]jsFuncBody{
	"getTypes_GO":       getTypes,
	"getInlayHints_GO":  getInlayHints,
	"getDiagnostics_GO": getDiagnostics,
	"getDefinition_GO":  getDefinition,
}

func jsFuncRegister() {
	for name, f := range jsFuncList {
		js.Global().Set(string(name), js.FuncOf(f))
	}
}

func getInlayHints(this js.Value, p []js.Value) interface{} {
	fileName := p[1].String()
	fileCode := p[2].String()
	internal.GetSPXFunctionsDecl(fileName, fileCode)
	return nil
}

func getDiagnostics(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetDiagnostics(fileName, fileCode))
}

func getDefinition(this js.Value, p []js.Value) interface{} {
	return nil
}

func getTypes(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetSPXFileType(fileName, fileCode))
}

func getCompletionItems(this js.Value, p []js.Value) interface{} {
	return nil
}
