package httpclient

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/getsentry/sentry-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockHTTPClient is a mock implementation of the HTTPClient interface for testing
type MockHTTPClient struct {
	DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	return m.DoFunc(req)
}

func TestTraceableClient_Do(t *testing.T) {
	// Initialize Sentry for testing
	err := sentry.Init(sentry.ClientOptions{
		Transport: sentry.NewHTTPSyncTransport(),
		// Using fake DSN for testing
		Dsn: "https://public@example.com/1",
	})
	require.NoError(t, err)
	defer sentry.Flush(2 * 1000)

	// Setup mock client
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: 200,
				Status:     "200 OK",
				Header: http.Header{
					"Content-Type":  []string{"application/json"},
					"Authorization": []string{"Bearer token123"},
				},
				Body: io.NopCloser(bytes.NewBufferString(`{"success": true}`)),
			}, nil
		},
	}

	// Create traceable client with default config
	client := New(mockClient)

	// Create a request with a parent transaction
	ctx := context.Background()
	hub := sentry.CurrentHub().Clone()
	ctx = sentry.SetHubOnContext(ctx, hub)
	tx := sentry.StartTransaction(ctx, "test.transaction")

	req, err := http.NewRequestWithContext(ctx, "GET", "https://example.com/api", nil)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer secret-token")

	// Execute request
	resp, err := client.Do(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Finish the transaction
	tx.Finish()

	// The test passes if no panic occurs and the mock client was called
	// Additional verification would require capturing the Sentry events, which is complex in unit tests
}

func TestTraceableClient_Configuration(t *testing.T) {
	// Test with custom configuration
	config := Config{
		RecordHeaders:    true,
		RecordBody:       true,
		SensitiveHeaders: []string{"X-Custom-Secret"},
	}

	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: 200,
				Status:     "200 OK",
				Body:       io.NopCloser(bytes.NewBufferString(`{"success": true}`)),
			}, nil
		},
	}

	client := New(mockClient, config)

	// Verify configuration was set correctly
	assert.True(t, client.Config.RecordHeaders)
	assert.True(t, client.Config.RecordBody)
	assert.Contains(t, client.Config.SensitiveHeaders, "X-Custom-Secret")
}

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	// Verify default configuration
	assert.True(t, config.RecordHeaders)
	assert.False(t, config.RecordBody) // Should be disabled by default
	assert.Contains(t, config.SensitiveHeaders, "Authorization")
	assert.Contains(t, config.SensitiveHeaders, "Cookie")
}
