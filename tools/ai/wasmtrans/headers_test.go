package wasmtrans

import (
	"reflect"
	"testing"
)

func TestMergeExtraHeaders(t *testing.T) {
	base := map[string]any{
		"Content-Type": "application/json",
		"X-Request-ID": "base-request",
	}
	extra := map[string]string{
		"X-Correlation-ID": "correlation-1",
		"x-request-id":     "extra-request",
	}

	got := mergeExtraHeaders(base, extra)
	want := map[string]any{
		"Content-Type":     "application/json",
		"X-Request-ID":     "extra-request",
		"X-Correlation-ID": "correlation-1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mergeExtraHeaders() = %v; want %v", got, want)
	}
	if got, want := base["X-Request-ID"], "base-request"; got != want {
		t.Fatalf("base X-Request-ID = %q; want %q", got, want)
	}
}

func TestMergeExtraHeadersProtectsTransportHeadersCaseInsensitively(t *testing.T) {
	base := map[string]any{
		"Authorization": "Bearer original",
		"Content-Type":  "application/json",
	}
	extra := map[string]string{
		"AUTHORIZATION":       "Bearer replacement",
		"content-type":        "text/plain",
		"Content-Length":      "1",
		"Cookie":              "session=replacement",
		"HOST":                "replacement.example.com",
		"Origin":              "https://replacement.example.com",
		"Proxy-Authorization": "proxy replacement",
		"Referer":             "https://replacement.example.com/page",
	}

	got := mergeExtraHeaders(base, extra)
	if !reflect.DeepEqual(got, base) {
		t.Fatalf("mergeExtraHeaders() = %v; want protected base %v", got, base)
	}
}
