//go:build js && wasm

// Package wasmtrans provides a Transport implementation for AI interactions
// within a WebAssembly (Wasm) environment, typically running in a browser.
package wasmtrans

import (
	"context"
	"encoding/json"
	"fmt"
	"syscall/js"
	"time"

	"github.com/goplus/builder/tools/ai"
)

// wasmTransport implements [ai.Transport] using JavaScript's fetch API.
type wasmTransport struct {
	// endpoint is the URL for the AI interaction API.
	endpoint string

	// tokenProvider is a function that returns the auth token (without "Bearer ").
	// It's called before each request. If it returns "", no auth header is sent.
	tokenProvider func() string
}

// Option is a function type for configuring the [wasmTransport].
type Option func(*wasmTransport)

// WithEndpoint sets a custom endpoint for the AI interaction API.
func WithEndpoint(endpoint string) Option {
	return func(t *wasmTransport) {
		t.endpoint = endpoint
	}
}

// WithTokenProvider sets a function that provides the Bearer token for
// Authorization. The provider function will be called before each request to
// get the current token. If the provider returns an empty string, no
// Authorization header will be sent.
func WithTokenProvider(provider func() string) Option {
	return func(t *wasmTransport) {
		t.tokenProvider = provider
	}
}

// New creates a new [ai.Transport] suitable for Wasm environments. It uses
// JavaScript interop (syscall/js) to make network requests. By default, it
// uses "/api/ai/interaction" endpoint and sends no Authorization token.
func New(opts ...Option) ai.Transport {
	t := &wasmTransport{
		endpoint:      "/api/ai/interaction",
		tokenProvider: func() string { return "" },
	}
	for _, opt := range opts {
		opt(t)
	}
	return t
}

// Interact implements [ai.Transport].
func (t *wasmTransport) Interact(ctx context.Context, req ai.Request) (ai.Response, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to marshal request: %w", err)
	}

	var resp ai.Response
	if err := t.fetchAndParse(ctx, "/turn", reqBody, &resp); err != nil {
		return ai.Response{}, err
	}
	return resp, nil
}

// Archive implements [ai.Transport].
func (t *wasmTransport) Archive(ctx context.Context, turns []ai.Turn, existingArchive string) (ai.ArchivedHistory, error) {
	reqBody, err := json.Marshal(map[string]any{
		"turns":           turns,
		"existingArchive": existingArchive,
	})
	if err != nil {
		return ai.ArchivedHistory{}, fmt.Errorf("failed to marshal archive request: %w", err)
	}

	var resp ai.ArchivedHistory
	if err := t.fetchAndParse(ctx, "/archive", reqBody, &resp); err != nil {
		return ai.ArchivedHistory{}, err
	}
	return resp, nil
}

// buildHeaders creates request headers with proper authentication.
func (t *wasmTransport) buildHeaders() map[string]any {
	headers := map[string]any{
		"Content-Type": "application/json",
	}
	if t.tokenProvider != nil {
		if token := t.tokenProvider(); token != "" {
			headers["Authorization"] = "Bearer " + token
		}
	}
	return headers
}

// fetchAndParse performs a fetch request and parses the JSON response into the target.
func (t *wasmTransport) fetchAndParse(ctx context.Context, path string, body []byte, result any) error {
	headers := t.buildHeaders()

	jsAbortController := js.Global().Get("AbortController").New()
	defer context.AfterFunc(ctx, func() {
		jsAbortController.Call("abort")
	})()
	jsAbortSignal := jsAbortController.Get("signal")

	jsResp, err := awaitPromise(ctx, js.Global().Call("fetch", t.endpoint+path, map[string]any{
		"method":  "POST",
		"headers": headers,
		"body":    string(body),
		"signal":  jsAbortSignal,
	}))
	if err != nil {
		return fmt.Errorf("failed to fetch: %w", err)
	}

	if !jsResp.Get("ok").Bool() {
		status := jsResp.Get("status").Int()
		statusText := jsResp.Get("statusText").String()
		retryAfter := time.Duration(0)
		if headers := jsResp.Get("headers"); headers.Truthy() {
			headerValue := headers.Call("get", "Retry-After")
			if headerValue.Truthy() {
				retryAfter = ai.RetryAfterFromHeader(headerValue.String())
			}
		}

		bodyPromise := jsResp.Call("text")
		bodyTextVal, bodyErr := awaitPromise(ctx, bodyPromise)
		if bodyErr != nil {
			err := fmt.Errorf("failed to fetch with status %d %s (and failed to read error body: %w)", status, statusText, bodyErr)
			if status == 429 {
				return &ai.TooManyRequestsError{
					RetryAfter: retryAfter,
					Err:        err,
				}
			}
			return err
		}

		bodyText := bodyTextVal.String()
		if status == 429 {
			return &ai.TooManyRequestsError{
				RetryAfter: retryAfter,
				Err:        fmt.Errorf("failed to fetch with status %d %s: %s", status, statusText, bodyText),
			}
		}
		return fmt.Errorf("failed to fetch with status %d %s: %s", status, statusText, bodyText)
	}

	jsJSON, err := awaitPromise(ctx, jsResp.Call("json"))
	if err != nil {
		return fmt.Errorf("failed to process json response: %w", err)
	}
	jsonString := js.Global().Get("JSON").Call("stringify", jsJSON).String()

	if err := json.Unmarshal([]byte(jsonString), result); err != nil {
		return fmt.Errorf("failed to unmarshal response json: %w", err)
	}
	return nil
}
