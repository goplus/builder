package ai

import (
	"context"
	"maps"
	"testing"
)

func TestExtraHeadersContextCopiesOnWriteAndRead(t *testing.T) {
	headers := map[string]string{
		"X-Request-ID": "request-1",
	}
	ctx := WithExtraHeaders(t.Context(), headers)

	headers["X-Request-ID"] = "changed-input"
	got := ExtraHeadersFromContext(ctx)
	if want := map[string]string{"X-Request-ID": "request-1"}; !maps.Equal(got, want) {
		t.Fatalf("ExtraHeadersFromContext() = %v; want %v", got, want)
	}

	got["X-Request-ID"] = "changed-output"
	if gotAgain, want := ExtraHeadersFromContext(ctx), map[string]string{"X-Request-ID": "request-1"}; !maps.Equal(gotAgain, want) {
		t.Fatalf("ExtraHeadersFromContext() after mutation = %v; want %v", gotAgain, want)
	}
}

func TestExtraHeadersContextsAreIsolated(t *testing.T) {
	base := context.Background()
	first := WithExtraHeaders(base, map[string]string{"X-Request-ID": "request-1"})
	second := WithExtraHeaders(base, map[string]string{"X-Request-ID": "request-2"})

	firstHeaders := ExtraHeadersFromContext(first)
	secondHeaders := ExtraHeadersFromContext(second)
	firstHeaders["X-Request-ID"] = "changed"

	if got, want := ExtraHeadersFromContext(first)["X-Request-ID"], "request-1"; got != want {
		t.Fatalf("first request header = %q; want %q", got, want)
	}
	if got, want := secondHeaders["X-Request-ID"], "request-2"; got != want {
		t.Fatalf("second request header = %q; want %q", got, want)
	}
}

func TestExtraHeadersConcurrentReadsAreIsolated(t *testing.T) {
	ctx := WithExtraHeaders(t.Context(), map[string]string{"X-Request-ID": "request-1"})
	const readers = 32
	results := make(chan string, readers)

	for range readers {
		go func() {
			headers := ExtraHeadersFromContext(ctx)
			headers["X-Request-ID"] = "changed"
			results <- ExtraHeadersFromContext(ctx)["X-Request-ID"]
		}()
	}
	for range readers {
		if got, want := <-results, "request-1"; got != want {
			t.Fatalf("concurrent request header = %q; want %q", got, want)
		}
	}
}

func TestExtraHeadersFromEmptyContext(t *testing.T) {
	if got := ExtraHeadersFromContext(context.Background()); got != nil {
		t.Fatalf("ExtraHeadersFromContext(background) = %v; want nil", got)
	}
	if got := ExtraHeadersFromContext(nil); got != nil {
		t.Fatalf("ExtraHeadersFromContext(nil) = %v; want nil", got)
	}
}
