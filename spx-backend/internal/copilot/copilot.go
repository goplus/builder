// Package copilot provides a unified interface for multiple AI model providers
// to be used as coding assistants.
package copilot

import (
	"context"
	"fmt"
	"io"

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
	// Stream sends a request to the AI provider and returns a stream of responses.
	// ctx provides context for the request, which can be used for cancellation and timeout.
	// params contains the request parameters including the provider selection and message content.
	Stream(ctx context.Context, params *types.Params) (io.ReadCloser, error)
}

// Config defines the configuration parameters for the Copilot service.
// It includes API keys for different AI providers.
type Config struct {
	Provider types.Provider

	QiniuAPIKey      string
	QiniuBaseURL     string
	AnthropicAPIKey  string
	AnthropicBaseURL string
}

// Copilot implements the AICopilot interface and manages multiple AI providers.
// It serves as a facade for different AI implementations, selecting the appropriate
// provider based on the request parameters.
type Copilot struct {
	copilot AICopilot // AI provider implementation
}

// NewCopilot creates and initializes a new Copilot instance with all supported
// AI providers. It returns an AICopilot interface that can be used to interact
// with the selected AI provider.
func NewCopilot(cfg *Config) (AICopilot, error) {
	var copilot AICopilot
	switch cfg.Provider {
	case types.Qiniu:
		copilot = qnaigc.New(cfg.QiniuAPIKey, qnaigc.WithBaseURL(cfg.QiniuBaseURL))
	case types.Anthropic:
		copilot = anthropic.New(cfg.AnthropicAPIKey, anthropic.WithBaseURL(cfg.AnthropicBaseURL))
	default:
		return nil, fmt.Errorf("unsupported provider: %s", cfg.Provider)
	}
	return &Copilot{
		copilot: copilot,
	}, nil
}

// Message implements the AICopilot interface. It routes the request to the
// appropriate AI provider based on the Provider field in the params.
// Returns an error if the specified provider is not supported.
func (c *Copilot) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Add system prompt message
	params.System = types.Content{
		Type: types.ContentTypeText,
		Text: SystemPrompt,
	}
	// Send message to the AI provider
	return c.copilot.Message(ctx, params)
}

// Message implements the AICopilot interface. It routes the request to the
// appropriate AI provider based on the Provider field in the params.
// Returns an error if the specified provider is not supported.
func (c *Copilot) Stream(ctx context.Context, params *types.Params) (io.ReadCloser, error) {
	// Add system prompt message
	params.System = types.Content{
		Type: types.ContentTypeText,
		Text: SystemPrompt,
	}
	// Send message to the AI provider
	return c.copilot.Stream(ctx, params)
}
