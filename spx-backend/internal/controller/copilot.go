package controller

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
	"github.com/goplus/builder/spx-backend/internal/log"
)

const (
	MAX_MESSAGE_COUNT = 50
)

type GenerateMessageParams struct {
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

// GenerateStream generates response message based on input messages.
func (ctrl *Controller) GenerateStream(ctx context.Context, params *GenerateMessageParams) (io.ReadCloser, error) {
	logger := log.GetReqLogger(ctx)

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	// Generate stream message using copilot
	stream, err := ctrl.copilot.Stream(ctx, &types.Params{
		Messages: params.Messages,
	})
	if err != nil {
		logger.Errorf("failed to generate message: %v", err)
		return nil, err
	}

	return stream, nil
}

// GenerateMessage generates response message based on input messages.
func (ctrl *Controller) GenerateMessage(ctx context.Context, params *GenerateMessageParams) (*GenerateMessageResult, error) {
	logger := log.GetReqLogger(ctx)

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	// Generate message using copilot
	generatedContent, err := ctrl.copilot.Message(ctx, &types.Params{
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
