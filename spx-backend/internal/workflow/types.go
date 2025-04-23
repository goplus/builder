package workflow

import "io"

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
