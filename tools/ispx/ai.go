//go:build js && wasm

package main

import (
	"errors"
	"fmt"
	"log"
	"syscall/js"

	"github.com/goplus/builder/tools/ai"
	"github.com/goplus/builder/tools/ai/wasmtrans"
	"github.com/goplus/ixgo"
)

func init() {
	js.Global().Set("xbuilder_set_ai_description", js.FuncOf(setAIDescription))
	js.Global().Set("xbuilder_set_ai_interaction_api_endpoint", js.FuncOf(setAIInteractionAPIEndpoint))
	js.Global().Set("xbuilder_set_ai_interaction_api_token_provider", js.FuncOf(setAIInteractionAPITokenProvider))

	// Deprecated: Use the "xbuilder_" prefixed versions instead.
	//
	// FIXME: Remove these aliases in future releases.
	js.Global().Set("setAIDescription", js.FuncOf(setAIDescription))
	js.Global().Set("setAIInteractionAPIEndpoint", js.FuncOf(setAIInteractionAPIEndpoint))
	js.Global().Set("setAIInteractionAPITokenProvider", js.FuncOf(setAIInteractionAPITokenProvider))
}

// initAI initializes AI integration for the ispx interpreter.
func initAI(ixgoCtx *ixgo.Context) error {
	// Register patch for ai to support functions with generic type like [ai.XGot_Player_XGox_OnCmd].
	//
	// See https://github.com/goplus/builder/issues/765#issuecomment-2313915805.
	if err := ixgoCtx.RegisterPatch("github.com/goplus/builder/tools/ai", `
package ai

import . "github.com/goplus/builder/tools/ai"

func XGot_Player_XGox_OnCmd[T any](p *Player, handler func(cmd T) error) {
	var cmd T
	PlayerOnCmd_(p, cmd, handler)
}
`); err != nil {
		return fmt.Errorf("failed to register ai patch: %w", err)
	}

	return nil
}

// setAIDescription sets [aiDescription] from JavaScript.
func setAIDescription(this js.Value, args []js.Value) any {
	if len(args) > 0 {
		aiDescription := args[0].String()
		ai.SetDefaultKnowledgeBase(map[string]any{
			"AI-generated descriptive summary of the game world": aiDescription,
		})
	}
	return nil
}

// aiInteractionAPIEndpoint holds the endpoint URL for AI Interaction API.
var aiInteractionAPIEndpoint string

// setAIInteractionAPIEndpoint sets [aiInteractionAPIEndpoint] from JavaScript.
func setAIInteractionAPIEndpoint(this js.Value, args []js.Value) any {
	if len(args) > 0 {
		aiInteractionAPIEndpoint = args[0].String()
		resetAIDefaultTransport()
	}
	return nil
}

// aiInteractionAPITokenProvider holds the function that provides authentication
// tokens for AI Interaction API.
var aiInteractionAPITokenProvider func() string

// setAIInteractionAPITokenProvider sets [aiInteractionAPITokenProvider] from
// JavaScript. The provider can be either a synchronous function returning a
// string or an asynchronous function returning a Promise.
func setAIInteractionAPITokenProvider(this js.Value, args []js.Value) any {
	if len(args) > 0 && args[0].Type() == js.TypeFunction {
		tokenProviderFunc := args[0]
		aiInteractionAPITokenProvider = func() string {
			result := tokenProviderFunc.Invoke()
			if result.Type() != js.TypeObject || result.Get("then").IsUndefined() {
				return result.String()
			}

			resultChan := make(chan string, 1)
			then := js.FuncOf(func(this js.Value, args []js.Value) any {
				var result string
				if len(args) > 0 {
					result = args[0].String()
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

			result.Call("then", then).Call("catch", catch)
			select {
			case result := <-resultChan:
				return result
			case err := <-errChan:
				log.Printf("failed to get token: %v", err)
				return ""
			}
		}
		resetAIDefaultTransport()
	}
	return nil
}

// resetAIDefaultTransport resets the default AI Interaction transport with
// current endpoint and token provider settings. It only resets when both
// endpoint and token provider are configured.
func resetAIDefaultTransport() {
	if aiInteractionAPIEndpoint == "" || aiInteractionAPITokenProvider == nil {
		return
	}
	ai.SetDefaultTransport(wasmtrans.New(
		wasmtrans.WithEndpoint(aiInteractionAPIEndpoint),
		wasmtrans.WithTokenProvider(aiInteractionAPITokenProvider),
	))
}
