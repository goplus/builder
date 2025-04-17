//go:build js && wasm

package wasmtrans

import (
	"context"
	"errors"
	"fmt"
	"syscall/js"
)

// awaitPromise waits for a JavaScript Promise to resolve or reject.
func awaitPromise(ctx context.Context, promise js.Value) (js.Value, error) {
	if promise.IsUndefined() || promise.IsNull() {
		return js.Undefined(), errors.New("promise is undefined or null")
	}
	if promise.Type() != js.TypeObject || promise.Get("then").Type() != js.TypeFunction {
		return js.Undefined(), errors.New("value is not a Promise")
	}

	resultChan := make(chan js.Value, 1)
	then := js.FuncOf(func(this js.Value, args []js.Value) any {
		result := js.Undefined()
		if len(args) > 0 {
			result = args[0]
		}
		resultChan <- result
		return nil
	})
	defer then.Release()

	errChan := make(chan error, 1)
	catch := js.FuncOf(func(this js.Value, args []js.Value) any {
		errMsg := "promise rejected"
		if len(args) > 0 {
			errVal := args[0]
			if errVal.Type() == js.TypeObject && errVal.Get("message").Type() == js.TypeString {
				errMsg = fmt.Sprintf("promise rejected: %s", errVal.Get("message"))
			} else if errVal.Type() == js.TypeString {
				errMsg = fmt.Sprintf("promise rejected: %s", errVal)
			} else {
				errMsg = fmt.Sprintf("promise rejected: %v", errVal)
			}
		}
		errChan <- errors.New(errMsg)
		return nil
	})
	defer catch.Release()

	promise.Call("then", then).Call("catch", catch)
	select {
	case result := <-resultChan:
		return result, nil
	case err := <-errChan:
		return js.Undefined(), err
	case <-ctx.Done():
		return js.Undefined(), fmt.Errorf("context cancelled while waiting for promise: %w", ctx.Err())
	}
}
