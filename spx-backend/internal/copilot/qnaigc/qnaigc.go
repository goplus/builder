package qnaigc

import (
	"context"
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
)

// Qiniu represents a client for interacting with the Qiniu API.
// It handles message processing and API communication.
type Qiniu struct {
	client *Client
}

// NewQiniu creates a new Qiniu client instance with the provided API key.
// apiKey: The authentication key for Qiniu API
func New(apiKey string) *Qiniu {
	return &Qiniu{
		client: NewClient(apiKey),
	}
}

// Message processes a conversation request with the Qiniu API.
// ctx: Context for request cancellation and deadlines
// params: Request parameters containing conversation messages
// Returns:
// - *types.Result: Contains the generated assistant message
// - error: Returns API error or processing error if any occurs
func (d *Qiniu) Message(ctx context.Context, params *types.Params) (*types.Result, error) {
	// Check if the provider is supported
	if params.Provider != types.Qiniu {
		return nil, fmt.Errorf("unsupported provider: %s", params.Provider)
	}
	// Convert role types to Qiniu compatible format
	messages := make([]Message, 0, len(params.Messages))
	for _, msg := range params.Messages {
		var message Message
		if msg.Role == types.RoleUser {
			message = NewUserMessage(msg.Content.Text)
		} else if msg.Role == types.RoleCopilot {
			message = NewAssistantMessage(msg.Content.Text)
		} else if msg.Role == types.RoleSystem {
			message = NewSystemMessage(msg.Content.Text)
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
