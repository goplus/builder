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

// MockRoundTripper is a mock implementation of the http.RoundTripper interface for testing
type MockRoundTripper struct {
	RoundTripFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.RoundTripFunc(req)
}

func TestTraceableTransport_RoundTrip(t *testing.T) {
	// Initialize Sentry for testing
	err := sentry.Init(sentry.ClientOptions{
		Transport: sentry.NewHTTPSyncTransport(),
		// Using fake DSN for testing
		Dsn: "https://public@example.com/1",
	})
	require.NoError(t, err)
	defer sentry.Flush(2 * 1000)

	// Setup mock transport
	mockTransport := &MockRoundTripper{
		RoundTripFunc: func(req *http.Request) (*http.Response, error) {
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

	// Create traceable transport with default config
	transport := New(mockTransport)

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
	resp, err := transport.RoundTrip(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Finish the transaction
	tx.Finish()

	// The test passes if no panic occurs and the mock transport was called
	// Additional verification would require capturing the Sentry events, which is complex in unit tests
}

func TestTraceableTransport_Configuration(t *testing.T) {
	// Test with custom configuration
	config := Config{
		RecordHeaders:    true,
		RecordBody:       true,
		SensitiveHeaders: []string{"X-Custom-Secret"},
	}

	mockTransport := &MockRoundTripper{
		RoundTripFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: 200,
				Status:     "200 OK",
				Body:       io.NopCloser(bytes.NewBufferString(`{"success": true}`)),
			}, nil
		},
	}

	transport := New(mockTransport, config)

	// Verify configuration was set correctly
	assert.True(t, transport.Config.RecordHeaders)
	assert.True(t, transport.Config.RecordBody)
	assert.Contains(t, transport.Config.SensitiveHeaders, "X-Custom-Secret")
}

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	// Verify default configuration
	assert.True(t, config.RecordHeaders)
	assert.False(t, config.RecordBody) // Should be disabled by default
	assert.Contains(t, config.SensitiveHeaders, "Authorization")
	assert.Contains(t, config.SensitiveHeaders, "Cookie")
}

func TestNewClient(t *testing.T) {
	// Test NewClient helper function
	mockTransport := &MockRoundTripper{
		RoundTripFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: 200,
				Status:     "200 OK",
				Body:       io.NopCloser(bytes.NewBufferString(`{"success": true}`)),
			}, nil
		},
	}

	config := Config{
		RecordHeaders: true,
		RecordBody:    true,
	}

	// Create client using the helper function
	client := NewClient(mockTransport, config)

	// Verify it's a proper http.Client
	assert.IsType(t, &http.Client{}, client)

	// Verify the transport is our TraceableTransport
	assert.IsType(t, &TraceableTransport{}, client.Transport)

	// Verify configuration
	traceableTransport := client.Transport.(*TraceableTransport)
	assert.True(t, traceableTransport.Config.RecordHeaders)
	assert.True(t, traceableTransport.Config.RecordBody)
}
