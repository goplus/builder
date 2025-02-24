// Package copilot provides a unified interface for multiple AI model providers
// to be used as coding assistants.
package copilot

import (
	"context"
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/copilot/anthropic"
	"github.com/goplus/builder/spx-backend/internal/copilot/qnaigc"
	"github.com/goplus/builder/spx-backend/internal/copilot/types"
)

// AICopilot defines the interface for AI-powered code assistance operations.
// Implementations of this interface can provide code suggestions, explanations,
// and other programming assistance features.
type AICopilot interface {
	// Message sends a request to the AI provider and returns the response.
	// ctx provides context for the request, which can be used for cancellation and timeout.
	// params contains the request parameters including the provider selection and message content.
	Message(ctx context.Context, params *types.Params) (*types.Result, error)
}

// Config defines the configuration parameters for the Copilot service.
// It includes API keys for different AI providers.
type Config struct {
	QiniuAPIKey     string
	AnthropicAPIKey string
}

// Copilot implements the AICopilot interface and manages multiple AI providers.
// It serves as a facade for different AI implementations, selecting the appropriate
// provider based on the request parameters.
type Copilot struct {
	qnaigcCopilot    AICopilot // QnAIGC AI provider implementation
	anthropicCopilot AICopilot // Anthropic AI provider implementation
}

// NewCopilot creates and initializes a new Copilot instance with all supported
// AI providers. It returns an AICopilot interface that can be used to interact
// with the selected AI provider.
func NewCopilot(cfg *Config) AICopilot {
	return &Copilot{
		qnaigcCopilot:    qnaigc.New(cfg.QiniuAPIKey),
		anthropicCopilot: anthropic.New(cfg.AnthropicAPIKey),
	}
}

// Message implements the AICopilot interface. It routes the request to the
// appropriate AI provider based on the Provider field in the params.
// Returns an error if the specified provider is not supported.
func (c *Copilot) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Add system prompt message
	params.Messages = append(params.Messages, types.Message{
		Role: types.RoleSystem,
		Content: types.Content{
			Type: types.ContentTypeText,
			Text: SystemPrompt,
		},
	})
	switch params.Provider {
	case types.Qiniu:
		return c.qnaigcCopilot.Message(ctx, params)
	case types.Anthropic:
		return c.anthropicCopilot.Message(ctx, params)
	default:
		return nil, fmt.Errorf("unknown provider: %s", params.Provider)
	}
}
