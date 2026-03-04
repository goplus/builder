//go:build js && wasm

package main

import (
	"fmt"

	"github.com/goplus/ixgo"
	"github.com/goplus/ixgo/xgobuild"
	"github.com/goplus/mod/modfile"
	"github.com/goplus/spx/v2/pkg/ispx"
)

func init() {
	// NOTE: Keep in sync with the config in spx's gop.mod.
	xgobuild.RegisterProject(&modfile.Project{
		Ext:      ".spx",
		Class:    "Game",
		Works:    []*modfile.Class{{Ext: ".spx", Class: "SpriteImpl", Embedded: true}},
		PkgPaths: []string{"github.com/goplus/spx/v2", "math"},
		Import:   []*modfile.Import{{Name: "ai", Path: "github.com/goplus/builder/tools/ai"}},
	})
}

// ispxInit initializes the ispx interpreter with extended capabilities.
func ispxInit() error {
	ixgoCtx := ixgo.NewContext(ixgo.SupportMultipleInterp | xgobuild.StaticLoad)
	ixgoCtx.Lookup = nil // Let [ispx.Init] handle the lookup.
	ixgoCtx.SetPanic(logWithPanicInfo)

	// Override fmt.Print* functions to log with caller info.
	ixgoCtx.RegisterExternal("fmt.Print", func(frame *ixgo.Frame, a ...any) (n int, err error) {
		msg := fmt.Sprint(a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ixgoCtx.RegisterExternal("fmt.Printf", func(frame *ixgo.Frame, format string, a ...any) (n int, err error) {
		msg := fmt.Sprintf(format, a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})
	ixgoCtx.RegisterExternal("fmt.Println", func(frame *ixgo.Frame, a ...any) (n int, err error) {
		msg := fmt.Sprintln(a...)
		logWithCallerInfo(msg, frame)
		return len(msg), nil
	})

	if err := initAI(ixgoCtx); err != nil {
		return fmt.Errorf("failed to init ai: %w", err)
	}

	ixgoCtx.Loader.Import("fmt")
	ixgoCtx.Loader.Import("os")
	ixgoCtx.Loader.Import("sync/atomic")
	ixgoCtx.Loader.Import("math")
	ixgoCtx.Loader.Import("time")
	ixgoCtx.Loader.Import("sync")
	ixgoCtx.Loader.Import("io")
	ixgoCtx.Loader.Import("io/fs")
	ixgoCtx.Loader.Import("reflect")
	ixgoCtx.Loader.Import("strconv")
	ixgoCtx.Loader.Import("strings")
	ixgoCtx.Loader.Import("github.com/goplus/spx/v2")
	ixgoCtx.Loader.Import("github.com/qiniu/x/osx")
	ixgoCtx.Loader.Import("github.com/qiniu/x/xgo")
	ixgoCtx.Loader.Import("github.com/qiniu/x/xgo/ng")
	ixgoCtx.Loader.Import("github.com/qiniu/x/stringutil")
	ixgoCtx.Loader.Import("github.com/qiniu/x/stringslice")
	ixgoCtx.Loader.Import("github.com/goplus/builder/tools/ai")

	return ispx.Init(ixgoCtx)
}

func main() {
	if err := ispxInit(); err != nil {
		panic(err)
	}
	select {}
}
