package controller

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/copilot/imagegen"
	"github.com/goplus/builder/spx-backend/internal/copilot/standard"
	"github.com/goplus/builder/spx-backend/internal/copilot/translate"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// MaxMessageCount is the maximum number of messages allowed in a single request.
const MaxMessageCount = 50

type GenerateMessageBaseParams struct {
	Messages []copilot.Message `json:"messages"`
}

func (p *GenerateMessageBaseParams) Validate() (ok bool, msg string) {
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

type GenerateMessageParams struct {
	GenerateMessageBaseParams
	// Scope defines the scope of the copilot. Defaults to `code`.
	Scope *CopilotScope `json:"scope"`
}

type CopilotScope string

const (
	// ScopeCode is the default scope for code-related copilot features.
	ScopeCode CopilotScope = "code"
	// ScopeStandard is the scope for standard copilot features.
	ScopeStandard CopilotScope = "standard"
	// ScopeImageGen is the scope for image generation copilot features.
	ScopeImageGen CopilotScope = "imagegen"
	// ScopeTranslate is the scope for translation copilot features.
	ScopeTranslate CopilotScope = "translate"
)

// IsValid reports whether the copilot scope is valid.
func (cs CopilotScope) IsValid() bool {
	switch cs {
	case ScopeCode, ScopeStandard, ScopeImageGen, ScopeTranslate:
		return true
	}
	return false
}

func (p *GenerateMessageParams) Validate() (ok bool, msg string) {
	if ok, msg := p.GenerateMessageBaseParams.Validate(); !ok {
		return false, msg
	}
	if p.Scope != nil {
		if ok := p.Scope.IsValid(); !ok {
			return false, fmt.Sprintf("invalid scope: %s", *p.Scope)
		}
	}
	return true, ""
}

type GenerateMessageResult copilot.Message

// GenerateMessageStream generates response message based on input messages.
func (ctrl *Controller) GenerateMessageStream(ctx context.Context, params *GenerateMessageParams, canUsePremium bool) (io.ReadCloser, error) {
	logger := log.GetReqLogger(ctx)

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	systemPrompt := copilot.CodeSystemPrompt
	if params.Scope != nil {
		switch *params.Scope {
		case ScopeStandard:
			systemPrompt = standard.SystemPrompt
		case ScopeImageGen:
			systemPrompt = imagegen.SystemPrompt
		case ScopeTranslate:
			systemPrompt = translate.SystemPrompt
		}
	}

	// Generate stream message using copilot
	stream, err := ctrl.copilot.StreamMessage(ctx, &copilot.Params{
		System:   copilot.Content{Text: systemPrompt},
		Messages: params.Messages,
	}, canUsePremium)
	if err != nil {
		logger.Errorf("failed to generate message: %v", err)
		return nil, err
	}

	return stream, nil
}

// GenerateMessage generates response message based on input messages.
func (ctrl *Controller) GenerateMessage(ctx context.Context, params *GenerateMessageParams, canUsePremium bool) (*GenerateMessageResult, error) {
	logger := log.GetReqLogger(ctx)

	// Check if copilot is initialized
	if ctrl.copilot == nil {
		return nil, fmt.Errorf("copilot is not initialized")
	}

	systemPrompt := copilot.CodeSystemPrompt
	if params.Scope != nil {
		switch *params.Scope {
		case ScopeStandard:
			systemPrompt = standard.SystemPrompt
		case ScopeImageGen:
			systemPrompt = imagegen.SystemPrompt
		case ScopeTranslate:
			systemPrompt = translate.SystemPrompt
		}
	}

	// Generate message using copilot
	generatedContent, err := ctrl.copilot.Message(ctx, &copilot.Params{
		System:   copilot.Content{Text: systemPrompt},
		Messages: params.Messages,
	}, canUsePremium)
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
