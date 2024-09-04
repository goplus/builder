#!/bin/bash

go get
echo "Build tools:compiler"
GOOS=js GOARCH=wasm go build -o static/main.wasm compiler
