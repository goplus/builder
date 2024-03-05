#!/bin/bash
echo Run this script from 'spx-gui' directory

cd ../tools/fmt
source build.sh

cd ../ispx
source build.sh

cd ..

cp fmt/static/main.wasm ../spx-gui/src/assets/format.wasm
cp ispx/main.wasm ../spx-gui/src/assets/ispx/main.wasm
