//go:build js && wasm

package main

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"syscall/js"

	"github.com/goplus/builder/tools/ai"
	"github.com/goplus/builder/tools/ai/wasmtrans"
	"github.com/goplus/builder/tools/ispx/zipfs"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	"github.com/goplus/mod/modfile"
	_ "github.com/goplus/reflectx/icall/icall8192"
	spxfs "github.com/goplus/spx/fs"
)

var aiInteractionAPIEndpoint string

func setAIInteractionAPIEndpoint(this js.Value, args []js.Value) any {
	if len(args) > 0 {
		aiInteractionAPIEndpoint = args[0].String()
	}
	return nil
}

var aiInteractionAPITokenProvider func() string

func setAIInteractionAPITokenProvider(this js.Value, args []js.Value) any {
	if len(args) > 0 && args[0].Type() == js.TypeFunction {
		tokenProviderFunc := args[0]
		aiInteractionAPITokenProvider = func() string {
			result := tokenProviderFunc.Invoke()
			if result.Type() != js.TypeObject || result.Get("then").IsUndefined() {
				return result.String()
			}

			resultChan := make(chan string, 1)
			then := js.FuncOf(func(this js.Value, args []js.Value) any {
				var result string
				if len(args) > 0 {
					result = args[0].String()
				}
				resultChan <- result
				return nil
			})
			defer then.Release()

			errChan := make(chan error, 1)
			catch := js.FuncOf(func(this js.Value, args []js.Value) any {
				errMsg := "promise rejected"
				if len(args) > 0 {
					errVal := args[0]
					if errVal.Type() == js.TypeObject && errVal.Get("message").Type() == js.TypeString {
						errMsg = fmt.Sprintf("promise rejected: %s", errVal.Get("message"))
					} else if errVal.Type() == js.TypeString {
						errMsg = fmt.Sprintf("promise rejected: %s", errVal)
					} else {
						errMsg = fmt.Sprintf("promise rejected: %v", errVal)
					}
				}
				errChan <- errors.New(errMsg)
				return nil
			})
			defer catch.Release()

			result.Call("then", then).Call("catch", catch)
			select {
			case result := <-resultChan:
				return result
			case err := <-errChan:
				log.Printf("failed to get token: %v", err)
				return ""
			}
		}
	}
	return nil
}

var dataChannel = make(chan []byte)

func loadData(this js.Value, args []js.Value) any {
	inputArray := args[0]

	// Convert Uint8Array to Go byte slice
	length := inputArray.Get("length").Int()
	goBytes := make([]byte, length)
	js.CopyBytesToGo(goBytes, inputArray)

	dataChannel <- goBytes
	return nil
}

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func logWithCallerInfo(msg string, frame *igop.Frame) {
	if frs := frame.CallerFrames(); len(frs) > 0 {
		fr := frs[0]
		logger.Info(
			msg,
			"function", fr.Function,
			"file", fr.File,
			"line", fr.Line,
		)
	}
}

func logWithPanicInfo(info *igop.PanicInfo) {
	position := info.Position()
	logger.Error(
		"panic",
		"error", info.Error,
		"function", info.String(),
		"file", position.Filename,
		"line", position.Line,
		"column", position.Column,
	)
}

func main() {
	js.Global().Set("setAIInteractionAPIEndpoint", js.FuncOf(setAIInteractionAPIEndpoint))
	js.Global().Set("setAIInteractionAPITokenProvider", js.FuncOf(setAIInteractionAPITokenProvider))
	js.Global().Set("goLoadData", js.FuncOf(loadData))

	zipData := <-dataChannel

	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		log.Fatalln("Failed to read zip data:", err)
	}
	fs := zipfs.NewZipFsFromReader(zipReader)
	// Configure spx to load project files from zip-based file system.
	spxfs.RegisterSchema("", func(path string) (spxfs.Dir, error) {
		return fs.Chrooted(path), nil
	})

	ctx := igop.NewContext(igop.DisableImethodForReflect)
	ctx.Lookup = func(root, path string) (dir string, found bool) {
		log.Fatalf("Failed to resolve package import %q. This package is not available in the current environment.", path)
		return
	}
	ctx.SetPanic(logWithPanicInfo)

	// NOTE(everyone): Keep sync with the config in spx [gop.mod](https://github.com/goplus/spx/blob/main/gop.mod)
	gopbuild.RegisterProject(&modfile.Project{
		Ext:      ".spx",
		Class:    "Game",
		Works:    []*modfile.Class{{Ext: ".spx", Class: "SpriteImpl"}},
		PkgPaths: []string{"github.com/goplus/spx", "math"},
		Import:   []*modfile.Import{{Name: "ai", Path: "github.com/goplus/builder/tools/ai"}},
	})

	// Register patch for spx to support functions with generic type like `Gopt_Game_Gopx_GetWidget`.
	// See details in https://github.com/goplus/builder/issues/765#issuecomment-2313915805
	if err := gopbuild.RegisterPackagePatch(ctx, "github.com/goplus/spx", `
package spx

import . "github.com/goplus/spx"

func Gopt_Game_Gopx_GetWidget[T any](sg ShapeGetter, name string) *T {
	widget := GetWidget_(sg, name)
	if result, ok := widget.(any).(*T); ok {
		return result
	} else {
		panic("GetWidget: type mismatch")
	}
}
`); err != nil {
		log.Fatalln("Failed to register package patch for github.com/goplus/spx:", err)
	}

	if err := gopbuild.RegisterPackagePatch(ctx, "github.com/goplus/builder/tools/ai", `
package ai

import . "github.com/goplus/builder/tools/ai"

func Gopt_Player_Gopx_OnCmd[T any](p *Player, handler func(cmd T) error) {
	var cmd T
	PlayerOnCmd_(p, cmd, handler)
}
`); err != nil {
		log.Fatalln("Failed to register package patch for github.com/goplus/builder/tools/ai:", err)
	}
	ai.SetDefaultTransport(wasmtrans.New(
		wasmtrans.WithEndpoint(aiInteractionAPIEndpoint),
		wasmtrans.WithTokenProvider(aiInteractionAPITokenProvider),
	))

	ctx.RegisterExternal("fmt.Print", func(frame *igop.Frame, a ...any) (n int, err error) {
		msg := fmt.Sprint(a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ctx.RegisterExternal("fmt.Printf", func(frame *igop.Frame, format string, a ...any) (n int, err error) {
		msg := fmt.Sprintf(format, a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ctx.RegisterExternal("fmt.Println", func(frame *igop.Frame, a ...any) (n int, err error) {
		msg := fmt.Sprintln(a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})

	source, err := gopbuild.BuildFSDir(ctx, fs, "")
	if err != nil {
		log.Fatalln("Failed to build Go+ source:", err)
	}

	code, err := ctx.RunFile("main.go", source, nil)
	if err != nil {
		log.Fatalln("Failed to run Go+ source:", err, " Code:", code)
	}
}
