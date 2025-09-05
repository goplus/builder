package aidescription

import (
	"context"
	"errors"
	"fmt"

	"github.com/openai/openai-go/v2"
)

const (
	// maxTokens defines the maximum number of tokens for the AI response.
	maxTokens = 8192

	// temperature defines the sampling temperature for the AI response.
	temperature = 0.7
)

var (
	// errNoResponse indicates no response from AI.
	errNoResponse = errors.New("no response from ai")

	// errEmptyResponse indicates empty response from AI.
	errEmptyResponse = errors.New("empty response from ai")
)

// AIDescription provides AI-powered game description generation functionality.
type AIDescription struct {
	openaiClient  openai.Client
	openaiModelID string
}

// New creates a new instance of [AIDescription].
func New(openaiClient openai.Client, openaiModelID string) (*AIDescription, error) {
	if openaiModelID == "" {
		return nil, errors.New("missing openai model id")
	}
	return &AIDescription{
		openaiClient:  openaiClient,
		openaiModelID: openaiModelID,
	}, nil
}

// Generate generates an AI-powered descriptive summary of the game world from
// the player's perspective based on the provided game content.
func (a *AIDescription) Generate(ctx context.Context, content string) (string, error) {
	systemPrompt, err := buildSystemPrompt()
	if err != nil {
		return "", fmt.Errorf("failed to build system prompt: %w", err)
	}

	userPrompt, err := buildUserPrompt(content)
	if err != nil {
		return "", fmt.Errorf("failed to build user prompt: %w", err)
	}

	params := a.buildChatCompletionParams(systemPrompt, userPrompt)
	resp, err := a.openaiClient.Chat.Completions.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("failed to call openai api: %w", err)
	}

	desc, err := extractDescription(resp)
	if err != nil {
		return "", fmt.Errorf("failed to extract description: %w", err)
	}
	return desc, nil
}

// buildChatCompletionParams builds the parameters for OpenAI chat completion.
func (a *AIDescription) buildChatCompletionParams(systemPrompt, userPrompt string) openai.ChatCompletionNewParams {
	return openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userPrompt),
		},
		Model:       a.openaiModelID,
		MaxTokens:   openai.Opt(int64(maxTokens)),
		Temperature: openai.Opt(temperature),
	}
}

// extractDescription extracts the description from AI response.
func extractDescription(response *openai.ChatCompletion) (string, error) {
	if len(response.Choices) == 0 {
		return "", errNoResponse
	}

	content := response.Choices[0].Message.Content
	if content == "" {
		return "", errEmptyResponse
	}
	return content, nil
}
