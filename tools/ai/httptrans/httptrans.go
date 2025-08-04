// Package httptrans provides a Transport implementation for AI interactions
// using standard net/http package, suitable for local environments.
package httptrans

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/goplus/builder/tools/ai"
)

// httpTransport implements [ai.Transport] using standard net/http package.
type httpTransport struct {
	// client is the HTTP client used for making requests.
	client *http.Client

	// endpoint is the URL for the AI interaction API.
	endpoint string

	// tokenProvider is a function that returns the auth token (without "Bearer ").
	// It's called before each request. If it returns "", no auth header is sent.
	tokenProvider func() string
}

// Option is a function type for configuring the [httpTransport].
type Option func(*httpTransport)

// WithHTTPClient sets a custom HTTP client for making requests. If not set,
// [http.DefaultClient] will be used.
func WithHTTPClient(client *http.Client) Option {
	return func(t *httpTransport) {
		t.client = client
	}
}

// WithEndpoint sets a custom endpoint for the AI interaction API.
func WithEndpoint(endpoint string) Option {
	return func(t *httpTransport) {
		t.endpoint = endpoint
	}
}

// WithTokenProvider sets a function that provides the Bearer token for
// Authorization. The provider function will be called before each request to
// get the current token. If the provider returns an empty string, no
// Authorization header will be sent.
func WithTokenProvider(provider func() string) Option {
	return func(t *httpTransport) {
		t.tokenProvider = provider
	}
}

// New creates a new [ai.Transport] suitable for standard HTTP environments. It
// uses net/http package to make network requests. By default, it uses
// "/api/ai/interaction" endpoint and sends no Authorization token.
func New(opts ...Option) ai.Transport {
	t := &httpTransport{
		client:        http.DefaultClient,
		endpoint:      "/api/ai/interaction",
		tokenProvider: func() string { return "" },
	}
	for _, opt := range opts {
		opt(t)
	}
	return t
}

// Interact implements [ai.Transport].
func (t *httpTransport) Interact(ctx context.Context, req ai.Request) (ai.Response, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", t.endpoint+"/turn", bytes.NewReader(reqBody))
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to create http request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if t.tokenProvider != nil {
		if token := t.tokenProvider(); token != "" {
			httpReq.Header.Set("Authorization", "Bearer "+token)
		}
	}

	httpResp, err := t.client.Do(httpReq)
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to execute http request: %w", err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to read http response body: %w", err)
	}

	if httpResp.StatusCode != http.StatusOK {
		return ai.Response{}, fmt.Errorf("failed to fetch with status: %s: %s", httpResp.Status, respBody)
	}

	var resp ai.Response
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return ai.Response{}, fmt.Errorf("failed to unmarshal response json: %w", err)
	}
	return resp, nil
}
