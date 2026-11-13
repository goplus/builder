package xgoexec

// StandardPackages lists the packages available to every executor runtime.
// The WASM entry module must blank-import matching ixgo packages.
var StandardPackages = []string{
	"bytes", "encoding/json", "errors", "fmt", "io", "math", "math/rand", "sort", "strconv", "strings", "time",
}
