package ai

import (
	"context"
	"errors"
	"reflect"
	"testing"
)

type mockTransport struct {
	InteractFunc func(ctx context.Context, req Request) (Response, error)
	ArchiveFunc  func(ctx context.Context, turns []Turn, existingArchive string) (ArchivedHistory, error)
}

func (m *mockTransport) Interact(ctx context.Context, req Request) (Response, error) {
	if m.InteractFunc != nil {
		return m.InteractFunc(ctx, req)
	}
	return Response{Text: "mock response"}, nil
}

func (m *mockTransport) Archive(ctx context.Context, turns []Turn, existingArchive string) (ArchivedHistory, error) {
	if m.ArchiveFunc != nil {
		return m.ArchiveFunc(ctx, turns, existingArchive)
	}
	return ArchivedHistory{Content: "archived"}, nil
}

func TestDefaultTransport(t *testing.T) {
	originalTransport := DefaultTransport()
	t.Cleanup(func() { SetDefaultTransport(originalTransport) })
	SetDefaultTransport(nil)

	initialTransport := DefaultTransport()
	if _, ok := initialTransport.(*notSetTransport); !ok {
		t.Errorf("got %T, want *notSetTransport", initialTransport)
	}

	customTransport := &mockTransport{}
	SetDefaultTransport(customTransport)
	if got, want := DefaultTransport(), customTransport; got != want {
		t.Errorf("got %p, want %p", got, want)
	}

	SetDefaultTransport(nil)
	resetTransport := DefaultTransport()
	if _, ok := resetTransport.(*notSetTransport); !ok {
		t.Errorf("got %T, want *notSetTransport", resetTransport)
	}
}

func TestNotSetTransportInteract(t *testing.T) {
	transport := &notSetTransport{}
	req := Request{Content: "test"}
	ctx := t.Context()

	resp, err := transport.Interact(ctx, req)
	if got, want := err, ErrTransportNotSet; !errors.Is(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
	if got, want := resp, (Response{}); !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}
}

func TestNotSetTransportArchive(t *testing.T) {
	transport := &notSetTransport{}
	turns := []Turn{{RequestContent: "test"}}
	ctx := t.Context()

	archived, err := transport.Archive(ctx, turns, "")
	if got, want := err, ErrTransportNotSet; !errors.Is(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
	if got, want := archived, (ArchivedHistory{}); !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}
}
