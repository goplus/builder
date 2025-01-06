@echo off
setlocal

set GOOS=js
set GOARCH=wasm

go build -trimpath -o static\main.wasm main.go

endlocal
