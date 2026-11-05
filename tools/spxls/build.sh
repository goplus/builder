#!/bin/bash
set -e

GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o spxls.wasm github.com/goplus/xgolsw

go tool pkgdatagen -no-defaults -o spxls-pkgdata.zip \
  github.com/goplus/spx/v4 \
  github.com/goplus/spx/v4/pkg/spx/pkg/engine \
  github.com/goplus/builder/tools/ai
