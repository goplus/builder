// Package anthropic provides integration with Anthropic's Claude AI model
package anthropic

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	anthropicOption "github.com/anthropics/anthropic-sdk-go/option"
	"github.com/goplus/builder/spx-backend/internal/copilot/types"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// Constants for API configuration
const (
	defaultBaseURL = "https://api.anthropic.com/"
)

// Anthropic represents a client for interacting with Anthropic's API
type Anthropic struct {
	anthropicClient *anthropic.Client
}

// NewAnthropic creates a new instance of the Anthropic client
func New(apiKey string) *Anthropic {
	return &Anthropic{
		anthropicClient: anthropic.NewClient(
			anthropicOption.WithAPIKey(apiKey),
			anthropicOption.WithBaseURL(defaultBaseURL),
		),
	}
}

// Message sends a conversation to Claude and returns its response
// ctx: context for the request
// params: contains the conversation messages and other parameters
// Returns the AI response and any error encountered
func (a *Anthropic) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Check if the provider is supported
	if params.Provider != types.Anthropic {
		return nil, fmt.Errorf("unsupported provider: %s", params.Provider)
	}
	// Get logger from context
	logger := log.GetReqLogger(ctx)

	// Convert internal message format to Anthropic's message format
	messages := []anthropic.MessageParam{}
	systerm := anthropic.TextBlockParam{}
	for _, m := range params.Messages {
		var message anthropic.MessageParam
		if m.Role == types.RoleUser {
			message = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content.Text))
		} else if m.Role == types.RoleCopilot {
			message = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content.Text))
		}
		systerm = anthropic.TextBlockParam{
			Text: anthropic.F(m.Content.Text),
			Type: anthropic.F(anthropic.TextBlockParamTypeText),
			CacheControl: anthropic.F(anthropic.CacheControlEphemeralParam{
				Type: anthropic.F(anthropic.CacheControlEphemeralTypeEphemeral),
			}),
		}
		messages = append(messages, message)
	}

	// Set default model if not provided
	if params.Model == "" {
		params.Model = anthropic.ModelClaude3_5SonnetLatest
	}

	// Make API call to Anthropic's Claude model
	ret, err := a.anthropicClient.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(params.Model),
		MaxTokens: anthropic.F(int64(types.MAX_TOKENS)),
		System: anthropic.F([]anthropic.TextBlockParam{
			systerm,
		}),
		Messages:    anthropic.F(messages),
		Temperature: anthropic.F(0.1), // Lower temperature for more deterministic outputs
	})
	if err != nil {
		logger.Printf("failed to generate message: %v", err)
		return nil, err
	}

	// Extract and return the response
	assistantMsg := ret.Content[0].Text
	return &types.Result{
		Message: types.Message{
			Role: types.RoleCopilot,
			Content: types.Content{
				Type: types.ContentTypeText,
				Text: assistantMsg,
			},
		},
	}, nil
}
