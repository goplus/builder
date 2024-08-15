# Compiler tool

## Overview

Compiler tool provides ability for go plus builder to get information about user's `spx` code. Included inlay hint, types info, definition, diagnostic, completion items.

## Prepare

You don't need to prepare much. 

> This shell is based on root `tools/compiler`.  
> You have to enter this directory before you execute those shell following behind.  
> Use `cd tools/compiler` to enter.

```shell
./build.sh
cp $GOROOT/misc/wasm/wasm_exec.js ./static/
```

## Run

Serve directory `/tools/compiler/` with any HTTP server & open `index.html`


## WASM Returns 

The Reply struct shows the structure returned by the wasm function.   
If the `ok` becomes `false`, which means there may be some internal issue with wasm.  
The `content` contains any types of return.  
The `type` shows the type of returned content.  

```go
type Reply struct {
	Type    ResponseType `json:"type"`
	OK      bool         `json:"ok"`
	Content interface{}  `json:"content"`
}

```

## Export functions 

> GetDiagnostics   
> This function use spx analyser to check if there is some problem of code, such as undefined, operator matches, etc.  
> But lack of ability of check variable names.

```go
func GetDiagnostics(fileName, fileCode string) interface{}
```