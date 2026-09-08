package telemetry

import (
	"maps"
	"sync"
	"time"
)

// Operation is a started telemetry operation. It holds the propagation headers
// returned by the Web adapter and provides a one-shot Finish method.
type Operation struct {
	id      string
	headers map[string]string
	client  *Client

	once sync.Once
}

// PropagationHeaders returns the opaque HTTP headers (e.g. Sentry-Trace,
// Baggage) that should be injected into the outgoing HTTP request.
func (o *Operation) PropagationHeaders() map[string]string {
	if o == nil {
		return nil
	}
	return maps.Clone(o.headers)
}

// Finish ends the operation. It is safe to call more than once; only the first
// call takes effect.
func (o *Operation) Finish(status string, attributes map[string]any) {
	if o == nil {
		return
	}
	o.once.Do(func() {
		_ = o.client.rpc.Notify(OperationFinishMethod, FinishNotification{
			OperationID:      o.id,
			EndTimeUnixMilli: time.Now().UnixMilli(),
			Status:           status,
			Attributes:       maps.Clone(attributes),
		})
	})
}
