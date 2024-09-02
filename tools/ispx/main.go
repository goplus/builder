//go:build wasm

package main

//go:generate qexp -outdir pkg github.com/goplus/spx
//go:generate qexp -outdir pkg github.com/hajimehoshi/ebiten/v2

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
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

	println("parsing sprite animation...")
	data, err := spx.Editor_ParseSpriteAnimation(fs, spriteName, animName)
	if err != nil {
		log.Println("Failed to parse sprite animation:", err)
		return nil
	}
	println("done")
	return structToJSObject(data)
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

// recursive function to convert struct to js value
func structToJSObject(data interface{}) js.Value {
	v := reflect.ValueOf(data)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	t := v.Type()
	// for object, create a new js object, and set each field with recursive call
	if t.Kind() == reflect.Struct {
		jsObj := js.Global().Get("Object").New()
		for i := 0; i < t.NumField(); i++ {
			f := t.Field(i)
			name := f.Tag.Get("json")
			if name == "" {
				name = f.Name
			}
			jsObj.Set(name, structToJSObject(v.Field(i).Interface()))
		}
		return jsObj
	}
	// for array, create a new js array, and set each element with recursive call
	if t.Kind() == reflect.Slice {
		jsArr := js.Global().Get("Array").New()
		for i := 0; i < v.Len(); i++ {
			jsArr.SetIndex(i, structToJSObject(v.Index(i).Interface()))
		}
		return jsArr
	}
	// for other types, convert to JS value directly
	val, err := guardedJSValueOf(data)
	if err != nil {
		log.Println("Failed to convert to JS value:", err)
	}
	return val
}

// guardedJSValueOf catches panic when converting Go value to JS value.
// For a failed conversion, it will return a `null`
func guardedJSValueOf(data interface{}) (val js.Value, err error) {
	defer func() {
		if recover() != nil {
			val = js.ValueOf(nil)
			err = errors.New("Failed to convert data to JS value: " + reflect.TypeOf(data).String())
		}
	}()
	val = js.ValueOf(data)
	return val, nil
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
