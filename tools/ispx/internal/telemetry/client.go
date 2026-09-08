package telemetry

import (
	"context"
	"errors"
	"maps"
	"time"

	"github.com/goplus/builder/tools/ispx/internal/rpc"
)

const defaultStartTimeout = 500 * time.Millisecond

// Client sends telemetry operations over the iSPX JSON-RPC channel.
// A nil *Client is safe to use and acts as a no-op.
type Client struct {
	rpc          *rpc.Client
	startTimeout time.Duration
}

// NewClient creates a telemetry Client backed by the given RPC client.
// A nil rpc client returns a nil *Client (no-op).
func NewClient(rpcClient *rpc.Client) *Client {
	if rpcClient == nil {
		return nil
	}
	return &Client{rpc: rpcClient, startTimeout: defaultStartTimeout}
}

// Start begins a new telemetry operation. On success it returns an Operation
// whose PropagationHeaders should be injected into the HTTP request.
//
// Start uses a short timeout and never blocks the caller beyond that. If the
// RPC call fails the returned error is non-nil; the caller should proceed with
// the HTTP request without tracing (fail-open).
func (c *Client) Start(ctx context.Context, req StartRequest) (*Operation, error) {
	if c == nil {
		return nil, errors.New("telemetry: nil client")
	}
	if ctx == nil {
		return nil, errors.New("telemetry: nil context")
	}

	callCtx, cancel := context.WithTimeout(ctx, c.startTimeout)
	defer cancel()

	if req.StartTimeUnixMilli == 0 {
		req.StartTimeUnixMilli = time.Now().UnixMilli()
	}

	var result StartResult
	if err := c.rpc.Call(callCtx, OperationStartMethod, req, &result); err != nil {
		return nil, err
	}
	if result.OperationID == "" {
		return nil, errors.New("telemetry: empty operation id")
	}

	return &Operation{
		id:      result.OperationID,
		headers: maps.Clone(result.PropagationHeaders),
		client:  c,
	}, nil
}
