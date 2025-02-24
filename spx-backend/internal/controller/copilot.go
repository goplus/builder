package controller

import (
	"context"
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
	"github.com/goplus/builder/spx-backend/internal/log"
)

const (
	MAX_MESSAGE_COUNT = 50
)

type GenerateMessageParams struct {
	Provider types.Provider `json:"provider"`
	Model    string         `json:"model"`

	Messages []types.Message `json:"messages"`
}

func (p *GenerateMessageParams) Validate() (ok bool, msg string) {
	if len(p.Messages) > MAX_MESSAGE_COUNT {
		return false, "too many messages"
	}
	for i, m := range p.Messages {
		if ok, msg := m.Validate(); !ok {
			return false, fmt.Sprintf("invalid message at index %d: %s", i, msg)
		}
	}
	return true, ""
}

type GenerateMessageResult types.Message

// GenerateMessage generates response message based on input messages.
func (ctrl *Controller) GenerateMessage(ctx context.Context, params *GenerateMessageParams) (*GenerateMessageResult, error) {
	logger := log.GetReqLogger(ctx)
	// Validate input parameters
	if ok, msg := params.Validate(); !ok {
		return nil, fmt.Errorf("invalid parameters: %s", msg)
	}

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	// Set default provider if not specified
	if params.Provider == "" {
		params.Provider = types.Qiniu
	}

	// Generate message using copilot
	generatedContent, err := ctrl.copilot.Message(ctx, &types.Params{
		Provider: params.Provider,
		Model:    params.Model,
		Messages: params.Messages,
	})
	if err != nil {
		logger.Errorf("failed to generate message: %v", err)
		return nil, err
	}

	// Extract message content
	message := generatedContent.Message
	return &GenerateMessageResult{
		Role:    message.Role,
		Content: message.Content,
	}, nil
}
