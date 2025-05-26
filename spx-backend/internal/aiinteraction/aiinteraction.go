package aiinteraction

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/openai/openai-go"
)

const (
	// maxHistoryTurns defines the maximum number of history turns to keep.
	maxHistoryTurns = 10

	// maxContentLength defines the maximum length of content text.
	maxContentLength = 10000

	// maxTokens defines the maximum number of tokens for the AI response.
	maxTokens = 1024

	// temperature defines the sampling temperature for the AI response.
	//
	// NOTE: Although this is set to 1.4, DeepSeek-V3 internally subtracts 0.7,
	// resulting in a final model temperature of 0.7. See
	// https://huggingface.co/deepseek-ai/DeepSeek-V3-0324#temperature.
	temperature = 1.4
)

// AIInteraction represents the structure for interacting with the AI.
type AIInteraction struct {
	openaiClient  openai.Client
	openaiModelID string
}

// New creates a new instance of [AIInteraction].
func New(openaiClient openai.Client, openaiModelID string) (*AIInteraction, error) {
	if openaiModelID == "" {
		return nil, errors.New("missing openai model id")
	}
	return &AIInteraction{
		openaiClient:  openaiClient,
		openaiModelID: openaiModelID,
	}, nil
}

// Interact processes an AI interaction request and returns a response.
func (ai *AIInteraction) Interact(ctx context.Context, request *Request) (*Response, error) {
	systemPrompt, err := renderSystemPrompt(request)
	if err != nil {
		return nil, fmt.Errorf("failed to build system prompt: %w", err)
	}

	messages, err := buildConversationMessages(request)
	if err != nil {
		return nil, fmt.Errorf("failed to build conversation messages: %w", err)
	}

	chatCompletion, err := ai.openaiClient.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Messages:    append([]openai.ChatCompletionMessageParamUnion{openai.SystemMessage(systemPrompt)}, messages...),
		Model:       ai.openaiModelID,
		MaxTokens:   openai.Opt(int64(maxTokens)),
		Temperature: openai.Opt(temperature),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create chat completion: %w", err)
	}
	if len(chatCompletion.Choices) == 0 {
		return nil, errors.New("no choices returned from ai")
	}

	response, err := parseAIResponse(chatCompletion.Choices[0].Message.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ai response: %w", err)
	}
	return response, nil
}

// buildConversationMessages constructs the message history for the AI request.
func buildConversationMessages(request *Request) ([]openai.ChatCompletionMessageParamUnion, error) {
	var messages []openai.ChatCompletionMessageParamUnion

	if len(request.History) > 0 {
		var startIndex int
		if len(request.History) > maxHistoryTurns {
			startIndex = len(request.History) - maxHistoryTurns
		}

		for i := startIndex; i < len(request.History); i++ {
			turn := request.History[i]

			messages = append(messages, openai.UserMessage(turn.RequestContent))

			responseText := turn.ResponseText
			if turn.ResponseCommandName != "" {
				responseCommandArgsJSON, err := json.Marshal(turn.ResponseCommandArgs)
				if err != nil {
					return nil, fmt.Errorf("failed to marshal command arguments: %w", err)
				}
				responseText += fmt.Sprintf("\nCOMMAND: %s\nARGS: %s", turn.ResponseCommandName, responseCommandArgsJSON)
			}
			messages = append(messages, openai.AssistantMessage(responseText))
		}
	}

	userMessage := request.Content
	if len(request.Context) > 0 {
		contextJSON, err := json.Marshal(request.Context)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal context: %w", err)
		}
		userMessage += "\n\nContext: " + string(contextJSON)
	}
	messages = append(messages, openai.UserMessage(userMessage))
	return messages, nil
}

// parseAIResponse extracts the text and command from an AI response.
func parseAIResponse(responseText string) (*Response, error) {
	const (
		commandPrefix = "COMMAND: "
		argsPrefix    = "ARGS: "
	)

	response := &Response{
		Text: responseText,
	}

	cmdIndex := strings.Index(responseText, commandPrefix)
	if cmdIndex == -1 {
		return response, nil
	}

	response.Text = strings.TrimSpace(responseText[:cmdIndex])

	lines := strings.Split(responseText[cmdIndex:], "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if cmdName, ok := strings.CutPrefix(line, commandPrefix); ok {
			response.CommandName = strings.TrimSpace(cmdName)
		} else if cmdArgs, ok := strings.CutPrefix(line, argsPrefix); ok {
			cmdArgs = strings.TrimSpace(cmdArgs)
			if cmdArgs != "" {
				if err := json.Unmarshal([]byte(cmdArgs), &response.CommandArgs); err != nil {
					return nil, fmt.Errorf("failed to parse command arguments: %w", err)
				}
			}
		}
	}
	if response.CommandName == "" && response.CommandArgs != nil {
		return nil, fmt.Errorf("command arguments provided but no command name")
	}

	return response, nil
}
