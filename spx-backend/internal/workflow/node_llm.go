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
	_ INode = (*LLMNode)(nil)
)

type LLMNode struct {
	copilot *copilot.Copilot

	system string
	id     string
	next   INode
}

func NewLLMNode(copilot *copilot.Copilot, system string) *LLMNode {
	return &LLMNode{
		copilot: copilot,
		system:  system,
	}
}

func (ln *LLMNode) GetId() string {
	return ln.id
}

func (ln *LLMNode) GetType() NodeType {
	return NodeTypeLLM
}

func (ln *LLMNode) Prompt(env Env) string {
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
		panic(err)
	}

	var sb strings.Builder
	if err := tpl.Execute(&sb, env); err != nil {
		panic(err)
	}

	prompt := sb.String()
	return prompt
}

func (ln *LLMNode) Execute(ctx context.Context, w *Response, r *Request) error {
	params := &copilot.Params{
		System: copilot.Content{
			Text: ln.Prompt(r.env),
		},
	}
	msgs := r.env.Get("messages")
	if msgs != nil {
		if messages, ok := msgs.([]copilot.Message); ok {
			params.Messages = messages
		}
	}

	read, err := ln.copilot.StreamMessage(ctx, params)
	if err != nil {
		return err
	}
	mw := io.MultiWriter(w.w, w.pip)
	_, err = io.Copy(mw, read)
	return err
}

func (ln *LLMNode) Next(ctx context.Context, env Env) INode {
	return ln.next
}

func (ln *LLMNode) SetNext(next INode) INode {
	ln.next = next
	return ln
}
