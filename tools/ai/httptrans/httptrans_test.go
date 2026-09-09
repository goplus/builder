package httptrans_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"testing/iotest"
	"time"

	"github.com/goplus/builder/tools/ai"
	"github.com/goplus/builder/tools/ai/httptrans"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestHTTPTransportInteract(t *testing.T) {
	newTransport := func(t *testing.T, statusCode int, header http.Header, body io.ReadCloser) ai.Transport {
		t.Helper()
		client := &http.Client{
			Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
				if got, want := request.URL.Path, "/turns"; got != want {
					t.Errorf("got path %q, want %q", got, want)
				}
				return &http.Response{
					StatusCode: statusCode,
					Status:     fmt.Sprintf("%d %s", statusCode, http.StatusText(statusCode)),
					Header:     header,
					Body:       body,
				}, nil
			}),
		}
		return httptrans.New(
			httptrans.WithHTTPClient(client),
			httptrans.WithEndpoint("https://example.com"),
		)
	}

	t.Run("PreservesJSONNumbers", func(t *testing.T) {
		transport := newTransport(t, http.StatusOK, nil,
			io.NopCloser(strings.NewReader(`{"commandArgs":{"Value":9007199254740993}}`)))
		response, err := transport.Interact(t.Context(), ai.Request{})
		if err != nil {
			t.Fatalf("unexpected error %v", err)
		}

		value, ok := response.CommandArgs["Value"].(json.Number)
		if !ok {
			t.Fatalf("got value type %T, want json.Number", response.CommandArgs["Value"])
		}
		if got, want := value.String(), "9007199254740993"; got != want {
			t.Errorf("got %q, want %q", got, want)
		}
	})

	t.Run("RejectsTrailingJSON", func(t *testing.T) {
		transport := newTransport(t, http.StatusOK, nil, io.NopCloser(strings.NewReader(`{}{}`)))
		_, err := transport.Interact(t.Context(), ai.Request{})
		if err == nil || !strings.Contains(err.Error(), "unexpected trailing data") {
			t.Errorf("got error %v, want error containing %q", err, "unexpected trailing data")
		}
	})

	t.Run("ReturnsForbiddenWithRetryMetadata", func(t *testing.T) {
		transport := newTransport(t, http.StatusForbidden, http.Header{"Retry-After": []string{"3600"}},
			io.NopCloser(strings.NewReader(`{"code":40301,"msg":"quota exceeded"}`)))

		_, err := transport.Interact(t.Context(), ai.Request{})
		var clientErr *ai.ClientError
		if !errors.As(err, &clientErr) {
			t.Fatalf("got error %v, want *ai.ClientError", err)
		}
		if got, want := clientErr.StatusCode, http.StatusForbidden; got != want {
			t.Errorf("got status code %d, want %d", got, want)
		}
		if got, want := clientErr.RetryAfter, time.Hour; got != want {
			t.Errorf("got retry after %v, want %v", got, want)
		}
		var tooManyRequestsErr *ai.TooManyRequestsError
		if errors.As(err, &tooManyRequestsErr) {
			t.Errorf("got error %v, do not want *ai.TooManyRequestsError", err)
		}
	})

	t.Run("ClassifiesServerErrorAsRetryable", func(t *testing.T) {
		transport := newTransport(t, http.StatusServiceUnavailable, nil,
			io.NopCloser(strings.NewReader(`{"code":50300,"msg":"unavailable"}`)))

		_, err := transport.Interact(t.Context(), ai.Request{})
		var retryableErr *ai.RetryableError
		if !errors.As(err, &retryableErr) {
			t.Errorf("got error %v, want *ai.RetryableError", err)
		}
	})

	t.Run("PreservesRateLimitClassificationOnBodyReadError", func(t *testing.T) {
		readErr := errors.New("truncated response body")
		transport := newTransport(t, http.StatusTooManyRequests, http.Header{"Retry-After": []string{"60"}},
			io.NopCloser(iotest.ErrReader(readErr)))

		_, err := transport.Interact(t.Context(), ai.Request{})
		var tooManyRequestsErr *ai.TooManyRequestsError
		if !errors.As(err, &tooManyRequestsErr) {
			t.Fatalf("got error %v, want *ai.TooManyRequestsError", err)
		}
		if got, want := tooManyRequestsErr.RetryAfter, time.Minute; got != want {
			t.Errorf("got retry after %v, want %v", got, want)
		}
		if !errors.Is(err, readErr) {
			t.Errorf("got error %v, want error wrapping %v", err, readErr)
		}
	})

	t.Run("PreservesClientClassificationOnBodyReadError", func(t *testing.T) {
		readErr := errors.New("truncated response body")
		transport := newTransport(t, http.StatusForbidden, http.Header{"Retry-After": []string{"3600"}},
			io.NopCloser(iotest.ErrReader(readErr)))

		_, err := transport.Interact(t.Context(), ai.Request{})
		var clientErr *ai.ClientError
		if !errors.As(err, &clientErr) {
			t.Fatalf("got error %v, want *ai.ClientError", err)
		}
		if got, want := clientErr.StatusCode, http.StatusForbidden; got != want {
			t.Errorf("got status code %d, want %d", got, want)
		}
		if got, want := clientErr.RetryAfter, time.Hour; got != want {
			t.Errorf("got retry after %v, want %v", got, want)
		}
		if !errors.Is(err, readErr) {
			t.Errorf("got error %v, want error wrapping %v", err, readErr)
		}
	})

	t.Run("PreservesRetryableClassificationOnBodyReadError", func(t *testing.T) {
		readErr := errors.New("truncated response body")
		transport := newTransport(t, http.StatusServiceUnavailable, nil,
			io.NopCloser(iotest.ErrReader(readErr)))

		_, err := transport.Interact(t.Context(), ai.Request{})
		var retryableErr *ai.RetryableError
		if !errors.As(err, &retryableErr) {
			t.Fatalf("got error %v, want *ai.RetryableError", err)
		}
		if !errors.Is(err, readErr) {
			t.Errorf("got error %v, want error wrapping %v", err, readErr)
		}
	})
}
