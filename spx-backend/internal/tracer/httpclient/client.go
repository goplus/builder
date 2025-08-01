package httpclient

import (
	"fmt"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
)

// HTTPClient defines the interface for an HTTP client
// This follows Go's standard naming convention with HTTP capitalized
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// TraceableClient wraps an HTTPClient with Sentry tracing capabilities
type TraceableClient struct {
	// BaseClient is the underlying HTTP client
	BaseClient HTTPClient
	// Config contains optional configuration options
	Config Config
}

// Config defines configuration options for TraceableClient
type Config struct {
	// RecordHeaders determines whether to record HTTP headers
	RecordHeaders bool
	// RecordBody determines whether to record request/response bodies
	RecordBody bool
	// SensitiveHeaders is a list of header names that should be redacted if RecordHeaders is true
	SensitiveHeaders []string
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		RecordHeaders: true,
		RecordBody:    false, // Disabled by default to avoid sensitive information leakage
		SensitiveHeaders: []string{
			"Authorization",
			"Cookie",
		},
	}
}

// New creates a new TraceableClient
func New(baseClient HTTPClient, config ...Config) *TraceableClient {
	if baseClient == nil {
		baseClient = &http.Client{}
	}

	cfg := DefaultConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return &TraceableClient{
		BaseClient: baseClient,
		Config:     cfg,
	}
}

// Do implements the HTTPClient interface and adds tracing
func (c *TraceableClient) Do(req *http.Request) (*http.Response, error) {
	// Get or create a Sentry transaction from context
	var span *sentry.Span
	tx := sentry.TransactionFromContext(req.Context())

	if tx == nil {
		// If there's no parent transaction, create a new one
		tx = sentry.StartTransaction(
			req.Context(),
			"http.request",
			sentry.WithOpName("http.client"),
			sentry.WithTransactionSource(sentry.SourceURL),
			sentry.WithDescription(req.Method+" "+req.URL.String()),
		)
		span = tx
		defer tx.Finish()
	} else {
		// If there's already a parent transaction, create a child span
		span = tx.StartChild("http.client")
		defer span.Finish()
	}

	// Record start time
	startTime := time.Now()
	span.StartTime = startTime

	// Set span attributes
	span.SetTag("http.method", req.Method)
	span.SetTag("http.url", req.URL.String())

	// Record headers if configured
	if c.Config.RecordHeaders {
		// Create a copy of headers to avoid modifying the original request
		headers := make(map[string]string)
		for k, v := range req.Header {
			// Check if this is a sensitive header that should be redacted
			isSensitive := false
			for _, sh := range c.Config.SensitiveHeaders {
				if http.CanonicalHeaderKey(k) == http.CanonicalHeaderKey(sh) {
					isSensitive = true
					break
				}
			}

			if isSensitive {
				headers[k] = "[REDACTED]"
			} else if len(v) > 0 {
				headers[k] = v[0]
			}
		}
		span.SetData("http.request.headers", headers)
	}

	// Record request body if configured
	if c.Config.RecordBody && req.Body != nil {
		// Wrap the request body to capture its content
		requestBodyBuf := wrapRequestBody(req)
		// We don't need to take any further action here since the wrapper will
		// automatically capture the request body as it's read

		// Add a deferred function to record the request body after the Do method completes
		defer func() {
			if requestBodyBuf.Len() > 0 {
				// Truncate if too large to avoid performance issues
				const maxBodySize = 1024 // 1KB max
				requestBody := requestBodyBuf.String()
				if len(requestBody) > maxBodySize {
					requestBody = requestBody[:maxBodySize] + "... [truncated]"
				}
				span.SetData("http.request.body", requestBody)
			}
		}()
	}

	// Execute the request using the base client
	resp, err := c.BaseClient.Do(req)

	// Record duration
	duration := time.Since(startTime)
	span.SetData("http.duration_ms", float64(duration.Nanoseconds())/1e6)

	if err != nil {
		// Record error details
		span.Status = sentry.SpanStatusInternalError
		span.SetData("http.error", err.Error())
		return resp, err
	}

	// Record response details
	span.SetTag("http.status_code", fmt.Sprintf("%d", resp.StatusCode))
	span.SetData("http.response.status_text", resp.Status)

	// Determine span status based on HTTP status code
	if resp.StatusCode >= 500 {
		span.Status = sentry.SpanStatusInternalError
	} else if resp.StatusCode >= 400 {
		span.Status = sentry.SpanStatusFailedPrecondition
	} else {
		span.Status = sentry.SpanStatusOK
	}

	// Record response headers if configured
	if c.Config.RecordHeaders && resp != nil {
		// Create a copy of headers to avoid modifying the original response
		headers := make(map[string]string)
		for k, v := range resp.Header {
			// Check if this is a sensitive header that should be redacted
			isSensitive := false
			for _, sh := range c.Config.SensitiveHeaders {
				if http.CanonicalHeaderKey(k) == http.CanonicalHeaderKey(sh) {
					isSensitive = true
					break
				}
			}

			if isSensitive {
				headers[k] = "[REDACTED]"
			} else if len(v) > 0 {
				headers[k] = v[0]
			}
		}
		span.SetData("http.response.headers", headers)
	}

	// Record response body if configured
	if c.Config.RecordBody && resp != nil && resp.Body != nil {
		// Wrap the response body to capture its content
		responseBuf := wrapResponseBody(resp)

		// We'll read the body content after the request has been fully processed
		defer func() {
			if responseBuf.Len() > 0 {
				// Truncate if too large to avoid performance issues
				const maxBodySize = 1024 // 1KB max
				responseBody := responseBuf.String()
				if len(responseBody) > maxBodySize {
					responseBody = responseBody[:maxBodySize] + "... [truncated]"
				}
				span.SetData("http.response.body", responseBody)
			}
		}()
	}

	return resp, nil
}
