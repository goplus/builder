#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -trimpath -o spxls.wasm github.com/goplus/goxlsw

go run github.com/goplus/goxlsw/cmd/pkgdatagen@latest -no-std -o spxls-pkgdata.zip github.com/goplus/builder/tools/ai
