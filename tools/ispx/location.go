package main

import (
	"sync"
	"time"
)

type locationReporter struct {
	mu       sync.Mutex
	interval time.Duration
	emit     func(string, int)
	file     string
	line     int
	lastEmit time.Time
	lastFile string
	lastLine int
	pending  *time.Timer
}

func newLocationReporter(interval time.Duration, emit func(string, int)) *locationReporter {
	return &locationReporter{interval: interval, emit: emit}
}

func (r *locationReporter) report(file string, line int, now time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.file == file && r.line == line {
		return
	}
	r.file, r.line = file, line
	if now.Sub(r.lastEmit) >= r.interval {
		if r.pending != nil {
			r.pending.Stop()
			r.pending = nil
		}
		r.flush(now)
		return
	}
	if r.pending == nil {
		r.pending = time.AfterFunc(r.interval-now.Sub(r.lastEmit), func() {
			r.mu.Lock()
			defer r.mu.Unlock()
			r.pending = nil
			r.flush(time.Now())
		})
	}
}

func (r *locationReporter) flush(now time.Time) {
	if r.file == r.lastFile && r.line == r.lastLine {
		return
	}
	r.lastEmit = now
	r.lastFile, r.lastLine = r.file, r.line
	r.emit(r.file, r.line)
}
