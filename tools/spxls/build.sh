#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o spxls.wasm github.com/goplus/xgolsw

go tool pkgdatagen -no-std -o spxls-pkgdata.zip github.com/goplus/builder/tools/ai
