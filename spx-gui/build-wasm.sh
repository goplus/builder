#!/bin/bash
set -e

echo Run this script from 'spx-gui' directory

cd ../tools/ispx
source ./build.sh
cp ./main.wasm ../../spx-gui/src/assets/ispx/main.wasm

cd ../spxls
source ./build.sh
cp ./spxls.wasm ../../spx-gui/src/assets/spxls.wasm
