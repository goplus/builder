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
	// maxHistoryTurns defines the maximum number of detailed history turns to keep.
	maxHistoryTurns = 20

	// archiveThreshold defines when to start archiving history.
	archiveThreshold = 30

	// archiveBatchSize defines how many turns to archive at once.
	archiveBatchSize = 15

	// maxContentLength defines the maximum length of content text.
	maxContentLength = 10000

	// maxTokens defines the maximum number of tokens for the AI response.
	maxTokens = 2048

	// temperature defines the sampling temperature for the AI response.
	//
	// NOTE: Although this is set to 1.4, DeepSeek-V3 internally subtracts 0.7,
	// resulting in a final model temperature of 0.7. See
	// https://huggingface.co/deepseek-ai/DeepSeek-V3-0324#temperature.
	temperature = 1.4
)

// errParseResponse indicates a response parsing error.
var errParseResponse = errors.New("failed to parse ai response")

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
	const formatRetryPromptEnhancement = `
---

**CRITICAL: Your previous response failed to parse due to formatting errors.**

Please carefully review and strictly follow the "Response format" rules specified above.
`

	archivedHistory, request, err := ai.manageHistory(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to manage history: %w", err)
	}

	systemPrompt, err := renderSystemPrompt(request)
	if err != nil {
		return nil, fmt.Errorf("failed to build system prompt: %w", err)
	}

	messages, err := buildConversationMessages(request)
	if err != nil {
		return nil, fmt.Errorf("failed to build conversation messages: %w", err)
	}

	resp, err := ai.callAndParse(ctx, systemPrompt, messages)
	if err != nil {
		if !errors.Is(err, errParseResponse) {
			return nil, err
		}

		// Retry with an enhanced system prompt to help the AI correct its response format.
		enhancedSystemPrompt := systemPrompt + formatRetryPromptEnhancement
		resp, err = ai.callAndParse(ctx, enhancedSystemPrompt, messages)
		if err != nil {
			return nil, err
		}
	}
	if archivedHistory != nil {
		resp.ArchivedHistory = archivedHistory
	}
	return resp, nil
}

// manageHistory checks if history needs archiving and performs it if necessary.
func (ai *AIInteraction) manageHistory(ctx context.Context, request *Request) (*ArchivedHistory, *Request, error) {
	archiveCount := calculateTurnsToArchive(request)
	if archiveCount == 0 {
		return nil, request, nil
	}
	turnsToArchive := request.History[:archiveCount]

	// Generate archive.
	systemPrompt, err := renderArchiveSystemPrompt(request.ArchivedHistory, turnsToArchive)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to render archive system prompt: %w", err)
	}
	messages := []openai.ChatCompletionMessageParamUnion{openai.UserMessage("Please create the archive as specified.")}
	newArchive, err := ai.callOpenAI(ctx, systemPrompt, messages)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to archive history: %w", err)
	}

	archivedHistory := &ArchivedHistory{
		Content:   newArchive,
		TurnCount: archiveCount,
	}

	processedRequest := applyArchivedHistory(request, archivedHistory)
	return archivedHistory, processedRequest, nil
}

// calculateTurnsToArchive calculates how many turns need to be archived. It
// returns 0 if no archiving is needed.
func calculateTurnsToArchive(request *Request) int {
	totalTurns := len(request.History)

	if request.ArchivedHistory == "" && totalTurns >= archiveThreshold {
		// First-time archiving: archive turns to reach target history size.
		return totalTurns - maxHistoryTurns
	} else if request.ArchivedHistory != "" && totalTurns >= maxHistoryTurns+archiveBatchSize {
		// Subsequent archiving: archive a fixed batch size.
		return archiveBatchSize
	}

	// No archiving needed.
	return 0
}

// applyArchivedHistory creates a new request with updated history after archiving.
func applyArchivedHistory(request *Request, archivedHistory *ArchivedHistory) *Request {
	processedRequest := *request
	processedRequest.History = request.History[archivedHistory.TurnCount:]
	processedRequest.ArchivedHistory = archivedHistory.Content
	return &processedRequest
}

// callAndParse makes an API call and parses the response.
func (ai *AIInteraction) callAndParse(ctx context.Context, systemPrompt string, messages []openai.ChatCompletionMessageParamUnion) (*Response, error) {
	resp, err := ai.callOpenAI(ctx, systemPrompt, messages)
	if err != nil {
		return nil, err
	}
	return parseAIResponse(resp)
}

// callOpenAI makes the actual API call to OpenAI
func (ai *AIInteraction) callOpenAI(ctx context.Context, systemPrompt string, messages []openai.ChatCompletionMessageParamUnion) (string, error) {
	chatCompletion, err := ai.openaiClient.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Messages:    append([]openai.ChatCompletionMessageParamUnion{openai.SystemMessage(systemPrompt)}, messages...),
		Model:       ai.openaiModelID,
		MaxTokens:   openai.Opt(int64(maxTokens)),
		Temperature: openai.Opt(temperature),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create chat completion: %w", err)
	}
	if len(chatCompletion.Choices) == 0 {
		return "", errors.New("no choices returned from ai")
	}
	return chatCompletion.Choices[0].Message.Content, nil
}

// buildConversationMessages constructs the message history for the AI request.
func buildConversationMessages(request *Request) ([]openai.ChatCompletionMessageParamUnion, error) {
	var messages []openai.ChatCompletionMessageParamUnion
	if request.ContinuationTurn > 0 {
		messages = append(messages, openai.UserMessage("Please continue with the next action based on the previous command result."))
	} else {
		userMessage := request.Content
		if userMessage == "" {
			return nil, errors.New("missing user content in request")
		}
		if len(request.Context) > 0 {
			contextJSON, err := json.Marshal(request.Context)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal context: %w", err)
			}
			userMessage += "\n\nContext: " + string(contextJSON)
		}
		messages = append(messages, openai.UserMessage(userMessage))
	}
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
					return nil, fmt.Errorf("%w: failed to parse command arguments: %v", errParseResponse, err)
				}
			}
		}
	}
	if response.CommandName == "" && response.CommandArgs != nil {
		return nil, fmt.Errorf("%w: command arguments provided but no command name", errParseResponse)
	}

	return response, nil
}
