package main

//go:generate qexp -outdir pkg github.com/goplus/spx

import (
	"archive/zip"
	"bytes"
	"log"
	"reflect"
	"syscall/js"

	_ "github.com/goplus/builder/ispx/pkg/github.com/goplus/spx"
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
	source, err := gopbuild.BuildFSDir(ctx, fs, "")
	if err != nil {
		log.Fatalln("Failed to build Go+ source:", err)
	}

	type Gamer interface {
		initGame(sprites []spx.Spriter) *spx.Game
	}
	gameRun := func(game spx.Gamer, resource interface{}, gameConf ...*spx.Config) {
		path := resource.(string)
		gameFs := fs.Chrooted(path)
		spx.Gopt_Game_Run(game, gameFs, gameConf...)
	}

	igop.RegisterExternal("github.com/goplus/spx.Gopt_Game_Main", func(game Gamer, sprites ...spx.Spriter) {
		g := game.initGame(sprites)
		if me, ok := game.(interface{ MainEntry() }); ok {
			me.MainEntry()
		}
		v := reflect.ValueOf(g).Elem().FieldByName("isRunned")
		if v.IsValid() && v.Bool() {
			return
		}
		gameRun(game.(spx.Gamer), "assets")
	})

	igop.RegisterExternal("github.com/goplus/spx.Gopt_Game_Run", gameRun)

	code, err := ctx.RunFile("main.go", source, nil)
	if err != nil {
		log.Fatalln("Failed to run Go+ source:", err, " Code:", code)
	}
}
