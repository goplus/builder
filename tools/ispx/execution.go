package main

import (
	"sync"

	"github.com/visualfc/gid"
)

// executionTracker groups nested interpreter invocations on the same goroutine.
type executionTracker struct {
	mu    sync.Mutex
	depth map[uint64]int
	onEnd func()
}

func newExecutionTracker(onEnd func()) *executionTracker {
	return &executionTracker{depth: make(map[uint64]int), onEnd: onEnd}
}

func (t *executionTracker) enter() {
	id := gid.Get()
	t.mu.Lock()
	t.depth[id]++
	t.mu.Unlock()
}

func (t *executionTracker) leave() {
	id := gid.Get()
	t.mu.Lock()
	depth := t.depth[id] - 1
	if depth == 0 {
		delete(t.depth, id)
	} else {
		t.depth[id] = depth
	}
	t.mu.Unlock()
	if depth == 0 {
		t.onEnd()
	}
}
