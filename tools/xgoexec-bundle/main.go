//go:build js && wasm

package main

import (
	"fmt"
	"syscall/js"

	"github.com/goplus/builder/tools/xgoexec"
)

var runtime = xgoexec.NewRuntime(
	map[string]xgoexec.Framework{tutorialFrameworkName: tutorialFramework{}},
	xgoexec.RuntimeHooks{
		Error: func(phase, message string) { js.Global().Call("xbuilder_xgoexec_error", phase, message) },
		Exit:  func(reason string) { js.Global().Call("xbuilder_xgoexec_exit", reason) },
	},
)

func init() {
	js.Global().Set("xbuilder_xgoexec_configure", js.FuncOf(configure))
	js.Global().Set("xbuilder_xgoexec_build", js.FuncOf(build))
	js.Global().Set("xbuilder_xgoexec_run", js.FuncOf(run))
	js.Global().Set("xbuilder_xgoexec_dispatch_event", js.FuncOf(dispatchEvent))
	js.Global().Set("xbuilder_xgoexec_resolve_capability_call", js.FuncOf(resolveCapabilityCall))
	js.Global().Call("xbuilder_xgoexec_ready")
}

func configure(this js.Value, args []js.Value) any {
	return newPromise(func() error {
		name := ""
		if len(args) > 0 {
			name = args[0].String()
		}
		return runtime.Configure(name)
	})
}
func build(this js.Value, args []js.Value) any {
	return newPromise(func() error {
		if len(args) == 0 {
			return fmt.Errorf("missing files")
		}
		files := map[string][]byte{}
		keys := js.Global().Get("Object").Call("keys", args[0])
		for i := 0; i < keys.Length(); i++ {
			name := keys.Index(i).String()
			value := args[0].Get(name)
			data := make([]byte, value.Length())
			js.CopyBytesToGo(data, value)
			files[name] = data
		}
		return runtime.Build(files)
	})
}
func run(this js.Value, args []js.Value) any { return newPromise(runtime.Run) }
func dispatchEvent(this js.Value, args []js.Value) any {
	return newPromise(func() error {
		if len(args) < 2 {
			return fmt.Errorf("missing event name or payload")
		}
		return xgoexec.DispatchEvent(args[0].String(), []byte(args[1].String()))
	})
}
func resolveCapabilityCall(this js.Value, args []js.Value) any {
	if len(args) >= 3 {
		xgoexec.ResolveCapabilityCall(uint32(args[0].Int()), args[1].String(), args[2].String())
	}
	return nil
}
func newPromise(action func() error) js.Value {
	executor := js.FuncOf(func(this js.Value, args []js.Value) any {
		if err := action(); err != nil {
			args[1].Invoke(js.Global().Get("Error").New(err.Error()))
		} else {
			args[0].Invoke(js.Undefined())
		}
		return nil
	})
	promise := js.Global().Get("Promise").New(executor)
	executor.Release()
	return promise
}
func main() { select {} }
