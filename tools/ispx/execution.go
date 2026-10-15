package main

import (
	"sync"

	"github.com/visualfc/gid"
)

type executionLocation struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

// executionTracker tracks source locations until the outermost interpreter invocation ends.
type executionTracker struct {
	mu        sync.Mutex
	depth     map[uint64]int
	locations map[uint64]executionLocation
	onChange  func([]executionLocation)
}

func newExecutionTracker(onChange func([]executionLocation)) *executionTracker {
	return &executionTracker{
		depth:     make(map[uint64]int),
		locations: make(map[uint64]executionLocation),
		onChange:  onChange,
	}
}

func (t *executionTracker) enter() {
	id := gid.Get()
	t.mu.Lock()
	defer t.mu.Unlock()
	t.depth[id]++
}

func (t *executionTracker) report(file string, line int) {
	id := gid.Get()
	t.mu.Lock()
	defer t.mu.Unlock()
	location := executionLocation{File: file, Line: line}
	if t.locations[id] == location {
		return
	}
	t.locations[id] = location
	t.emitLocations()
}

func (t *executionTracker) leave() {
	id := gid.Get()
	t.mu.Lock()
	defer t.mu.Unlock()
	depth := t.depth[id] - 1
	if depth == 0 {
		delete(t.depth, id)
		if _, ok := t.locations[id]; ok {
			delete(t.locations, id)
			t.emitLocations()
		}
	} else {
		t.depth[id] = depth
	}
}

// Called with mu held so snapshots are emitted in the same order as updates.
func (t *executionTracker) emitLocations() {
	locations := make([]executionLocation, 0, len(t.locations))
	for _, location := range t.locations {
		locations = append(locations, location)
	}
	t.onChange(locations)
}
