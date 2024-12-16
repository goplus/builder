#!/bin/bash
set -e

ORIGINALPATH=$PATH

export PATH=$ORIGINALPATH:/usr/local/go1.23.4/bin && sh build-spxls.sh
export PATH=$ORIGINALPATH:/usr/local/go/bin && sh build-wasm.sh

npm run build
