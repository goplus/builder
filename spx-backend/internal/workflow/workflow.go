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

/*
* 1. gui -> backend: "开发贪吃蛇"
* 2. backend -> gui: <workflow name="workflow_name" input="开发贪吃蛇"><use-mcp-tool name="create_project", args=""/></workflow>
* 2. gui -> backend: <workflow name="workflow_name" input="开发贪吃蛇"><mcp-tool-result name="create_name">result</mcp-tool-result></workflow>
* 3. backend -> gui: <workflow name="workflow_name" input="开发贪吃蛇"><use-mcp-tool name="add_stage_backdrop_from_canvas", args="result"/></workflow>
* 4. gui -> backend: <workflow name="workflow_name" input="开发贪吃蛇"><mcp-tool-result name="add_stage_backdrop_from_canvas">result</mcp-tool-result></workflow>
* 5. backend -> gui: <workflow name="workflow_name" input="开发贪吃蛇"><use-mcp-tool name="add_sprite_from_canvas", args="result"/></workflow>
* 6. gui -> backend: <workflow name="workflow_name" input="开发贪吃蛇"><mcp-tool-result name="add_sprite_from_canvas">result</mcp-tool-result></workflow>
* 7. backend -> gui: <workflow name="workflow_name" input="开发贪吃蛇" reference="id"><use-mcp-tool name="write_to_file", args="result"/></workflow>
 */

/*
```json
{
	"workflow": {
		"id": "",
		"env": {
			"reference": "id",
			"messages": msgs
		}
	},
	"messages": {} ,
	"tools": {}
}
```
*/

/*
 * backend -> parse []message: -> workflow
 * 1. parse workflow range message to get workflow.next
 * 2. parse workflow input
 * 3. send input to LLM
 * 4. get result from LLM
 * 5. parse result to get next action
 * 6. send action to gui
 */
