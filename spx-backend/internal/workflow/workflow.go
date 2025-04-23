package workflow

import (
	"bytes"
	"context"
	"fmt"
	"io"
)

// Workflow represents a sequence of connected nodes that perform a series of operations
// It forms the structure for executing a chain of processing steps
type Workflow struct {
	id    string // Unique identifier for the workflow
	name  string // Human-readable name of the workflow
	start INode  // First node in the workflow sequence
}

// NewWorkflow creates a new workflow instance with the specified name
func NewWorkflow(name string) *Workflow {
	return &Workflow{
		name: name,
	}
}

// GetId returns the unique identifier for this workflow
func (c *Workflow) GetId() string {
	return c.id
}

// GetName returns the human-readable name of this workflow
func (c *Workflow) GetName() string {
	return c.name
}

// Runner creates a new workflow runner with the provided environment
// The runner is responsible for executing the workflow nodes in sequence
func (c *Workflow) Runner(env Env) *WorkflowRunner {
	return &WorkflowRunner{
		env:      env,
		workflow: c,
	}
}

// Start sets the entry point node for this workflow
func (c *Workflow) Start(node INode) {
	c.start = node
}

// WorkflowRunner executes a workflow with a specific environment context
// It handles the sequential processing of all nodes and manages data flow between them
type WorkflowRunner struct {
	env      Env       // Environment containing shared workflow state
	workflow *Workflow // Reference to the workflow structure being executed
}

// Execute runs the workflow in a streaming fashion
// Returns a ReadCloser that provides access to the combined output stream
func (c *WorkflowRunner) Execute(ctx context.Context) (io.ReadCloser, error) {
	// Create a pipe for streaming the workflow output
	pr, pw := io.Pipe()

	// Execute the workflow in a separate goroutine to allow streaming
	go func() {
		defer pw.Close() // Ensure the pipe is closed when execution completes

		// Write the workflow opening tag with the name
		fmt.Fprintf(pw, "<workflow name=\"%s\">", c.workflow.name)

		// Initialize an empty buffer for the first node's input
		var read io.Reader = &bytes.Buffer{}
		node := c.workflow.start

		// Process each node in sequence until reaching a terminal node
		for {
			fmt.Fprintf(pw, "\n")

			// Create a new request for each node with the current environment and input
			r := &Request{
				env: c.env,
				rd:  read,
			}

			// Create a buffer to capture the node's output for the next node
			pipBuf := &bytes.Buffer{}

			// Create a response writer that will handle the node's output
			w := &Response{
				output: make(map[string]interface{}), // For environment updates
				w:      pw,                           // For primary output (streamed to client)
				pip:    pipBuf,                       // For next node's input
			}

			// Execute the current node
			err := node.Execute(ctx, w, r)
			if err != nil {
				// Handle errors by writing them to the output stream
				fmt.Fprintf(pw, "<error>%s</error>", err.Error())
				return
			}

			// Update the workflow environment with the node's output values
			for k, v := range w.output {
				fmt.Fprintf(pw, "<env %s=\"%v\"/>", k, v)
				c.env.Add(k, v)
			}

			// Determine the next node based on execution state
			node = node.Next(ctx, r.env)
			if node == nil {
				// End of workflow reached
				break
			}

			// Update the input stream for the next node to be this node's output
			read = w.pip
		}

		// Write the workflow closing tag
		fmt.Fprintf(pw, "\n</workflow>")
	}()

	// Return the read end of the pipe for streaming access to the output
	return pr, nil
}
