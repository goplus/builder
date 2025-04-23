package workflow

import (
	"context"
	"io"
)

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

// NodeType represents the classification of workflow node
// Used to identify the node's purpose and behavior
type NodeType string

const (
	NodeTypeStart  NodeType = "start"  // Entry point of the workflow
	NodeTypeEnd    NodeType = "end"    // Terminal node of the workflow
	NodeTypeLLM    NodeType = "llm"    // Language model processing node
	NodeTypeSearch NodeType = "search" // Search operation node
)

// Request encapsulates input data and context for a workflow node
type Request struct {
	env Env // Environment containing shared workflow state

	rd io.Reader // Input stream for the node to process
}

// Response handles the output from a workflow node
type Response struct {
	output map[string]interface{} // Key-value pairs to be added to the environment

	w   io.Writer     // Writer for the node's primary output
	pip io.ReadWriter // Pipe connecting this node's output to the next node's input
}
