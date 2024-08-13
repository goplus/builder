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
