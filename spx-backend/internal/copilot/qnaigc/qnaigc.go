package qnaigc

import (
	"context"
	"fmt"
	"io"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
)

// Qiniu represents a client for interacting with the Qiniu API.
// It handles message processing and API communication.
type Qiniu struct {
	options BaseOption

	client *Client
}

// BaseOption contains the base URL for the API client
type BaseOption struct {
	baseURL string
}

// NewQiniu creates a new Qiniu client instance with the provided API key.
// apiKey: The authentication key for Qiniu API
func New(apiKey string, opts ...Option) *Qiniu {
	var base BaseOption
	for _, opt := range opts {
		opt(&base)
	}
	if base.baseURL == "" {
		base.baseURL = defaultBaseURL
	}

	return &Qiniu{
		options: base,
		client:  NewClient(apiKey, WithClientBaseURL(base.baseURL)),
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

// Message processes a conversation request with the Qiniu API.
// ctx: Context for request cancellation and deadlines
// params: Request parameters containing conversation messages
// Returns:
// - *types.Result: Contains the generated assistant message
// - error: Returns API error or processing error if any occurs
func (d *Qiniu) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Convert role types to Qiniu compatible format
	messages := make([]Message, 0, len(params.Messages))
	// Add system prompt message
	if params.System.Text != "" {
		messages = append(messages, NewSystemMessage(params.System.Text))
	}
	for _, msg := range params.Messages {
		var message Message
		if msg.Role == types.RoleUser {
			message = NewUserMessage(msg.Content.Text)
		} else if msg.Role == types.RoleCopilot {
			message = NewAssistantMessage(msg.Content.Text)
		}
		messages = append(messages, message)
	}

	// Set default model if not provided
	if params.Model == "" {
		params.Model = defaultModel
	}

	// Create API request payload
	req := &ChatCompletionRequest{
		Model:       params.Model,
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   types.MAX_TOKENS,
	}

	// Convert and set tools only if they exist
	if len(params.Tools) > 0 {
		// Convert params.Tools to Qiniu API compatible format
		tools := make([]*Tool, 0, len(params.Tools))
		for _, tool := range params.Tools {
			if tool.F != nil {
				tools = append(tools, &Tool{
					Type: ToolTypeFunction,
					F: &FunctionDefinition{
						Name:        tool.F.Name,
						Description: tool.F.Description,
						Parameters:  tool.F.Parameters,
					},
				})
			}
		}
		req.Tools = tools
	}

	// Build API request payload
	resp, err := d.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("API call failed: %w", err)
	}

	// Execute API call
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no valid response received")
	}

	// Extract and format assistant response
	assistantMsg := resp.Choices[0].Message
	return &types.Result{
		Message: types.Message{
			Role: types.RoleCopilot,
			Content: types.Content{
				Type: types.ContentTypeText,
				Text: assistantMsg.Content,
			},
		},
	}, nil
}

// StreamMessage processes a conversation request with the Qiniu API.
// ctx: Context for request cancellation and deadlines
// params: Parameters for the conversation request
// Returns:
// - A reader for the streaming response
// - error: Returns API error or processing error if any occurs
func (d *Qiniu) StreamMessage(ctx context.Context, params *types.Params) (io.ReadCloser, error) {
	// Convert role types to Qiniu compatible format
	messages := make([]Message, 0, len(params.Messages))
	// Add system prompt message
	if params.System.Text != "" {
		messages = append(messages, NewSystemMessage(params.System.Text))
	}

	for _, msg := range params.Messages {
		var message Message
		if msg.Role == types.RoleUser {
			message = NewUserMessage(msg.Content.Text)
		} else if msg.Role == types.RoleCopilot {
			message = NewAssistantMessage(msg.Content.Text)
		}
		messages = append(messages, message)
	}

	// Set default model if not provided
	if params.Model == "" {
		params.Model = defaultModel
	}

	// Create API request payload
	req := &ChatCompletionRequest{
		Model:       params.Model,
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   types.MAX_TOKENS,
		Stream:      true,
	}

	// Convert and set tools only if they exist
	if len(params.Tools) > 0 {
		// Convert params.Tools to Qiniu API compatible format
		tools := make([]*Tool, 0, len(params.Tools))
		for _, tool := range params.Tools {
			if tool.F != nil {
				tools = append(tools, &Tool{
					Type: ToolTypeFunction,
					F: &FunctionDefinition{
						Name:        tool.F.Name,
						Description: tool.F.Description,
						Parameters:  tool.F.Parameters,
					},
				})
			}
		}
		req.Tools = tools
	}

	// Build API request payload
	stream, err := d.client.StreamChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("API call failed: %w", err)
	}

	return stream, nil
}
