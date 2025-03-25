// Package anthropic provides integration with Anthropic's Claude AI model
package anthropic

import (
	"bytes"
	"context"
	"io"
	"sync"

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
	options         BaseOption
	anthropicClient *anthropic.Client
}

// BaseOption contains the base URL for the API client
type BaseOption struct {
	baseURL string
}

// NewAnthropic creates a new instance of the Anthropic client
func New(apiKey string, opts ...Option) *Anthropic {
	var base BaseOption
	for _, opt := range opts {
		opt(&base)
	}
	if base.baseURL == "" {
		base.baseURL = defaultBaseURL
	}
	return &Anthropic{
		options: base,
		anthropicClient: anthropic.NewClient(
			anthropicOption.WithAPIKey(apiKey),
			anthropicOption.WithBaseURL(base.baseURL),
		),
	}
}

// Option is a function that configures the BaseOption
type Option func(*BaseOption)

// WithBaseURL sets a custom base URL for the API client
func WithBaseURL(url string) Option {
	return func(c *BaseOption) {
		c.baseURL = url
	}
}

// Message sends a conversation to Claude and returns its response
// ctx: context for the request
// params: contains the conversation messages and other parameters
// Returns the AI response and any error encountered
func (a *Anthropic) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Get logger from context
	logger := log.GetReqLogger(ctx)

	// Convert internal message format to Anthropic's message format
	messages := []anthropic.MessageParam{}
	system := anthropic.TextBlockParam{}
	for _, m := range params.Messages {
		var message anthropic.MessageParam
		if m.Role == types.RoleUser {
			message = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content.Text))
		} else if m.Role == types.RoleCopilot {
			message = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content.Text))
		}
		messages = append(messages, message)
	}

	// Add system prompt message
	if params.System.Text != "" {
		system = anthropic.TextBlockParam{
			Text: anthropic.F(params.System.Text),
			Type: anthropic.F(anthropic.TextBlockParamTypeText),
			CacheControl: anthropic.F(anthropic.CacheControlEphemeralParam{
				Type: anthropic.F(anthropic.CacheControlEphemeralTypeEphemeral),
			}),
		}
	}

	// Set default model if not provided
	if params.Model == "" {
		params.Model = anthropic.ModelClaude3_5SonnetLatest
	}

	// Create request parameters
	req := anthropic.MessageNewParams{
		Model:     anthropic.F(params.Model),
		MaxTokens: anthropic.F(int64(types.MAX_TOKENS)),
		System: anthropic.F([]anthropic.TextBlockParam{
			system,
		}),
		Messages:    anthropic.F(messages),
		Temperature: anthropic.F(0.1), // Lower temperature for more deterministic outputs
	}

	if len(params.Tools) > 0 {
		// Convert params.Tools to Anthropic API compatible format
		tools := make([]anthropic.ToolUnionUnionParam, 0, len(params.Tools))
		for _, tool := range params.Tools {
			if tool.F != nil {
				// Create a tool with the correct structure
				toolParam := anthropic.ToolUnionParam{
					Name:        anthropic.F(tool.F.Name),
					Description: anthropic.F(tool.F.Description),
					// Convert parameters to input_schema
					InputSchema: anthropic.F(tool.F.Parameters),
					CacheControl: anthropic.F(anthropic.CacheControlEphemeralParam{
						Type: anthropic.F(anthropic.CacheControlEphemeralTypeEphemeral),
					}),
				}
				tools = append(tools, toolParam)
			}
		}

		// Add tools to request
		req.Tools = anthropic.F(tools)
	}

	// Make API call to Anthropic's Claude model
	ret, err := a.anthropicClient.Messages.New(ctx, req)
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

// StreamMessage sends a conversation to Claude and returns its response
// ctx: context for the request
// params: contains the conversation messages and other parameters
// Returns:
// - A reader for the streaming response
// - error: Returns API error or processing error if any occurs
func (a *Anthropic) StreamMessage(ctx context.Context, params *types.Params) (io.ReadCloser, error) {
	// Convert internal message format to Anthropic's message format
	messages := []anthropic.MessageParam{}
	system := anthropic.TextBlockParam{}
	for _, m := range params.Messages {
		var message anthropic.MessageParam
		if m.Role == types.RoleUser {
			message = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content.Text))
		} else if m.Role == types.RoleCopilot {
			message = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content.Text))
		}
		messages = append(messages, message)
	}

	// Add system prompt message
	if params.System.Text != "" {
		system = anthropic.TextBlockParam{
			Text: anthropic.F(params.System.Text),
			Type: anthropic.F(anthropic.TextBlockParamTypeText),
			CacheControl: anthropic.F(anthropic.CacheControlEphemeralParam{
				Type: anthropic.F(anthropic.CacheControlEphemeralTypeEphemeral),
			}),
		}
	}

	// Set default model if not provided
	if params.Model == "" {
		params.Model = anthropic.ModelClaude3_5SonnetLatest
	}

	// Create request parameters
	req := anthropic.MessageNewParams{
		Model:     anthropic.F(params.Model),
		MaxTokens: anthropic.F(int64(types.MAX_TOKENS)),
		System: anthropic.F([]anthropic.TextBlockParam{
			system,
		}),
		Messages:    anthropic.F(messages),
		Temperature: anthropic.F(0.1), // Lower temperature for more deterministic outputs
	}

	if len(params.Tools) > 0 {
		// Convert params.Tools to Anthropic API compatible format
		tools := make([]anthropic.ToolUnionUnionParam, 0, len(params.Tools))
		for _, tool := range params.Tools {
			if tool.F != nil {
				// Create a tool with the correct structure
				toolParam := anthropic.ToolUnionParam{
					Name:        anthropic.F(tool.F.Name),
					Description: anthropic.F(tool.F.Description),
					// Convert parameters to input_schema
					InputSchema: anthropic.F(tool.F.Parameters),
					CacheControl: anthropic.F(anthropic.CacheControlEphemeralParam{
						Type: anthropic.F(anthropic.CacheControlEphemeralTypeEphemeral),
					}),
				}
				tools = append(tools, toolParam)
			}
		}

		// Add tools to request
		req.Tools = anthropic.F(tools)
	}

	stream := a.anthropicClient.Messages.NewStreaming(ctx, req)

	wrapper := &streamWrapper{
		stream: stream,
		buffer: bytes.NewBuffer(nil),
	}
	wrapper.cond = sync.NewCond(&wrapper.mu)

	go wrapper.processEvents(ctx)
	return wrapper, nil
}
