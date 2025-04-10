package ai

import (
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
