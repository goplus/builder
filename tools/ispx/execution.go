package main

import (
	"go/token"
	"strings"
	"sync"

	"github.com/goplus/ixgo"
)

type executionLocation struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

// executionLocations adapts per-goroutine events to ordered editor snapshots.
type executionLocations struct {
	mu           sync.Mutex
	lastSequence map[uint64]uint64
	locations    map[uint64]executionLocation
	onChange     func([]executionLocation)
}

func newExecutionTracker(onChange func([]executionLocation)) *ixgo.ExecutionTracker {
	locations := &executionLocations{
		lastSequence: make(map[uint64]uint64),
		locations:    make(map[uint64]executionLocation),
		onChange:     onChange,
	}
	return ixgo.NewExecutionTracker(locations.report, ixgo.ExecutionOptions{
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
		location := executionLocation{File: event.Position.Filename, Line: event.Position.Line}
		if t.locations[event.GoroutineID] == location {
			return
		}
		t.locations[event.GoroutineID] = location
	}
	// Emit under the lock so snapshots cannot overtake each other.
	locations := make([]executionLocation, 0, len(t.locations))
	for _, location := range t.locations {
		locations = append(locations, location)
	}
	t.onChange(locations)
}
