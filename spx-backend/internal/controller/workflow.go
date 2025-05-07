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

	// Environment setup
	var env workflow.Env
	if params.Workflow != nil && params.Workflow.Env != nil {
		env = params.Workflow.Env
	} else {
		env = workflow.NewEnv()
	}

	logger.Infof("workflow env: %v", env)

	env.Set("messages", params.Messages)
	env.Set("Tools", params.Tools)
	env.Set("GopDefs", copilot.GopDefs)
	env.Set("SpxDefs", copilot.SpxDefs)

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
