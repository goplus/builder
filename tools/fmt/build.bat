@echo off
setlocal

set GOOS=js
set GOARCH=wasm

go build -o static\main.wasm main.go

endlocal
