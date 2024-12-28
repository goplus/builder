package controller

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
)

const (
	MAX_CONTENT_TEXT_LENGTH = 5000
	MAX_MESSAGE_COUNT       = 50
	MAX_TOKENS              = 1024
)

type Role string

const (
	RoleUser    Role = "user"
	RoleCopilot Role = "copilot"
)

func (r Role) Validate() (ok bool, msg string) {
	switch r {
	case RoleUser, RoleCopilot:
		return true, ""
	default:
		return false, "invalid role"
	}
}

type ContentType string

const (
	ContentTypeText ContentType = "text"
)

func (c ContentType) Validate() (ok bool, msg string) {
	switch c {
	case ContentTypeText:
		return true, ""
	default:
		return false, "invalid content type"
	}
}

type Content struct {
	Type ContentType `json:"type"`
	Text string      `json:"text"`
}

func (c *Content) Validate() (ok bool, msg string) {
	if ok, msg := c.Type.Validate(); !ok {
		return false, msg
	}
	if c.Text == "" {
		return false, "missing text"
	}
	if len(c.Text) > MAX_CONTENT_TEXT_LENGTH {
		return false, "text too long"
	}
	return true, ""
}

type Message struct {
	Role    Role    `json:"role"`
	Content Content `json:"content"`
}

func (m *Message) Validate() (ok bool, msg string) {
	if ok, msg := m.Role.Validate(); !ok {
		return false, fmt.Sprintf("invalid role: %s", msg)
	}
	if ok, msg := m.Content.Validate(); !ok {
		return false, fmt.Sprintf("invalid content: %s", msg)
	}
	return true, ""
}

type GenerateMessageParams struct {
	Messages []Message `json:"messages"`
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

type GenerateMessageResult Message

// GenerateMessage generates response message based on input messages.
func (ctrl *Controller) GenerateMessage(ctx context.Context, params *GenerateMessageParams) (*GenerateMessageResult, error) {
	logger := log.GetReqLogger(ctx)
	messages := []anthropic.MessageParam{}
	for _, m := range params.Messages {
		var message anthropic.MessageParam
		if m.Role == RoleUser {
			message = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content.Text))
		} else if m.Role == RoleCopilot {
			message = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content.Text))
		}
		messages = append(messages, message)
	}
	generatedMsg, err := ctrl.anthropicClient.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(anthropic.ModelClaude3_5Haiku20241022),
		MaxTokens: anthropic.F(int64(MAX_TOKENS)),
		// Now we are using APIs from api.gptsapi.net for testing. `[]anthropic.TextBlockParam` is not supported.
		// So we use `anthropic.Raw` to pass the string-type system prompt. TODO:
		// * Switch to official API
		// * Use `[]anthropic.TextBlockParam` instead of `string`
		// * Enable prompt caching if it helps
		System:      anthropic.Raw[[]anthropic.TextBlockParam](copilot.SystemPrompt),
		Messages:    anthropic.F(messages),
		Temperature: anthropic.F(0.3),
	})
	if err != nil {
		logger.Printf("failed to generate message: %v", err)
		return nil, err
	}
	generatedContent := generatedMsg.Content
	if len(generatedContent) == 0 {
		logger.Printf("empty content from anthropic")
		return nil, fmt.Errorf("empty content")
	}
	if len(generatedContent) > 1 {
		logger.Printf("too much content from anthropic: %d", len(generatedContent))
		return nil, fmt.Errorf("too much content")
	}
	return &GenerateMessageResult{
		Role: RoleCopilot,
		Content: Content{
			Type: ContentTypeText,
			Text: generatedContent[0].Text,
		},
	}, nil
}
