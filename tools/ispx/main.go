//go:build js && wasm

package main

import (
	"fmt"

	"github.com/goplus/ixgo"
	"github.com/goplus/ixgo/xgobuild"
	"github.com/goplus/mod/modfile"
	"github.com/goplus/spx/ispx"
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
	ixgoCtx := ixgo.NewContext(ixgo.SupportMultipleInterp)
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

	return ispx.Init(ixgoCtx)
}

func main() {
	if err := ispxInit(); err != nil {
		panic(err)
	}
	select {}
}
