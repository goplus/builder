#!/bin/bash
set -e

GOOS=js GOARCH=wasm GODEBUG=gotypesalias=1 go build -o spxls.wasm
