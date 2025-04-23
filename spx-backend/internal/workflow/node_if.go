package workflow

import (
	"context"
)

var (
	// Verify IfStmt implements the INode interface
	_ INode = (*IfStmt)(nil)
)

// IfStmt represents a conditional branch node in the workflow
// It evaluates a condition and routes to either the true or false branch
type IfStmt struct {
	cond      func(env Env) bool // Condition function that determines which branch to take
	trueNode  INode              // Node to execute if condition evaluates to true
	falseNode INode              // Node to execute if condition evaluates to false
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
	if p.cond(env) {
		return p.trueNode
	}
	return p.falseNode
}

// If sets the condition and the node to execute when the condition is true
// Returns the IfStmt for method chaining
func (p *IfStmt) If(cond func(env Env) bool, node INode) *IfStmt {
	p.cond = cond
	p.trueNode = node
	return p
}

// Else sets the node to execute when the condition is false
// Returns the IfStmt for method chaining
func (p *IfStmt) Else(node INode) *IfStmt {
	p.falseNode = node
	return p
}
