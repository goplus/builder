//go:build !js || !wasm

package xgoexec

import "fmt"

func dispatchCapabilityCall(id uint32, name, request string) error {
	return fmt.Errorf("capability %q is only available in js/wasm", name)
}
