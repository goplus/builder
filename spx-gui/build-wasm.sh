#!/bin/bash
echo Run this script from 'spx-gui' directory

cd ../tools/fmt || exit
# shellcheck source=../tools/fmt/build.sh
source ./build.sh

cd ../ispx || exit
# shellcheck source=../ispx/build.sh
source ./build.sh

# shellcheck source=../compiler/build.sh
cd ../compiler || exit
source ./build.sh

cd ..

cp fmt/static/main.wasm ../spx-gui/src/assets/format.wasm
cp ispx/main.wasm ../spx-gui/src/assets/ispx/main.wasm
cp compiler/static/main.wasm ../spx-gui/src/assets/compiler/main.wasm

cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../spx-gui/src/assets/wasm_exec.js
