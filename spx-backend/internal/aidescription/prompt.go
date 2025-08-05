package aidescription

import (
	"bytes"
	_ "embed"
	"fmt"
	"text/template"

	"github.com/goplus/builder/spx-backend/internal/embkb"
)

var (
	// systemPromptTemplate is the embedded system prompt template.
	//
	//go:embed system_prompt.md
	systemPromptTemplate string

	// systemPromptTmpl is the parsed template for the system prompt.
	systemPromptTmpl = template.Must(template.New("system_prompt").Parse(systemPromptTemplate))

	// userPromptTemplate is the embedded user prompt template.
	//
	//go:embed user_prompt.md
	userPromptTemplate string

	// userPromptTmpl is the parsed template for the user prompt.
	userPromptTmpl = template.Must(template.New("user_prompt").Parse(userPromptTemplate))
)

// systemPromptData contains the data for rendering the system prompt template.
type systemPromptData struct {
	SpxKnowledge string
}

// buildSystemPrompt builds the system prompt for AI description generation.
func buildSystemPrompt() (string, error) {
	data := systemPromptData{
		SpxKnowledge: embkb.AboutSpx() + "\n\n" + embkb.SpxAPIs(),
	}

	var buf bytes.Buffer
	if err := systemPromptTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to render system prompt template: %w", err)
	}

	return buf.String(), nil
}

// userPromptData contains the data for rendering the user prompt template.
type userPromptData struct {
	Content string
}

// buildUserPrompt builds the user prompt for description generation.
func buildUserPrompt(content string) (string, error) {
	data := userPromptData{
		Content: content,
	}

	var buf bytes.Buffer
	if err := userPromptTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to render user prompt template: %w", err)
	}
	return buf.String(), nil
}
