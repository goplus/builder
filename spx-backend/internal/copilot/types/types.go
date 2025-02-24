package types

import "fmt"

// Constants for the maximum length of content text and other limits.
const (
	MAX_CONTENT_TEXT_LENGTH = 5000
	MAX_MESSAGE_COUNT       = 50
	MAX_TOKENS              = 1024
)

// Provider represents the AI provider for the message.
type Provider string

// Supported AI providers.
const (
	Qiniu     Provider = "qiniu"
	Anthropic Provider = "anthropic"
)

// Params represents the input parameters for the message request.
type Params struct {
	Provider Provider `json:"provider"`
	Model    string   `json:"model"`

	Messages []Message `json:"messages"`
}

// Result represents the response message from the AI provider.
type Result struct {
	Message Message `json:"message"`
}

// Message represents a single message in the conversation.
type Message struct {
	Role    Role    `json:"role"`
	Content Content `json:"content"`
}

// Validate checks if the message is valid.
func (m *Message) Validate() (ok bool, msg string) {
	if ok, msg := m.Role.Validate(); !ok {
		return false, fmt.Sprintf("invalid role: %s", msg)
	}
	if ok, msg := m.Content.Validate(); !ok {
		return false, fmt.Sprintf("invalid content: %s", msg)
	}
	return true, ""
}

// Role represents the role of the message sender.
type Role string

// Supported roles.
const (
	RoleUser    Role = "user"
	RoleSystem  Role = "system"
	RoleCopilot Role = "copilot"
)

// Validate checks if the role is valid.
func (r Role) Validate() (ok bool, msg string) {
	switch r {
	case RoleUser, RoleSystem, RoleCopilot:
		return true, ""
	default:
		return false, "invalid role"
	}
}

// ContentType represents the type of content in the message.
type ContentType string

// Supported content types.
const (
	ContentTypeText ContentType = "text"
)

// Validate checks if the content type is valid.
func (c ContentType) Validate() (ok bool, msg string) {
	switch c {
	case ContentTypeText:
		return true, ""
	default:
		return false, "invalid content type"
	}
}

// Content represents the content of the message.
type Content struct {
	Type ContentType `json:"type"`
	Text string      `json:"text"`
}

// Validate checks if the content is valid.
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
