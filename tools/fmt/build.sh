#!/bin/sh

GOTOOLCHAIN=go1.21.3 GOOS=js GOARCH=wasm go build -trimpath -o static/main.wasm main.go
