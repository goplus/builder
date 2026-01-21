#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -tags canvas -ldflags -checklinkname=0 -trimpath -o ispx.wasm
