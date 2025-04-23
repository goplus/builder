package workflow

import "io"

type NodeType string

const (
	NodeTypeStart NodeType = "start"
	NodeTypeEnd   NodeType = "end"
	NodeTypeLLM   NodeType = "llm"
)

type Request struct {
	env Env

	rd io.Reader
}

type Response struct {
	output map[string]interface{}

	w   io.Writer
	pip io.ReadWriter
}
