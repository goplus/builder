//go:build js && wasm

package xgoexec

import "syscall/js"

func dispatchCapabilityCall(id uint32, name, request string) error {
	js.Global().Call("xbuilder_xgoexec_capability_call", id, name, request)
	return nil
}
