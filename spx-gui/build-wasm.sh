#!/bin/bash
set -e

echo Run this script from 'spx-gui' directory

# Go v1.21.3 expected
go version

cd ../tools/fmt
source ./build.sh

cd ../ispx
source ./build.sh

cd ..

cp fmt/static/main.wasm ../spx-gui/src/assets/format.wasm
cp ispx/main.wasm ../spx-gui/src/assets/ispx/main.wasm
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../spx-gui/src/assets/wasm_exec.js
