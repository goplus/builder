//go:build js && wasm

package main

//go:generate go tool qexp -outdir internal/pkg github.com/goplus/builder/tools/ai

// Extended packages for the ispx js/wasm runtime.
import (
	_ "github.com/goplus/builder/tools/ispx/internal/pkg/github.com/goplus/builder/tools/ai"
)
