#!/bin/bash
echo Run this script from 'spx-gui' directory

cd ../tools/fmt
source build.sh

cd ../ispx
source build.sh

cd ..

mkdir -p ../spx-gui/public/wasm
cp fmt/static/main.wasm ../spx-gui/public/format.wasm
cp ispx/main.wasm ../spx-gui/public/ispx/main.wasm
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../spx-gui/public/wasm_exec.js
