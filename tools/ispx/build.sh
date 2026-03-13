#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o ispx.wasm
