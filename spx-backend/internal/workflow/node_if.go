package workflow

import (
	"context"
)

var (
	_ INode = (*IfStmt)(nil)
)

type IfStmt struct {
	cond      func(env Env) bool
	trueNode  INode
	falseNode INode
}

func NewIfStmt() *IfStmt {
	return &IfStmt{}
}

func (p *IfStmt) Execute(ctx context.Context, w *Response, r *Request) error {
	return nil
}

func (p *IfStmt) GetId() string {
	return "if-stmt"
}

func (p *IfStmt) GetType() NodeType {
	return NodeTypeLLM
}

func (p *IfStmt) Next(ctx context.Context, env Env) INode {
	if p.cond(env) {
		return p.trueNode
	}
	return p.falseNode
}

func (p *IfStmt) If(cond func(env Env) bool, node INode) *IfStmt {
	p.cond = cond
	p.trueNode = node
	return p
}

func (p *IfStmt) Else(node INode) *IfStmt {
	p.falseNode = node
	return p
}
