//go:build js && wasm

package main

import (
	"log"
	"sync"
	"syscall/js"
)

// traceStartFunc starts one trace operation.
//
// It returns opaque propagation headers and a function for finishing this
// specific operation. The caller does not need to manage operation IDs.
type traceStartFunc func(name, operation string) (headers map[string]string, finish func(status string))

var traceHookState struct {
	sync.RWMutex
	start traceStartFunc
}

func init() {
	js.Global().Set("xbuilder_set_trace_hook", js.FuncOf(setTraceHook))
}

// setTraceHook installs the trace hook provided by the Web application.
// Passing null, undefined, or a non-function disables tracing.
func setTraceHook(this js.Value, args []js.Value) any {
	var next traceStartFunc
	if len(args) > 0 && args[0].Type() == js.TypeFunction {
		hook := args[0]
		next = func(name, operation string) (map[string]string, func(string)) {
			return invokeTraceHook(hook, name, operation)
		}
	}

	traceHookState.Lock()
	traceHookState.start = next
	traceHookState.Unlock()

	// Rebuild the default Transport so subsequent AI calls use this hook.
	resetAIDefaultTransport()
	return nil
}

func currentTraceHook() traceStartFunc {
	traceHookState.RLock()
	defer traceHookState.RUnlock()
	return traceHookState.start
}

// invokeTraceHook calls the JavaScript hook directly.
//
// Any JavaScript failure is ignored so tracing can never break the AI request.
func invokeTraceHook(hook js.Value, name, operation string) (
	headers map[string]string,
	finish func(status string),
) {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("failed to start trace hook: %v", recovered)
			headers = nil
			finish = nil
		}
	}()

	result := hook.Invoke(map[string]any{
		"name":      name,
		"operation": operation,
	})
	if result.Type() != js.TypeObject || result.IsNull() {
		return nil, nil
	}

	headers = jsStringMap(result.Get("propagationHeaders"))

	finishValue := result.Get("finish")
	if finishValue.Type() != js.TypeFunction {
		return headers, nil
	}

	var once sync.Once
	finish = func(status string) {
		once.Do(func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					log.Printf("failed to finish trace hook: %v", recovered)
				}
			}()
			finishValue.Invoke(status)
		})
	}
	return headers, finish
}

func jsStringMap(value js.Value) map[string]string {
	if value.Type() != js.TypeObject || value.IsNull() {
		return nil
	}

	keys := js.Global().Get("Object").Call("keys", value)
	result := make(map[string]string, keys.Length())

	for i := 0; i < keys.Length(); i++ {
		key := keys.Index(i).String()
		item := value.Get(key)
		if item.Type() == js.TypeString {
			result[key] = item.String()
		}
	}
	return result
}
