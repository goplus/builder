#!/bin/bash
set -e

echo "Run this script from 'spx-gui' directory"

# Build and copy ispx.wasm
( cd ../tools/ispx && ./build.sh )
cp ../tools/ispx/ispx.wasm src/assets/wasm/ispx.wasm

# Build and copy spxls.wasm and spxls-pkgdata.zip
( cd ../tools/spxls && ./build.sh )
cp ../tools/spxls/spxls.wasm src/assets/wasm/spxls.wasm
cp ../tools/spxls/spxls-pkgdata.zip src/assets/wasm/spxls-pkgdata.zip
