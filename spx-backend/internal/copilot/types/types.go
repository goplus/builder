package types

import "fmt"

// Constants for the maximum length of content text and other limits.
const (
	MAX_CONTENT_TEXT_LENGTH = 10000
	MAX_MESSAGE_COUNT       = 50
	MAX_TOKENS              = 1024
)

type ToolType string

const (
	ToolTypeFunction ToolType = "function"
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
	Model string `json:"model"`

	Messages []Message `json:"messages"`
	System   Content   `json:"system"`
	Tools    []Tool    `json:"tools,omitempty"` // Additional tools to use in the completion
}

// Tool represents an additional tool to use in the completion
type Tool struct {
	Type ToolType            `json:"type"`               // Type of tool to use
	F    *FunctionDefinition `json:"function,omitempty"` // Function definition
}

// FunctionDefinition represents the definition of a function tool
type FunctionDefinition struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	// Parameters is an object describing the function.
	// You can pass json.RawMessage to describe the schema,
	// or you can pass in a struct which serializes to the proper JSON schema.
	// The jsonschema package is provided for convenience, but you should
	// consider another specialized library if you require more complex schemas.
	Parameters interface{} `json:"parameters"`
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
// It ensures that:
// 1. Content Type is present and valid
// 2. Text is not empty
// 3. Text length does not exceed MAX_CONTENT_TEXT_LENGTH
func (c *Content) Validate() (ok bool, msg string) {
	if c.Type == "" {
		return false, "missing content type"
	}
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
