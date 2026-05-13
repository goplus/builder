#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
WASM_DIR="$ROOT_DIR/ui/prototype/src/assets/wasm"

mkdir -p "$WASM_DIR"

cp -f "$(go env GOROOT)/lib/wasm/wasm_exec.js" "$WASM_DIR/wasm_exec.js"

(
  cd "$ROOT_DIR/tools/spxls"
  GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o "$WASM_DIR/spxls.wasm" github.com/goplus/xgolsw
  go tool pkgdatagen -no-std -o "$WASM_DIR/spxls-pkgdata.zip" github.com/goplus/builder/tools/ai
)

(
  cd "$ROOT_DIR/tools/ispx"
  GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o "$WASM_DIR/ispx.wasm"
)
