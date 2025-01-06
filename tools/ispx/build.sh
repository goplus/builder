#!/bin/sh
GOOS=js GOARCH=wasm go build -tags canvas -trimpath -o main.wasm main.go
