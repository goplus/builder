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
	getTokenDetail,
	getTokensDetail,
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

// turn js json into map
func jsValue2Map(value js.Value) map[string]string {
	fileMap := make(map[string]string)

	keys := js.Global().Get("Object").Call("keys", value)
	for i := range keys.Length() {
		k := keys.Index(i).String()
		v := value.Get(k).String()
		fileMap[k] = v
	}
	return fileMap
}

// turn js list into list
func jsValue2List(value js.Value) (result []internal.TokenID) {
	for i := range value.Length() {
		elem := value.Index(i)
		token := internal.TokenID{
			TokenName: elem.Get("name").String(),
			TokenPkg:  elem.Get("module").String(),
		}
		result = append(result, token)
	}
	return
}

// Functions following below is the entry functions for js.

func getInlayHints(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileMap := p[1]
	return internal.NewReply(internal.GetInlayHint(fileName, jsValue2Map(fileMap)))
}

func getDiagnostics(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileMap := p[1]
	return internal.NewReply(internal.GetDiagnostics(fileName, jsValue2Map(fileMap)))
}

func getDefinition(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileMap := p[1]
	return internal.NewReply(internal.GetDefinition(fileName, jsValue2Map(fileMap)))
}

func getTypes(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileMap := p[1]
	return internal.NewReply(internal.GetSPXFileType(fileName, jsValue2Map(fileMap)))
}

func getCompletionItems(this js.Value, p []js.Value) interface{} {
	fileName := p[0].String()
	fileMap := p[1]
	cursorLine := p[2].Int()
	cursorColumn := p[3].Int()
	return internal.NewReply(internal.GetCompletions(fileName, jsValue2Map(fileMap), cursorLine, cursorColumn))
}

func getTokenDetail(this js.Value, p []js.Value) interface{} {
	name := p[0].String()
	module := p[1].String()
	return internal.NewReply(internal.GetTokenDetail(name, module))
}

func getTokensDetail(this js.Value, p []js.Value) interface{} {
	tokens := p[0]
	return internal.NewReply(internal.GetTokensDetail(jsValue2List(tokens)))
}
