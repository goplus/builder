package ai

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"
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

func TestRateLimitError(t *testing.T) {
	baseErr := errors.New("too many requests")
	var err error = &RateLimitError{
		RetryAfter: 5 * time.Second,
		Err:        baseErr,
	}

	var rateErr *RateLimitError
	if got, want := errors.As(err, &rateErr), true; got != want {
		t.Fatalf("got %t, want %t", got, want)
	}
	if got, want := rateErr.RetryAfter, 5*time.Second; got != want {
		t.Errorf("got %v, want %v", got, want)
	}
	if got, want := errors.Is(rateErr, baseErr), true; got != want {
		t.Errorf("got %t, want %t", got, want)
	}
}

func TestRetryAfterFromHeader(t *testing.T) {
	t.Run("SecondsValue", func(t *testing.T) {
		got := RetryAfterFromHeader("42")
		want := 42 * time.Second
		if got != want {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("DurationValue", func(t *testing.T) {
		got := RetryAfterFromHeader("3s")
		want := 3 * time.Second
		if got != want {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("InvalidValue", func(t *testing.T) {
		got := RetryAfterFromHeader("abc")
		if got != 0 {
			t.Errorf("got %v, want 0", got)
		}
	})
}

func TestRateLimitGate(t *testing.T) {
	t.Run("ObserveSetsNextAllowed", func(t *testing.T) {
		var rateGate rateLimitGate
		start := time.Now()
		rateGate.Observe(&RateLimitError{RetryAfter: 25 * time.Millisecond})

		expectedMin := start.Add(25 * time.Millisecond)
		if rateGate.nextAllowed.Before(expectedMin) {
			t.Errorf("nextAllowed %v before expected minimum %v", rateGate.nextAllowed, expectedMin)
		}
	})

	t.Run("ObserveKeepsLaterDeadline", func(t *testing.T) {
		initial := time.Now().Add(200 * time.Millisecond)
		rateGate := rateLimitGate{nextAllowed: initial}

		rateGate.Observe(&RateLimitError{RetryAfter: 10 * time.Millisecond})
		if rateGate.nextAllowed != initial {
			t.Errorf("nextAllowed %v changed from %v", rateGate.nextAllowed, initial)
		}
	})

	t.Run("ObserveIgnoresNonRateErrors", func(t *testing.T) {
		var rateGate rateLimitGate
		rateGate.Observe(errors.New("other"))
		if !rateGate.nextAllowed.IsZero() {
			t.Errorf("nextAllowed %v, want zero time", rateGate.nextAllowed)
		}
	})

	t.Run("WaitBlocksUntilNextAllowed", func(t *testing.T) {
		delay := 30 * time.Millisecond
		rateGate := rateLimitGate{nextAllowed: time.Now().Add(delay)}

		start := time.Now()
		rateGate.Wait()
		if elapsed := time.Since(start); elapsed < delay-5*time.Millisecond {
			t.Errorf("elapsed %v shorter than expected %v", elapsed, delay)
		}
	})

	t.Run("WaitReturnsImmediatelyWhenAllowed", func(t *testing.T) {
		var rateGate rateLimitGate

		start := time.Now()
		rateGate.Wait()
		if elapsed := time.Since(start); elapsed > 2*time.Millisecond {
			t.Errorf("elapsed %v longer than expected immediate return", elapsed)
		}
	})
}
