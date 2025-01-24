#!/bin/bash
set -e

export PATH=$PATH:/usr/local/go/bin && ./build-wasm.sh
npm run build
