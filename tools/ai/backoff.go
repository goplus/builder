package ai

import (
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
