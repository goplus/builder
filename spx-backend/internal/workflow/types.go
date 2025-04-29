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

	// Prepare initializes the node with the given environment context
	// This method is called before the node's execution
	Prepare(ctx context.Context, env Env) Env
}

// NodeType represents the classification of workflow node
// Used to identify the node's purpose and behavior
type NodeType string

const (
	NodeTypeStart      NodeType = "start"      // Entry point of the workflow
	NodeTypeEnd        NodeType = "end"        // Terminal node of the workflow
	NodeTypeLLM        NodeType = "llm"        // Language model processing node
	NodeTypeSearch     NodeType = "search"     // Search operation node
	NodeTypeClassifier NodeType = "classifier" // Classifier node for decision-making
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

// Env represents a simple key-value environment for storing workflow context data
type Env map[string]interface{}

// NewEnv creates a new environment instance
func NewEnv() Env {
	return make(Env)
}

// Get retrieves a value from the environment by key
// Returns nil if the key doesn't exist
func (e Env) Get(key string) interface{} {
	if v, ok := e[key]; ok {
		return v
	}
	return nil
}

// Set stores a key-value pair in the environment
// Overwrites any existing value for the same key
func (e Env) Set(key string, value interface{}) {
	e[key] = value
}

// Delete removes a key-value pair from the environment
func (e Env) Delete(key string) {
	delete(e, key)
}

// Clear removes all key-value pairs from the environment
func (e Env) Clear() {
	for k := range e {
		delete(e, k)
	}
}
