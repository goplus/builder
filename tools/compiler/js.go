package main

import (
	"compiler/internal"
	"reflect"
	"runtime"
	"strings"
	"syscall/js"
)

// jsFuncBody is the type of jsFuncList item.
type jsFuncBody func(this js.Value, p []js.Value) interface{}

// jsFuncList contains every single function can call from js, by using `func name` + `_GO`
var jsFuncList = []jsFuncBody{
	getTypes,
	getInlayHints,
	getDiagnostics,
	getDefinition,
	getCompletionItems,
}

// This register can auto register any function form jsFuncList.
func jsFuncRegister() {
	for _, f := range jsFuncList {
		js.Global().Set(getFuncName(f)+"_GO", js.FuncOf(f))
	}
}

// getFuncName can get a go function name.
func getFuncName(i interface{}) string {
	fullName := runtime.FuncForPC(reflect.ValueOf(i).Pointer()).Name()
	parts := strings.Split(fullName, ".")
	return parts[len(parts)-1]
}

// Functions following below is the entry functions for js.

func getInlayHints(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetInlayHint(fileName, fileCode))
}

func getDiagnostics(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetDiagnostics(fileName, fileCode))
}

func getDefinition(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetDefinition(fileName, fileCode))
}

func getTypes(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileCode := p[1].String()
	return internal.NewReply(internal.GetSPXFileType(fileName, fileCode))
}

func getCompletionItems(this js.Value, p []js.Value) interface{} {
	return nil
}
