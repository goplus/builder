#!/bin/bash
set -e

echo "Run this script from 'spx-gui' directory"

# Build and copy ispx.wasm
( cd ../tools/ispx && ./build.sh )
cp ../tools/ispx/ispx.wasm src/assets/wasm/ispx.wasm

# Build and copy spxls.wasm
( cd ../tools/spxls && ./build.sh )
cp ../tools/spxls/spxls.wasm src/assets/wasm/spxls.wasm
