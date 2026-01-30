//go:build js && wasm

package main

//go:generate go tool qexp -outdir internal/pkg github.com/goplus/builder/tools/ai

// Embedded extension packages for the WebAssembly ispx runtime.
import (
	_ "github.com/goplus/builder/tools/ispx/internal/pkg/github.com/goplus/builder/tools/ai"
)
