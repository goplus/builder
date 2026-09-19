//go:build js && wasm

package main

import (
	"context"

	"github.com/goplus/builder/tools/ai"
)

const (
	interactTraceName = "POST /ai-interaction/turns"
	archiveTraceName  = "POST /ai-interaction/archives"
	httpClientTraceOp = "http.client"

	traceStatusOK        = "ok"
	traceStatusError     = "error"
	traceStatusCancelled = "cancelled"
)

type traceTransport struct {
	next  ai.Transport
	start traceStartFunc
}

func newTraceTransport(next ai.Transport, start traceStartFunc) ai.Transport {
	if next == nil {
		return nil
	}
	if start == nil {
		return next
	}
	return &traceTransport{next: next, start: start}
}

func (t *traceTransport) Interact(
	ctx context.Context,
	req ai.Request,
) (resp ai.Response, err error) {
	headers, finish := t.start(interactTraceName, httpClientTraceOp)

	status := traceStatusError
	if finish != nil {
		defer func() {
			finish(status)
		}()
	}

	if len(headers) > 0 {
		ctx = ai.WithExtraHeaders(ctx, headers)
	}

	resp, err = t.next.Interact(ctx, req)
	status = traceStatus(ctx, err)
	return resp, err
}

func (t *traceTransport) Archive(
	ctx context.Context,
	turns []ai.Turn,
	existingArchive string,
) (resp ai.ArchivedHistory, err error) {
	headers, finish := t.start(archiveTraceName, httpClientTraceOp)

	status := traceStatusError
	if finish != nil {
		defer func() {
			finish(status)
		}()
	}

	if len(headers) > 0 {
		ctx = ai.WithExtraHeaders(ctx, headers)
	}

	resp, err = t.next.Archive(ctx, turns, existingArchive)
	status = traceStatus(ctx, err)
	return resp, err
}

func traceStatus(ctx context.Context, err error) string {
	if ctx != nil && ctx.Err() != nil {
		return traceStatusCancelled
	}
	if err != nil {
		return traceStatusError
	}
	return traceStatusOK
}
