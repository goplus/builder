package imagegen

import (
	_ "embed"
)

//go:embed system_prompt.md
var systemPromptTpl string

// SystemPrompt is the fully rendered system prompt used to instruct the image generation assistant.
// It is initialized during package initialization.
var SystemPrompt string

func init() {
	// The system prompt for image generation is static and doesn't need template processing
	SystemPrompt = systemPromptTpl
}