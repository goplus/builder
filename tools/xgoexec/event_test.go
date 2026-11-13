package xgoexec

import "testing"

func TestDispatchEventWithoutHandler(t *testing.T) {
	eventState.Lock()
	previousHandlers := eventState.handlers
	eventState.handlers = nil
	eventState.Unlock()
	t.Cleanup(func() {
		eventState.Lock()
		eventState.handlers = previousHandlers
		eventState.Unlock()
	})

	if err := DispatchEvent("unhandled", nil); err != nil {
		t.Fatalf("DispatchEvent() error = %v, want nil", err)
	}
}
