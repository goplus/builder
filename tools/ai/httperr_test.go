package ai

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestErrorFromHTTPResponseQuotaExceeded(t *testing.T) {
	err := ErrorFromHTTPResponse(403, 0, `{"code":40301,"msg":"Quota exceeded"}`, errors.New("forbidden"))
	if !isQuotaExceeded(err) {
		t.Fatalf("403/40301 should be quota, got %T %v", err, err)
	}
	var tmr *TooManyRequestsError
	if errors.As(err, &tmr) {
		t.Fatal("quota must not be TooManyRequestsError")
	}
}

func TestErrorFromHTTPResponseOther403IsNotQuota(t *testing.T) {
	err := ErrorFromHTTPResponse(403, 0, `{"code":40300,"msg":"Forbidden"}`, errors.New("forbidden"))
	if isQuotaExceeded(err) {
		t.Fatal("403/40300 must not be quota")
	}
	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("got %T, want *HTTPError", err)
	}
}

func TestErrorFromHTTPResponseEmpty403IsNotQuota(t *testing.T) {
	err := ErrorFromHTTPResponse(403, 0, "nope", errors.New("forbidden"))
	if isQuotaExceeded(err) {
		t.Fatal("403 without code 40301 must not be quota")
	}
}

func TestErrorFromHTTPResponse429(t *testing.T) {
	err := ErrorFromHTTPResponse(429, 2*time.Second, `{"code":42901,"msg":"Too many requests"}`, errors.New("rate limited"))
	if isQuotaExceeded(err) {
		t.Fatal("429 must not be quota")
	}
	var tmr *TooManyRequestsError
	if !errors.As(err, &tmr) {
		t.Fatalf("got %T, want *TooManyRequestsError", err)
	}
	if tmr.RetryAfter != 2*time.Second {
		t.Fatalf("RetryAfter = %s", tmr.RetryAfter)
	}
}

func TestAnnotateTransportErrorTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
	defer cancel()
	<-ctx.Done()

	err := AnnotateTransportError(ctx, errors.New("promise rejected: AbortError"))
	if !isTransportTimeout(err) {
		t.Fatalf("got %T %v, want TimeoutError", err, err)
	}
}

func TestAnnotateTransportErrorCanceledIsNotTimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	err := AnnotateTransportError(ctx, errors.New("promise rejected: AbortError"))
	if isTransportTimeout(err) {
		t.Fatal("canceled context must not become TimeoutError")
	}
}

func TestAnnotateTransportErrorPreservesQuota(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
	defer cancel()
	<-ctx.Done()
	quotaErr := &QuotaExceededError{Err: errors.New("quota exceeded")}
	if got := AnnotateTransportError(ctx, quotaErr); !isQuotaExceeded(got) {
		t.Fatalf("quota must not be rewritten as timeout, got %T", got)
	}
}

func TestAnnotateTransportErrorWrapsHTTPErrorAsTimeout(t *testing.T) {
	httpErr := ErrorFromHTTPResponse(500, 0, `{"category":"upstream_failure","reason":"provider_error","request_id":"abc"}`, errors.New("upstream"))
	ctx, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
	defer cancel()
	<-ctx.Done()
	err := AnnotateTransportError(ctx, httpErr)
	if !isTransportTimeout(err) {
		t.Fatalf("got %T", err)
	}
}
