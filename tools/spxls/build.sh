#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -trimpath -o spxls.wasm github.com/goplus/goxlsw
