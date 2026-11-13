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

# Build the default executor bundle. It composes xgoexec with the Tutorial
# framework; other framework bundles can be added without changing xgoexec.
( cd ../tools/xgoexec-bundle && ./build.sh )
cp ../tools/xgoexec-bundle/xgoexec.wasm src/assets/wasm/xgoexec.wasm
