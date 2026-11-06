package xgoexec

import (
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
)

type capabilityCallResponse struct {
	result []byte
	err    error
}

var nextCapabilityCallID atomic.Uint32
var pendingCapabilityCalls sync.Map

// CallCapability blocks the XGo program until the host resolves the call.
func CallCapability(name string, request, result any) error {
	requestJSON, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("encode capability %q request: %w", name, err)
	}
	id := nextCapabilityCallID.Add(1)
	response := make(chan capabilityCallResponse, 1)
	pendingCapabilityCalls.Store(id, response)
	if err := dispatchCapabilityCall(id, name, string(requestJSON)); err != nil {
		pendingCapabilityCalls.Delete(id)
		return err
	}
	value := <-response
	if value.err != nil {
		return value.err
	}
	if result == nil {
		return nil
	}
	if err := json.Unmarshal(value.result, result); err != nil {
		return fmt.Errorf("decode capability %q result: %w", name, err)
	}
	return nil
}

func ResolveCapabilityCall(id uint32, result, errorMessage string) {
	value, ok := pendingCapabilityCalls.LoadAndDelete(id)
	if !ok {
		return
	}
	response := capabilityCallResponse{result: []byte(result)}
	if errorMessage != "" {
		response.err = fmt.Errorf("capability failed: %s", errorMessage)
	}
	value.(chan capabilityCallResponse) <- response
}
