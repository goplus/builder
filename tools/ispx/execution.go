package main

import (
	"go/token"
	"slices"
	"strings"
	"sync"

	"github.com/goplus/ixgo"
)

type executionLocation struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

// executionLocations adapts per-goroutine events to ordered editor snapshots.
// Watermarks retain one entry per tracked goroutine across game reruns;
// the state is released when the iframe is destroyed.
type executionLocations struct {
	mu           sync.Mutex
	lastSequence map[uint64]uint64
	locations    map[uint64][]executionLocation
	// Called under mu; must return promptly and must not re-enter report.
	onChange func([]executionLocation)
}

func newExecutionTracker(onChange func([]executionLocation)) *ixgo.ExecutionTracker {
	locations := &executionLocations{
		lastSequence: make(map[uint64]uint64),
		locations:    make(map[uint64][]executionLocation),
		onChange:     onChange,
	}
	return ixgo.NewExecutionTracker(locations.report, ixgo.ExecutionOptions{
		TrackStack: true,
		Filter: func(position token.Position) bool {
			return position.Line > 0 && strings.HasSuffix(position.Filename, ".spx")
		},
	})
}

func (t *executionLocations) report(event ixgo.ExecutionPosition) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if event.Sequence <= t.lastSequence[event.GoroutineID] {
		return
	}
	// Keep clear watermarks: in-flight callbacks may arrive after removal.
	t.lastSequence[event.GoroutineID] = event.Sequence
	if event.Clear {
		if _, ok := t.locations[event.GoroutineID]; !ok {
			return
		}
		delete(t.locations, event.GoroutineID)
	} else {
		// Keep the innermost position in each file so switching documents does
		// not lose a caller that is waiting for another file's function.
		var locations []executionLocation
		seen := make(map[string]bool)
		for _, position := range event.Stack {
			if seen[position.Filename] {
				continue
			}
			seen[position.Filename] = true
			locations = append(locations, executionLocation{File: position.Filename, Line: position.Line})
		}
		if slices.Equal(t.locations[event.GoroutineID], locations) {
			return
		}
		t.locations[event.GoroutineID] = locations
	}
	// Emit under the lock so snapshots cannot overtake each other.
	// If profiling shows a bottleneck, consider a single timer publisher that
	// coalesces snapshots and emits outside mu while preserving their order.
	locations := make([]executionLocation, 0, len(t.locations))
	for _, chain := range t.locations {
		locations = append(locations, chain...)
	}
	t.onChange(locations)
}
