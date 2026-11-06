#!/bin/bash
set -e
go generate ./...
GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o xgoexec.wasm
