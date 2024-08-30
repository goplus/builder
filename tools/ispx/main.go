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
	"unsafe"

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

// Editor_ParseSpriteAnimator parses sprite animator data.
// It takes sprite data in zip format and sprite name as arguments,
// and returns sprite animator data like clips list and avatar info.
func Editor_ParseSpriteAnimator(this js.Value, args []js.Value) interface{} {
	resource := args[0]
	sprite := args[1].String()

	goBytes := convertToGoBytes(resource)
	fs := readZipData(goBytes)

	data, err := spx.Editor_ParseSpriteAnimator(fs, sprite)
	if err != nil {
		log.Println("Failed to parse sprite animator:", err)
		return nil
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Println("Failed to marshal sprite animator data:", err)
		return nil
	}

	return js.ValueOf(string(jsonData))
}

// Editor_ParseSpriteAnimation parses sprite animation data.
// It takes sprite data in zip format, sprite name and animation name as arguments,
// and returns mesh data of each frame in the animation.
func Editor_ParseSpriteAnimation(this js.Value, args []js.Value) interface{} {
	spriteData := args[0]
	spriteName := args[1].String()
	animName := args[2].String()

	goBytes := convertToGoBytes(spriteData)
	fs := readZipData(goBytes)

	data, err := spx.Editor_ParseSpriteAnimation(fs, spriteName, animName)
	println("================")
	if err != nil {
		log.Println("Failed to parse sprite animation:", err)
		return nil
	}

	println("sizeof", unsafe.Sizeof(*data))

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Println("Failed to marshal sprite animation data:", err)
		return nil
	}


	println("done")
	return js.ValueOf(string(jsonData))
}

func main() {
	js.Global().Set("goLoadData", js.FuncOf(loadData))
	js.Global().Set("goEditorParseSpriteAnimation", js.FuncOf(Editor_ParseSpriteAnimation))
	js.Global().Set("goEditorParseSpriteAnimator", js.FuncOf(Editor_ParseSpriteAnimator))

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
