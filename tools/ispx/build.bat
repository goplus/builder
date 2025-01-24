@echo off
setlocal

set GOOS=js
set GOARCH=wasm

go build -tags canvas -trimpath -o main.wasm main.go

endlocal
