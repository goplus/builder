package ai

import (
	"context"
	"slices"
	"testing"
	"time"
)

func TestBackoffSleep(t *testing.T) {
	for _, tt := range []struct {
		name    string
		base    time.Duration
		cap     time.Duration
		attempt int
	}{
		{name: "InitialAttempt", base: 100 * time.Millisecond, cap: time.Second, attempt: 0},
		{name: "HighAttemptCapped", base: time.Minute, cap: time.Hour, attempt: 100},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got, want := backoffSleep(tt.base, tt.cap, tt.attempt) <= tt.cap, true; got != want {
				t.Errorf("got %t, want %t", got, want)
			}
		})
	}
}

func TestBackoffAttempts(t *testing.T) {
	t.Run("IteratesUpToMaxAttempts", func(t *testing.T) {
		ctx := t.Context()
		maxAttempts := 3

		got := slices.Collect(backoffAttempts(ctx, maxAttempts, 1, 1))
		if want := []int{0, 1, 2}; !slices.Equal(got, want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("StopsWhenConsumerBreaks", func(t *testing.T) {
		ctx := t.Context()
		maxAttempts := 3

		var got []int
		for attempt := range backoffAttempts(ctx, maxAttempts, 1, 1) {
			got = append(got, attempt)
			if attempt == 1 {
				break
			}
		}
		if want := []int{0, 1}; !slices.Equal(got, want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("StopsWhenContextCanceledAfterFirstAttempt", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		defer cancel()
		maxAttempts := 3

		var got []int
		for attempt := range backoffAttempts(ctx, maxAttempts, time.Second, time.Second) {
			got = append(got, attempt)
			cancel()
		}
		if want := []int{0}; !slices.Equal(got, want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("NoAttemptsWhenContextCanceled", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		cancel()
		maxAttempts := 1

		got := slices.Collect(backoffAttempts(ctx, maxAttempts, 1, 1))
		if len(got) != 0 {
			t.Errorf("got %v, want 0", got)
		}
	})

	t.Run("ZeroMaxAttempts", func(t *testing.T) {
		ctx := t.Context()
		maxAttempts := 0

		got := slices.Collect(backoffAttempts(ctx, maxAttempts, 1, 1))
		if len(got) != 0 {
			t.Errorf("got %v, want 0", got)
		}
	})
}
