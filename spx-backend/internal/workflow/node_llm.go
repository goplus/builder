package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/copilot"
)

var (
	// Type assertion to ensure LLMNode implements the INode interface
	_ INode = (*LLMNode)(nil)
)

// LLMNode represents a node that interacts with a language model via Copilot
// It processes inputs through templates and streams the LLM response
type LLMNode struct {
	copilot *copilot.Copilot // Reference to the copilot client used to communicate with the LLM

	system  string // System prompt template to be rendered with environment data
	id      string // Unique identifier for this node
	next    INode  // Reference to the next node in the workflow
	written bool   // Enables writing to the response writer
}

// NewLLMNode creates a new LLM node with the given copilot client and system prompt
func NewLLMNode(copilot *copilot.Copilot, system string, written bool) *LLMNode {
	return &LLMNode{
		copilot: copilot,
		system:  system,
		written: written,
	}
}

// GetId returns the unique identifier for this node
func (ln *LLMNode) GetId() string {
	return ln.id
}

// GetType returns the node type classification (LLM type)
func (ln *LLMNode) GetType() NodeType {
	return NodeTypeLLM
}

// Prompt renders the system prompt template with environment data
// Uses Go's template engine to replace variables and apply formatting functions
func (ln *LLMNode) Prompt(env Env) (string, error) {
	// Define custom template functions
	funcMap := template.FuncMap{
		"formatJSON": func(v interface{}) string {
			indented, err := json.MarshalIndent(v, "", "\t")
			if err != nil {
				return fmt.Sprintf("Error formatting JSON: %v", err)
			}
			return string(indented)
		},
	}

	// Parse the system prompt template
	tpl, err := template.New("system-prompt").Funcs(funcMap).Parse(ln.system)
	if err != nil {
		return "", err
	}

	// Execute the template with the environment data
	var sb strings.Builder
	if err := tpl.Execute(&sb, env); err != nil {
		return "", err
	}

	prompt := sb.String()
	return prompt, nil
}

// Execute processes the node by:
// 1. Rendering the system prompt with environment data
// 2. Calling the LLM via Copilot
// 3. Streaming the response to both the response writer and pipe for next node
func (ln *LLMNode) Execute(ctx context.Context, w *Response, r *Request) error {
	// Render the system prompt with the environment data
	prompt, err := ln.Prompt(r.env)
	if err != nil {
		return err
	}
	// Prepare parameters for the LLM call
	params := &copilot.Params{
		System: copilot.Content{
			Text: prompt,
		},
	}

	// Get conversation history from environment if available
	msgs := r.env.Get("messages")
	if msgs != nil {
		if messages, ok := msgs.([]copilot.Message); ok {
			params.Messages = messages
		}
	}

	// Stream the message from the LLM
	read, err := ln.copilot.StreamMessage(ctx, params)
	if err != nil {
		return err
	}

	// Write the response to both response writer and pipe for next node
	var mw io.Writer = w.pip
	if ln.written {
		mw = io.MultiWriter(w.w, w.pip)
	}
	_, err = io.Copy(mw, read)
	return err
}

// Next returns the next node to execute in the workflow
func (ln *LLMNode) Next(ctx context.Context, env Env) INode {
	return ln.next
}

// SetNext sets the next node in the workflow chain
// Returns this node to enable method chaining
func (ln *LLMNode) SetNext(next INode) INode {
	ln.next = next
	return ln
}
