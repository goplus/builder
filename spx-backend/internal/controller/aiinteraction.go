package controller

import (
	"context"
	"errors"
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/aiinteraction"
)

// AIInteractionTurnParams represents the parameters for an AI interaction turn.
type AIInteractionTurnParams aiinteraction.Request

// Validate validates the parameters.
func (p *AIInteractionTurnParams) Validate() (ok bool, msg string) {
	const maxContentLength = 280
	if len(p.Content) > maxContentLength {
		return false, fmt.Sprintf("content length exceeds %d characters", maxContentLength)
	} else if p.Content == "" && p.ContinuationTurn == 0 {
		return false, "missing content"
	}
	if len(p.CommandSpecs) == 0 {
		return false, "no available commands"
	}
	return true, ""
}

// AIInteractionTurnResult represents the result of an AI interaction turn.
type AIInteractionTurnResult aiinteraction.Response

// PerformAIInteractionTurn performs an AI interaction turn.
func (ctrl *Controller) PerformAIInteractionTurn(ctx context.Context, params *AIInteractionTurnParams) (*AIInteractionTurnResult, error) {
	if ctrl.aiInteraction == nil {
		return nil, errors.New("ai interaction service not initialized")
	}

	request := (*aiinteraction.Request)(params)

	response, err := ctrl.aiInteraction.Interact(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to perform ai interaction: %w", err)
	}
	result := (*AIInteractionTurnResult)(response)
	return result, nil
}
