package controller

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// MaxMessageCount is the maximum number of messages allowed in a single request.
const MaxMessageCount = 50

type GenerateMessageParams struct {
	Messages []copilot.Message `json:"messages"`
	Tools    []copilot.Tool    `json:"tools,omitempty"` // Additional tools to use in the completion
}

func (p *GenerateMessageParams) Validate() (ok bool, msg string) {
	if len(p.Messages) > MaxMessageCount {
		return false, "too many messages"
	}
	for i, m := range p.Messages {
		if ok, msg := m.Validate(); !ok {
			return false, fmt.Sprintf("invalid message at index %d: %s", i, msg)
		}
	}
	return true, ""
}

type GenerateMessageResult copilot.Message

// GenerateStream generates response message based on input messages.
func (ctrl *Controller) GenerateMessageStream(ctx context.Context, params *GenerateMessageParams) (io.ReadCloser, error) {
	logger := log.GetReqLogger(ctx)

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	// Generate stream message using copilot
	stream, err := ctrl.copilot.StreamMessage(ctx, &copilot.Params{
		Messages: params.Messages,
		Tools:    params.Tools,
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
	generatedContent, err := ctrl.copilot.Message(ctx, &copilot.Params{
		Messages: params.Messages,
		Tools:    params.Tools,
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
