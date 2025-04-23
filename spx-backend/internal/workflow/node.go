package workflow

import "context"

type INode interface {
	GetId() string
	GetType() NodeType
	Execute(ctx context.Context, w *Response, r *Request) error
	Next(ctx context.Context, env Env) INode
}
