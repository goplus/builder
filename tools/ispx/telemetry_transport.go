//go:build js && wasm

package main

import (
	"context"

	"github.com/goplus/builder/tools/ai"
	"github.com/goplus/builder/tools/ispx/internal/telemetry"
)

const (
	interactOperationName = "POST /ai-interaction/turns"
	archiveOperationName  = "POST /ai-interaction/archives"
	httpClientOperation   = "http.client"
)

// telemetryTransport wraps an ai.Transport with telemetry operations. Each
// Interact/Archive call creates an independent operation and injects the
// propagation headers into the request context. If the telemetry client is nil
// or Start fails, the underlying Transport is called directly (fail-open).
type telemetryTransport struct {
	next      ai.Transport
	telemetry *telemetry.Client
}

// newTelemetryTransport creates a Transport wrapper. A nil telemetry client is
// allowed; the wrapper becomes a passthrough.
func newTelemetryTransport(next ai.Transport, tc *telemetry.Client) ai.Transport {
	if next == nil {
		return nil
	}
	if tc == nil {
		return next
	}
	return &telemetryTransport{next: next, telemetry: tc}
}

func (t *telemetryTransport) Interact(ctx context.Context, req ai.Request) (ai.Response, error) {
	op, err := t.telemetry.Start(ctx, telemetry.StartRequest{
		Name:        interactOperationName,
		Operation:   httpClientOperation,
		Propagation: "http",
	})
	if err != nil {
		return t.next.Interact(ctx, req)
	}

	ctx = ai.WithExtraHeaders(ctx, op.PropagationHeaders())
	resp, interactErr := t.next.Interact(ctx, req)
	status := telemetry.StatusOK
	if ctx.Err() != nil {
		status = telemetry.StatusCancelled
	} else if interactErr != nil {
		status = telemetry.StatusError
	}
	op.Finish(status, nil)
	return resp, interactErr
}

func (t *telemetryTransport) Archive(ctx context.Context, turns []ai.Turn, existingArchive string) (ai.ArchivedHistory, error) {
	op, err := t.telemetry.Start(ctx, telemetry.StartRequest{
		Name:        archiveOperationName,
		Operation:   httpClientOperation,
		Propagation: "http",
	})
	if err != nil {
		return t.next.Archive(ctx, turns, existingArchive)
	}

	ctx = ai.WithExtraHeaders(ctx, op.PropagationHeaders())
	resp, archiveErr := t.next.Archive(ctx, turns, existingArchive)
	status := telemetry.StatusOK
	if ctx.Err() != nil {
		status = telemetry.StatusCancelled
	} else if archiveErr != nil {
		status = telemetry.StatusError
	}
	op.Finish(status, nil)
	return resp, archiveErr
}
