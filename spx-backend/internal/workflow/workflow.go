package workflow

import (
	"bytes"
	"context"
	"fmt"
	"io"
)

type Workflow struct {
	id    string
	name  string
	start INode
}

func NewWorkflow(name string) *Workflow {
	return &Workflow{
		name: name,
	}
}

func (c *Workflow) GetId() string {
	return c.id
}

func (c *Workflow) GetName() string {
	return c.name
}

func (c *Workflow) Runner(idx int) *WorkflowRunner {
	return &WorkflowRunner{
		idx:      idx,
		workflow: c,
	}
}

func (c *Workflow) Start(node INode) {
	c.start = node
}

type WorkflowRunner struct {
	idx      int
	workflow *Workflow
}

func (c *WorkflowRunner) Execute(ctx context.Context, env Env) (io.ReadCloser, error) {
	pr, pw := io.Pipe()

	go func() {
		defer pw.Close()

		fmt.Fprintf(pw, "<workflow name=\"%s\">", c.workflow.name)

		var read io.Reader = &bytes.Buffer{}
		node := c.workflow.start

		for {
			fmt.Fprintf(pw, "\n")
			// Create a new request for each node
			r := &Request{
				env: env,
				rd:  read,
			}

			pipBuf := &bytes.Buffer{}

			// Create a new response writer for each node
			w := &Response{
				output: make(map[string]interface{}),
				w:      pw,
				pip:    pipBuf,
			}

			// Execute the node
			err := node.Execute(ctx, w, r)
			if err != nil {
				fmt.Fprintf(pw, "<error>%s</error>", err.Error())
				return
			}

			// Update environment with node output
			for k, v := range w.output {
				fmt.Fprintf(pw, "<env %s=\"%v\"/>", k, v)
				env.Add(k, v)
			}

			// Output to the next node
			node = node.Next(ctx, r.env)
			if node == nil {
				break
			}

			// Update the read stream for the next node
			read = w.pip
		}

		fmt.Fprintf(pw, "\n</workflow>")
	}()

	return pr, nil
}
