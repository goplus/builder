//go:build js && wasm

package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"log"
	"log/slog"
	"os"
	"syscall/js"

	"github.com/goplus/builder/ispx/zipfs"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	_ "github.com/goplus/reflectx/icall/icall8192"
	spxfs "github.com/goplus/spx/fs"
)

var dataChannel = make(chan []byte)

func loadData(this js.Value, args []js.Value) interface{} {
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

	ctx := igop.NewContext(0)
	ctx.Lookup = func(root, path string) (dir string, found bool) {
		log.Fatalf("Failed to resolve package import %q. This package is not available in the current environment.", path)
		return
	}

	ctx.SetPanic(logWithPanicInfo)

	// NOTE(everyone): Keep sync with the config in spx [gop.mod](https://github.com/goplus/spx/blob/main/gop.mod)
	gopbuild.RegisterClassFileType(".spx", "Game", []*gopbuild.Class{{Ext: ".spx", Class: "SpriteImpl"}}, "github.com/goplus/spx")

	// Register patch for spx to support functions with generic type like `Gopt_Game_Gopx_GetWidget`.
	// See details in https://github.com/goplus/builder/issues/765#issuecomment-2313915805
	if err := gopbuild.RegisterPackagePatch(ctx, "github.com/goplus/spx", `
package spx

import (
	. "github.com/goplus/spx"
)

func Gopt_Game_Gopx_GetWidget[T any](sg ShapeGetter, name string) *T {
	widget := GetWidget_(sg, name)
	if result, ok := widget.(interface{}).(*T); ok {
		return result
	} else {
		panic("GetWidget: type mismatch")
	}
}
`); err != nil {
		log.Fatalln("Failed to register package patch for github.com/goplus/spx:", err)
	}

	ctx.RegisterExternal("fmt.Print", func(frame *igop.Frame, a ...interface{}) (n int, err error) {
		msg := fmt.Sprint(a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ctx.RegisterExternal("fmt.Printf", func(frame *igop.Frame, format string, a ...interface{}) (n int, err error) {
		msg := fmt.Sprintf(format, a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ctx.RegisterExternal("fmt.Println", func(frame *igop.Frame, a ...interface{}) (n int, err error) {
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
