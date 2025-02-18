#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -tags canvas -trimpath -ldflags -checklinkname=0 -o ispx.wasm
