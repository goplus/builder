@echo off
setlocal
go get

set GOOS=js
set GOARCH=wasm

REM Build the Go project
go build -o static\main.wasm compiler
endlocal
