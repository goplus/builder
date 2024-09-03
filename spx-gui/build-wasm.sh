#!/bin/bash

echo "Run this script from 'spx-gui' directory"

cd ../tools/fmt || exit
if [[ -f ./build.sh ]]; then
    source ./build.sh
else
    echo "Error: ../tools/fmt/build.sh not found."
    exit 1
fi

cd ../ispx || exit
if [[ -f ./build.sh ]]; then
    source ./build.sh
else
    echo "Error: ../ispx/build.sh not found."
    exit 1
fi

cd ../compiler || exit
if [[ -f ./build.sh ]]; then
    source ./build.sh
else
    echo "Error: ../compiler/build.sh not found."
    exit 1
fi

cd ..

cp fmt/static/main.wasm ../spx-gui/src/assets/format.wasm
cp ispx/main.wasm ../spx-gui/src/assets/ispx/main.wasm
cp compiler/static/main.wasm ../spx-gui/src/assets/compiler/main.wasm

cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../spx-gui/src/assets/wasm_exec.js
