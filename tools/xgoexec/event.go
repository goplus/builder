package xgoexec

import (
	"context"
	"encoding/json"
	"sync"
)

type EventHandler func(payload json.RawMessage) error

var eventState struct {
	sync.RWMutex
	handlers   map[string]EventHandler
	runContext context.Context
}

func RegisterEventHandler(name string, handler EventHandler) {
	eventState.Lock()
	defer eventState.Unlock()
	if eventState.handlers == nil {
		eventState.handlers = make(map[string]EventHandler)
	}
	eventState.handlers[name] = handler
}
func DispatchEvent(name string, payload []byte) error {
	eventState.RLock()
	handler := eventState.handlers[name]
	eventState.RUnlock()
	if handler == nil {
		return nil
	}
	return handler(payload)
}
func CurrentRunContext() context.Context {
	eventState.RLock()
	defer eventState.RUnlock()
	if eventState.runContext == nil {
		return context.Background()
	}
	return eventState.runContext
}
func setCurrentRunContext(ctx context.Context) {
	eventState.Lock()
	defer eventState.Unlock()
	eventState.runContext = ctx
}
