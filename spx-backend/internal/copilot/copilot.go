// Package copilot provides a unified interface for multiple AI model providers
// to be used as coding assistants.
package copilot

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/openai/openai-go"
)

const (
	// MaxContentLength defines the maximum length of content text.
	MaxContentLength = 10000

	// MaxTokens defines the maximum number of tokens for the AI response.
	MaxTokens = 10240

	// Temperature defines the sampling Temperature for the AI response.
	Temperature = 0.7
)

// Copilot provides code suggestions, explanations, and other programming
// assistance features using AI models.
type Copilot struct {
	openaiClient  openai.Client
	openaiModelID string
}

// New creates a new instance of [Copilot] with the specified OpenAI client and model ID.
func New(openaiClient openai.Client, openaiModelID string) (*Copilot, error) {
	if openaiModelID == "" {
		return nil, errors.New("missing openai model id")
	}
	copilot := &Copilot{
		openaiClient:  openaiClient,
		openaiModelID: openaiModelID,
	}
	return copilot, nil
}

// buildChatCompletionParams builds an [openai.ChatCompletionNewParams] for the
// chat completion request.
func (c *Copilot) buildChatCompletionNewParams(params *Params) (openai.ChatCompletionNewParams, error) {
	messages := make([]openai.ChatCompletionMessageParamUnion, 0, len(params.Messages)+1)

	// Add system prompt message.
	if params.System.Text != "" {
		messages = append(messages, openai.SystemMessage(params.System.Text))
	}

	// Add user messages.
	for _, msg := range params.Messages {
		var message openai.ChatCompletionMessageParamUnion
		switch msg.Role {
		case RoleUser:
			message = openai.UserMessage(msg.Content.Text)
		case RoleCopilot:
			message = openai.AssistantMessage(msg.Content.Text)
		default:
			return openai.ChatCompletionNewParams{}, fmt.Errorf("unsupported role: %s", msg.Role)
		}
		messages = append(messages, message)
	}

	return openai.ChatCompletionNewParams{
		Messages:    messages,
		Model:       c.openaiModelID,
		MaxTokens:   openai.Opt(int64(MaxTokens)),
		Temperature: openai.Opt(Temperature),
	}, nil
}

// Message sends a request to the AI provider and returns the response.
func (c *Copilot) Message(ctx context.Context, params *Params) (*Result, error) {
	body, err := c.buildChatCompletionNewParams(params)
	if err != nil {
		return nil, fmt.Errorf("failed to build chat completion params: %w", err)
	}

	chatCompletion, err := c.openaiClient.Chat.Completions.New(ctx, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create chat completion: %w", err)
	}
	if len(chatCompletion.Choices) == 0 {
		return nil, errors.New("no choices returned from ai")
	}

	assistantMsg := chatCompletion.Choices[0].Message
	return &Result{
		Message: Message{
			Role: RoleCopilot,
			Content: Content{
				Type: ContentTypeText,
				Text: assistantMsg.Content,
			},
		},
	}, nil
}

// StreamMessage sends a request to the AI provider and returns a stream of responses.
func (c *Copilot) StreamMessage(ctx context.Context, params *Params) (io.ReadCloser, error) {
	body, err := c.buildChatCompletionNewParams(params)
	if err != nil {
		return nil, fmt.Errorf("failed to build chat completion params: %w", err)
	}

	chatCompletionStream := c.openaiClient.Chat.Completions.NewStreaming(ctx, body)
	if err := chatCompletionStream.Err(); err != nil {
		return nil, fmt.Errorf("failed to create chat completion stream: %w", err)
	}

	pr, pw := io.Pipe()
	go func() (err error) {
		defer func() {
			pw.CloseWithError(err)
			chatCompletionStream.Close()
		}()
		for chatCompletionStream.Next() {
			chunk := chatCompletionStream.Current()
			if len(chunk.Choices) == 0 {
				continue
			}
			if _, err := pw.Write([]byte(chunk.Choices[0].Delta.Content)); err != nil {
				return fmt.Errorf("failed to write to pipe: %w", err)
			}
		}
		return chatCompletionStream.Err()
	}()
	return pr, nil
}
