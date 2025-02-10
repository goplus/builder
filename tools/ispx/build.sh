#!/bin/sh

GOTOOLCHAIN=go1.21.3 GOOS=js GOARCH=wasm go build -tags canvas -trimpath -o main.wasm
