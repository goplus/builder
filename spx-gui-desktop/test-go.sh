export GOROOT="$PWD/toolchain/go"
export PATH="$GOROOT/bin:$PATH"
export GOPATH="$PWD/go"
export GOTOOLCHAIN=

cd ./go/src/github.com/goplus/mock-spx && go run main.go
