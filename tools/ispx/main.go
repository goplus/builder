package main

//go:generate qexp -outdir pkg github.com/goplus/spx
//go:generate qexp -outdir pkg github.com/hajimehoshi/ebiten/v2

import (
	"archive/zip"
	"bytes"
	"log"
	"syscall/js"

	_ "github.com/goplus/builder/ispx/pkg/github.com/goplus/spx"
	_ "github.com/goplus/builder/ispx/pkg/github.com/hajimehoshi/ebiten/v2"
	"github.com/goplus/builder/ispx/zipfs"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	_ "github.com/goplus/igop/pkg/fmt"
	_ "github.com/goplus/igop/pkg/math"
	_ "github.com/goplus/reflectx/icall/icall8192"
	"github.com/goplus/spx"
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

func main() {
	js.Global().Set("goLoadData", js.FuncOf(loadData))

	zipData := <-dataChannel

	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		log.Fatalln("Failed to read zip data:", err)
	}
	fs := zipfs.NewZipFsFromReader(zipReader)

	var mode igop.Mode
	ctx := igop.NewContext(mode)

	// Register patch for spx to support functions with generic type like `Gopt_Game_Gopx_GetWidget`.
	// See details in https://github.com/goplus/builder/issues/765#issuecomment-2313915805
	err = gopbuild.RegisterPackagePatch(ctx, "github.com/goplus/spx", `
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
`)
	if err != nil {
		log.Fatalln("Failed to register package patch:", err)
	}

	source, err := gopbuild.BuildFSDir(ctx, fs, "")
	if err != nil {
		log.Fatalln("Failed to build Go+ source:", err)
	}

	// Definition of `Gamer` here should be the same as `Gamer` in `github.com/goplus/spx`
	// otherwise, it produces: "fatal error: unreachable method called. linker bug?"
	// TODO: consider better solution to avoid replacing `Gopy_Game_Main` and `Gopy_Game_Run`, see details in https://github.com/goplus/builder/issues/824
	type Gamer interface {
		initGame(sprites []spx.Spriter) *spx.Game
	}
	gameRun := func(game spx.Gamer, resource interface{}, gameConf ...*spx.Config) {
		path := resource.(string)
		gameFs := fs.Chrooted(path)
		spx.Gopt_Game_Run(game, gameFs, gameConf...)
	}

	igop.RegisterExternal("github.com/goplus/spx.Gopt_Game_Main", func(game Gamer, sprites ...spx.Spriter) {
		game.initGame(sprites)
		if me, ok := game.(interface{ MainEntry() }); ok {
			me.MainEntry()
		}
		if me, ok := game.(interface{ IsRunned() bool }); ok {
			if !me.IsRunned() {
				gameRun(game.(spx.Gamer), "assets")
			}
		}
	})

	igop.RegisterExternal("github.com/goplus/spx.Gopt_Game_Run", gameRun)

	code, err := ctx.RunFile("main.go", source, nil)
	if err != nil {
		log.Fatalln("Failed to run Go+ source:", err, " Code:", code)
	}
}
