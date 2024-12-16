#!/bin/bash
set -e

# Go v1.23.4 expected
go version

cd ../tools/spxls
source ./build.sh
cp spxls.wasm ../../spx-gui/src/assets/spxls.wasm
