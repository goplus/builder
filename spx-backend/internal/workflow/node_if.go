package workflow

import (
	"context"
)

var (
	// Verify IfStmt implements the INode interface
	_ INode = (*IfStmt)(nil)
)

type Cond func(env Env) bool

type Case struct {
	cond Cond
	node INode
}

// IfStmt represents a conditional branch node in the workflow
// It evaluates a condition and routes to either the true or false branch
type IfStmt struct {
	cases       []Case            //
	defaultNode INode             // Node to execute if condition evaluates to false
	prepare     func(env Env) Env // Function to prepare the environment before execution
}

// NewIfStmt creates a new conditional branch node
func NewIfStmt() *IfStmt {
	return &IfStmt{}
}

// Execute handles the execution of the if statement node
// The actual branching occurs in the Next method
func (p *IfStmt) Execute(ctx context.Context, w *Response, r *Request) error {
	return nil
}

// GetId returns the identifier for this node type
func (p *IfStmt) GetId() string {
	return "if-stmt"
}

// GetType returns the node type classification
func (p *IfStmt) GetType() NodeType {
	return NodeTypeLLM
}

// Next determines the next node to execute based on condition evaluation
// Returns the true branch node if condition is true, otherwise the false branch node
func (p *IfStmt) Next(ctx context.Context, env Env) INode {
	for _, cas := range p.cases {
		if cas.cond(env) {
			return cas.node
		}
	}
	return p.defaultNode
}

// If sets the condition and the node to execute when the condition is true
// Returns the IfStmt for method chaining
func (p *IfStmt) If(cond func(env Env) bool, node INode) *IfStmt {
	p.cases = append(p.cases, Case{
		cond: cond,
		node: node,
	})
	return p
}

// Else sets the node to execute when the condition is false
// Returns the IfStmt for method chaining
func (p *IfStmt) Else(node INode) *IfStmt {
	p.defaultNode = node
	return p
}

// Prepare sets up the environment for the node before execution
func (p *IfStmt) Prepare(ctx context.Context, env Env) Env {
	if p.prepare != nil {
		return p.prepare(env)
	}
	return env
}

func (p *IfStmt) WithPrepare(f func(env Env) Env) *IfStmt {
	p.prepare = f
	return p
}
