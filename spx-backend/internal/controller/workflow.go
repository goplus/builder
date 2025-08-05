package controller

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/embkb"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/workflow"
)

type Workflow struct {
	Env workflow.Env `json:"env"`
}

type WorkflowMessageParams struct {
	Workflow *Workflow      `json:"workflow,omitempty"`
	Tools    []copilot.Tool `json:"tools,omitempty"` // Additional tools to use in the completion
	GenerateMessageBaseParams
}

// WorkflowMessageStream generates response message based on input messages.
func (ctrl *Controller) WorkflowMessageStream(ctx context.Context, params *WorkflowMessageParams, canUsePremium bool) (io.ReadCloser, error) {
	logger := log.GetReqLogger(ctx)

	// Check if workflow is initialized
	if ctrl.workflow == nil {
		return nil, fmt.Errorf("workflow is not initialized")
	}

	// Environment setup
	var env workflow.Env
	if params.Workflow != nil && params.Workflow.Env != nil {
		env = params.Workflow.Env
	} else {
		env = workflow.NewEnv()
	}

	env.Set("messages", params.Messages)
	env.Set("Tools", params.Tools)
	env.Set("XGoSyntax", embkb.XGoSyntax())
	env.Set("SpxAPIs", embkb.SpxAPIs())
	env.Set("canUsePremium", canUsePremium)

	// Create workflow runner with the specified index
	runner := ctrl.workflow.Runner(env)

	// Generate stream message using workflow
	stream, err := runner.Execute(ctx)
	if err != nil {
		logger.Errorf("failed to generate message: %v", err)
		return nil, err
	}

	return stream, nil
}
