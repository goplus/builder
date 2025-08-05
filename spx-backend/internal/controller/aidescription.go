package controller

import (
	"context"
	"fmt"
)

// AIDescriptionParams represents the parameters for AI description generation.
type AIDescriptionParams struct {
	Content string `json:"content"`
}

// Validate validates the parameters.
func (p *AIDescriptionParams) Validate() (ok bool, msg string) {
	const maxContentLength = 100000 // Allow larger content from frontend
	if p.Content == "" {
		return false, "content is required"
	}
	if len(p.Content) > maxContentLength {
		return false, fmt.Sprintf("content length exceeds %d characters", maxContentLength)
	}
	return true, ""
}

// AIDescriptionResult represents the result of AI description generation.
type AIDescriptionResult struct {
	Description string `json:"description"`
}

// GenerateAIDescription generates an AI description based on the provided content.
func (ctrl *Controller) GenerateAIDescription(ctx context.Context, params *AIDescriptionParams) (*AIDescriptionResult, error) {
	if ctrl.aiDescription == nil {
		return nil, fmt.Errorf("ai description service not initialized")
	}

	description, err := ctrl.aiDescription.Generate(ctx, params.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ai description: %w", err)
	}

	return &AIDescriptionResult{
		Description: description,
	}, nil
}
