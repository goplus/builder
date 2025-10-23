package ai

import (
	"context"
	"iter"
	"math"
	"math/rand/v2"
	"time"
)

// backoffSleep computes the exponential backoff sleep duration based on the
// algorithm described in https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/.
func backoffSleep(base, cap time.Duration, attempt int) time.Duration {
	var pow time.Duration
	if attempt < 63 {
		pow = 1 << attempt
	} else {
		pow = math.MaxInt64
	}

	sleep := base * pow
	if sleep > cap || sleep/pow != base {
		sleep = cap
	}
	sleep = rand.N(sleep)
	return sleep
}

// backoffAttempts returns an iterator that yields zero-based attempts while
// enforcing exponential backoff between successive attempts.
func backoffAttempts(ctx context.Context, maxAttempts int, base, cap time.Duration) iter.Seq[int] {
	return func(yield func(int) bool) {
		for attempt := range maxAttempts {
			select {
			case <-ctx.Done():
				return
			default:
			}

			if !yield(attempt) {
				return
			}

			if attempt+1 < maxAttempts {
				select {
				case <-time.After(backoffSleep(base, cap, attempt)):
				case <-ctx.Done():
					return
				}
			}
		}
	}
}
