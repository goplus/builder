#!/bin/bash
set -e

export PATH=/usr/local/go/bin:$PATH

./build-wasm.sh
npm run build
