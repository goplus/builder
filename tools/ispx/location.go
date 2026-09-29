package main

import (
	"sync"
	"time"
)

type locationReporter struct {
	mu       sync.Mutex
	interval time.Duration
	emit     func(string, int)
	lastEmit time.Time
	lastFile string
	lastLine int
}

func newLocationReporter(interval time.Duration, emit func(string, int)) *locationReporter {
	return &locationReporter{interval: interval, emit: emit}
}

func (r *locationReporter) report(file string, line int, now time.Time) {
	// Emit from the debug callback; a timer would write to JS/WASM stdout from another goroutine.
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.lastFile == file && r.lastLine == line || now.Sub(r.lastEmit) < r.interval {
		return
	}
	r.lastEmit = now
	r.lastFile, r.lastLine = file, line
	r.emit(file, line)
}
