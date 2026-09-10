//go:build js && wasm

package main

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/goplus/builder/tools/ai"
)

type fakeAITransport struct {
	interact func(context.Context, ai.Request) (ai.Response, error)
	archive  func(context.Context, []ai.Turn, string) (ai.ArchivedHistory, error)
}

func (t *fakeAITransport) Interact(ctx context.Context, req ai.Request) (ai.Response, error) {
	return t.interact(ctx, req)
}

func (t *fakeAITransport) Archive(
	ctx context.Context,
	turns []ai.Turn,
	existingArchive string,
) (ai.ArchivedHistory, error) {
	return t.archive(ctx, turns, existingArchive)
}

func TestTraceTransportInteractPropagatesHeadersAndFinishes(t *testing.T) {
	wantHeaders := map[string]string{"Sentry-Trace": "trace-value", "Baggage": "baggage-value"}
	var gotHeaders map[string]string
	base := &fakeAITransport{
		interact: func(ctx context.Context, _ ai.Request) (ai.Response, error) {
			gotHeaders = ai.ExtraHeadersFromContext(ctx)
			return ai.Response{Text: "done"}, nil
		},
	}
	var gotName, gotOperation, gotStatus string
	transport := newTraceTransport(base, func(name, operation string) (map[string]string, func(string)) {
		gotName, gotOperation = name, operation
		return wantHeaders, func(status string) { gotStatus = status }
	})

	resp, err := transport.Interact(context.Background(), ai.Request{})
	if err != nil {
		t.Fatalf("Interact() error = %v", err)
	}
	if resp.Text != "done" {
		t.Fatalf("Interact() response = %+v; want text done", resp)
	}
	if gotName != interactTraceName {
		t.Fatalf("trace name = %q; want %q", gotName, interactTraceName)
	}
	if gotOperation != httpClientTraceOp {
		t.Fatalf("trace operation = %q; want %q", gotOperation, httpClientTraceOp)
	}
	if !reflect.DeepEqual(gotHeaders, wantHeaders) {
		t.Fatalf("headers = %#v; want %#v", gotHeaders, wantHeaders)
	}
	if gotStatus != traceStatusOK {
		t.Fatalf("finish status = %q; want %q", gotStatus, traceStatusOK)
	}
}

func TestTraceTransportContinuesWhenHookReturnsNoOperation(t *testing.T) {
	called := false
	base := &fakeAITransport{
		interact: func(context.Context, ai.Request) (ai.Response, error) {
			called = true
			return ai.Response{Text: "done"}, nil
		},
	}
	transport := newTraceTransport(base, func(string, string) (map[string]string, func(string)) {
		return nil, nil
	})

	resp, err := transport.Interact(context.Background(), ai.Request{})
	if err != nil {
		t.Fatalf("Interact() error = %v", err)
	}
	if !called || resp.Text != "done" {
		t.Fatalf("underlying transport was not used: called = %v, response = %+v", called, resp)
	}
}

func TestNewTraceTransportWithoutHookUsesUnderlyingTransport(t *testing.T) {
	base := &fakeAITransport{}

	if got := newTraceTransport(base, nil); got != base {
		t.Fatalf("newTraceTransport() = %T; want original transport", got)
	}
}

func TestTraceTransportFinishStatus(t *testing.T) {
	tests := []struct {
		name         string
		ctx          context.Context
		transportErr error
		want         string
	}{
		{name: "success", ctx: context.Background(), want: traceStatusOK},
		{name: "error", ctx: context.Background(), transportErr: errors.New("request failed"), want: traceStatusError},
		{name: "cancelled", ctx: cancelledContext(), transportErr: context.Canceled, want: traceStatusCancelled},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base := &fakeAITransport{
				interact: func(context.Context, ai.Request) (ai.Response, error) {
					return ai.Response{}, tt.transportErr
				},
			}
			var gotStatus string
			transport := newTraceTransport(base, func(string, string) (map[string]string, func(string)) {
				return nil, func(status string) { gotStatus = status }
			})

			_, _ = transport.Interact(tt.ctx, ai.Request{})
			if gotStatus != tt.want {
				t.Fatalf("finish status = %q; want %q", gotStatus, tt.want)
			}
		})
	}
}

func TestTraceTransportArchiveUsesArchiveName(t *testing.T) {
	base := &fakeAITransport{
		archive: func(context.Context, []ai.Turn, string) (ai.ArchivedHistory, error) {
			return ai.ArchivedHistory{Content: "summary"}, nil
		},
	}
	var gotName string
	transport := newTraceTransport(base, func(name, _ string) (map[string]string, func(string)) {
		gotName = name
		return nil, func(string) {}
	})

	resp, err := transport.Archive(context.Background(), nil, "")
	if err != nil {
		t.Fatalf("Archive() error = %v", err)
	}
	if resp.Content != "summary" {
		t.Fatalf("Archive() response = %+v; want summary", resp)
	}
	if gotName != archiveTraceName {
		t.Fatalf("trace name = %q; want %q", gotName, archiveTraceName)
	}
}

func cancelledContext() context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	return ctx
}
