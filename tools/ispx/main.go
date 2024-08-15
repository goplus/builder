package main

//go:generate qexp -outdir pkg github.com/goplus/spx
//go:generate qexp -outdir pkg github.com/hajimehoshi/ebiten/v2

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"log"
	"reflect"
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

// LoadData loads spx project data to run game.
func loadData(this js.Value, args []js.Value) interface{} {
	go runGame()
	inputArray := args[0]

	goBytes := convertToGoBytes(inputArray)
	dataChannel <- goBytes
	return nil
}

// ParseSkeletonAnimData parses skeleton animation data.
// Returns JSON string of the parsed data.
func parseSkeletonAnimData(this js.Value, args []js.Value) interface{} {
	spriteData := args[0]
	spriteName := args[1].String()
	animName := args[2].String()

	goBytes := convertToGoBytes(spriteData)
	fs := readZipData(goBytes)

	data, err := spx.Gopt_ParseSkeletonAnimData(fs, spriteName, animName)
	if err != nil {
		log.Fatalln("Failed to parse skeleton anim data:", err)
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Fatalln("Failed to marshal skeleton anim data:", err)
	}

	return js.ValueOf(string(jsonData))
}

func main() {
	js.Global().Set("goLoadData", js.FuncOf(loadData))
	js.Global().Set("goParseSkeletonAnimData", js.FuncOf(parseSkeletonAnimData))

	// Wait forever
	select {}
}

// readZipData reads zip data bytes and returns a zip file system.
func readZipData(zipData []byte) *zipfs.ZipFs {
	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		log.Fatalln("Failed to read zip data:", err)
	}
	return zipfs.NewZipFsFromReader(zipReader)
}

// convertToGoBytes converts JavaScript Uint8Array to Go bytes.
func convertToGoBytes(inputArray js.Value) []byte {
	length := inputArray.Get("length").Int()
	goBytes := make([]byte, length)
	js.CopyBytesToGo(goBytes, inputArray)
	return goBytes
}

func runGame() {
	zipData := <-dataChannel

	fs := readZipData(zipData)

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
