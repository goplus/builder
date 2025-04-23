package workflow

import "context"

// INode defines the interface for all workflow nodes
// Each node in the workflow must implement these methods
type INode interface {
	// GetId returns the unique identifier for this node
	GetId() string

	// GetType returns the type classification of the node
	GetType() NodeType

	// Execute runs the node's logic with the given context, response writer, and request
	// It processes input and writes output to the response
	Execute(ctx context.Context, w *Response, r *Request) error

	// Next determines the following node in the workflow based on the execution context
	// Returns nil if this is the final node in the workflow
	Next(ctx context.Context, env Env) INode
}
