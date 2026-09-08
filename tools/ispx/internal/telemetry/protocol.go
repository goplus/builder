// Package telemetry provides a generic telemetry client for the iSPX JSON-RPC
// channel. It defines wire types for the telemetry/operation.start and
// telemetry/operation.finish methods without depending on any specific tracing
// backend (e.g. Sentry).
package telemetry

// JSON-RPC method names.
const (
	OperationStartMethod  = "telemetry/operation.start"
	OperationFinishMethod = "telemetry/operation.finish"
)

// StartRequest is sent as a JSON-RPC Call to create a telemetry operation.
type StartRequest struct {
	Name               string         `json:"name"`
	Operation          string         `json:"operation"`
	StartTimeUnixMilli int64          `json:"startTimeUnixMilli"`
	Attributes         map[string]any `json:"attributes,omitempty"`
	Propagation        string         `json:"propagation,omitempty"`
}

// StartResult is the JSON-RPC response for a successful operation start.
type StartResult struct {
	OperationID        string            `json:"operationId"`
	PropagationHeaders map[string]string `json:"propagationHeaders,omitempty"`
}

// FinishNotification is sent as a JSON-RPC Notification to end an operation.
type FinishNotification struct {
	OperationID      string         `json:"operationId"`
	EndTimeUnixMilli int64          `json:"endTimeUnixMilli"`
	Status           string         `json:"status"`
	Attributes       map[string]any `json:"attributes,omitempty"`
}

// Status constants for the first phase.
const (
	StatusOK        = "ok"
	StatusError     = "error"
	StatusCancelled = "cancelled"
)
