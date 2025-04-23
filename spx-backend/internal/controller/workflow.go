package controller

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/workflow"
)

type Workflow struct {
	Idx int          `json:"idx"`
	Env workflow.Env `json:"env"`
}

type WorkflowMessageParams struct {
	Workflow *Workflow `json:"workflow,omitempty"`
	GenerateMessageParams
}

// GenerateStream generates response message based on input messages.
func (ctrl *Controller) WorkflowMessageStream(ctx context.Context, params *WorkflowMessageParams) (io.ReadCloser, error) {
	logger := log.GetReqLogger(ctx)

	// Check if workflow is initialized
	if ctrl.workflow == nil {
		return nil, fmt.Errorf("workflow is not initialized")
	}

	// Create workflow runner with the specified index
	runner := ctrl.workflow.Runner(params.Workflow.Idx)

	// Environment setup
	env := params.Workflow.Env
	if env == nil {
		env = workflow.NewEnv()
	}
	env.Add("messages", params.Messages)
	env.Add("tools", params.Tools)
	env.Add("GopDefs", copilot.GopDefs)
	env.Add("SpxDefs", copilot.SpxDefs)

	// Generate stream message using workflow
	stream, err := runner.Execute(ctx, env)
	if err != nil {
		logger.Errorf("failed to generate message: %v", err)
		return nil, err
	}

	return stream, nil
}
