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

	httpReq, err := t.buildRequest(ctx, "POST", "/turn", reqBody)
	if err != nil {
		return ai.Response{}, err
	}

	httpResp, err := t.client.Do(httpReq)
	if err != nil {
		return ai.Response{}, fmt.Errorf("failed to execute http request: %w", err)
	}

	var resp ai.Response
	if err := handleResponse(httpResp, &resp); err != nil {
		return ai.Response{}, err
	}
	return resp, nil
}

// Archive implements [ai.Transport].
func (t *httpTransport) Archive(ctx context.Context, turns []ai.Turn, existingArchive string) (ai.ArchivedHistory, error) {
	reqBody, err := json.Marshal(map[string]any{
		"turns":           turns,
		"existingArchive": existingArchive,
	})
	if err != nil {
		return ai.ArchivedHistory{}, fmt.Errorf("failed to marshal archive request: %w", err)
	}

	httpReq, err := t.buildRequest(ctx, "POST", "/archive", reqBody)
	if err != nil {
		return ai.ArchivedHistory{}, err
	}

	httpResp, err := t.client.Do(httpReq)
	if err != nil {
		return ai.ArchivedHistory{}, fmt.Errorf("failed to execute http request: %w", err)
	}

	var resp ai.ArchivedHistory
	if err := handleResponse(httpResp, &resp); err != nil {
		return ai.ArchivedHistory{}, err
	}
	return resp, nil
}

// buildRequest creates an HTTP request with proper headers and authentication.
func (t *httpTransport) buildRequest(ctx context.Context, method, path string, body []byte) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, t.endpoint+path, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if t.tokenProvider != nil {
		if token := t.tokenProvider(); token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}

	return req, nil
}

// handleResponse processes an HTTP response and unmarshals it into the target.
func handleResponse(resp *http.Response, target any) error {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read http response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := ai.RetryAfterFromHeader(resp.Header.Get("Retry-After"))
			return &ai.TooManyRequestsError{
				RetryAfter: retryAfter,
				Err:        fmt.Errorf("failed to fetch with status: %s: %s", resp.Status, body),
			}
		}
		return fmt.Errorf("failed to fetch with status: %s: %s", resp.Status, body)
	}

	if err := json.Unmarshal(body, target); err != nil {
		return fmt.Errorf("failed to unmarshal response json: %w", err)
	}

	return nil
}
