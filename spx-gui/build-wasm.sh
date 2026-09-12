#!/bin/bash
set -e

cd "$(dirname "$0")"

# Copy Go wasm_exec.js
cp -f "$(go env GOROOT)/lib/wasm/wasm_exec.js" src/assets/wasm/wasm_exec.js

# Build and copy spxls.wasm and spxls-pkgdata.zip
( cd ../tools/spxls && ./build.sh )
cp ../tools/spxls/spxls.wasm src/assets/wasm/spxls.wasm
cp ../tools/spxls/spxls-pkgdata.zip src/assets/wasm/spxls-pkgdata.zip

# Build and copy ispx.wasm
( cd ../tools/ispx && ./build.sh )
cp ../tools/ispx/ispx.wasm src/assets/wasm/ispx.wasm

# Build and copy Resvg WebAssembly renderer.
if [[ "${RESVG_WASM_SKIP_BUILD:-}" != "1" ]]; then
  ( cd ../tools/resvg-wasm && ./build.sh )
fi
cp ../tools/resvg-wasm/pkg/resvg.js src/assets/wasm/resvg.js
cp ../tools/resvg-wasm/pkg/resvg.d.ts src/assets/wasm/resvg.d.ts
cp ../tools/resvg-wasm/pkg/resvg_bg.wasm src/assets/wasm/resvg_bg.wasm
