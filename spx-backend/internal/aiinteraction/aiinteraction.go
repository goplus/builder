package aiinteraction

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/openai/openai-go/v2"
)

const (
	// maxHistoryTurns defines the maximum number of detailed history turns to keep.
	maxHistoryTurns = 20

	// archiveThreshold defines when to start archiving history.
	archiveThreshold = 30

	// archiveBatchSize defines how many turns to archive at once.
	archiveBatchSize = 15

	// maxTokens defines the maximum number of tokens for the AI response.
	maxTokens = 2048

	// temperature defines the sampling temperature for the AI response.
	temperature = 0.6
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

// callOpenAI makes the actual API call to OpenAI and returns the first choice.
func (ai *AIInteraction) callOpenAI(ctx context.Context, messages []openai.ChatCompletionMessageParamUnion, tools []openai.ChatCompletionToolUnionParam, requiredToolCall bool) (openai.ChatCompletionChoice, error) {
	params := openai.ChatCompletionNewParams{
		Messages:    messages,
		Model:       ai.openaiModelID,
		MaxTokens:   openai.Opt(int64(maxTokens)),
		Temperature: openai.Opt(temperature),
	}
	if len(tools) > 0 {
		params.Tools = tools
		toolChoiceOptionAuto := openai.ChatCompletionToolChoiceOptionAutoAuto
		if requiredToolCall {
			toolChoiceOptionAuto = openai.ChatCompletionToolChoiceOptionAutoRequired
		}
		params.ToolChoice = openai.ChatCompletionToolChoiceOptionUnionParam{OfAuto: openai.Opt(string(toolChoiceOptionAuto))}
		params.ParallelToolCalls = openai.Opt(false)
	}

	chatCompletion, err := ai.openaiClient.Chat.Completions.New(ctx, params)
	if err != nil {
		return openai.ChatCompletionChoice{}, fmt.Errorf("failed to create chat completion: %w", err)
	}
	if len(chatCompletion.Choices) == 0 {
		return openai.ChatCompletionChoice{}, errors.New("no choices returned from ai")
	}
	return chatCompletion.Choices[0], nil
}

// Interact processes an AI interaction request and returns a response.
func (ai *AIInteraction) Interact(ctx context.Context, request *Request) (*Response, error) {
	archivedHistory, request, err := ai.manageHistory(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to manage history: %w", err)
	}

	messages, err := buildMessages(request)
	if err != nil {
		return nil, fmt.Errorf("failed to build conversation messages: %w", err)
	}

	tools := convertCommandSpecsToTools(request.CommandSpecs)

	choice, err := ai.callOpenAI(ctx, messages, tools, request.ContinuationTurn == 0)
	if err != nil {
		return nil, err
	}

	resp := &Response{
		Text:            choice.Message.Content,
		ArchivedHistory: archivedHistory,
	}
	if len(choice.Message.ToolCalls) > 0 {
		// NOTE: We only process the first tool call to maintain the
		// single-command constraint required by the game's turn-based
		// interaction model.
		toolCall := choice.Message.ToolCalls[0]

		resp.CommandName = toolCall.Function.Name
		if toolCall.Function.Arguments != "" {
			if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &resp.CommandArgs); err != nil {
				return nil, fmt.Errorf("failed to parse tool call arguments for command %q: %w", toolCall.Function.Name, err)
			}
		}
	}
	return resp, nil
}

// buildMessages constructs the message sequence from the interaction request.
func buildMessages(request *Request) ([]openai.ChatCompletionMessageParamUnion, error) {
	var msgs []openai.ChatCompletionMessageParamUnion

	// Add system prompt as the first system message.
	msgs = append(msgs, openai.SystemMessage(systemPrompt))

	// Add role as additional system message if present.
	if request.Role != "" {
		roleMsg := fmt.Sprintf("Your assigned role in this game:\n\n%s", request.Role)
		msgs = append(msgs, openai.SystemMessage(roleMsg))

		if len(request.RoleContext) > 0 {
			roleContextJSON, err := json.Marshal(request.RoleContext)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal role context: %w", err)
			}
			roleContextMsg := fmt.Sprintf("Additional context for your role:\n\n%s", string(roleContextJSON))
			msgs = append(msgs, openai.SystemMessage(roleContextMsg))
		}
	}

	// Add knowledge base as additional system message if present.
	if len(request.KnowledgeBase) > 0 {
		knowledgeBaseJSON, err := json.Marshal(request.KnowledgeBase)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal knowledge base: %w", err)
		}
		knowledgeBaseMsg := fmt.Sprintf("Background knowledge about the game world and context:\n\n%s", string(knowledgeBaseJSON))
		msgs = append(msgs, openai.SystemMessage(knowledgeBaseMsg))
	}

	// Add archived history as assistant message if present.
	if request.ArchivedHistory != "" {
		archivedHistoryMsg := fmt.Sprintf("Session history summary from earlier interactions:\n\n%s", request.ArchivedHistory)
		msgs = append(msgs, openai.AssistantMessage(archivedHistoryMsg))
	}

	// Find the start of the current interaction sequence (initial turn + continuation turns).
	//
	// We need to preserve full context for the current interaction sequence, but can omit
	// context for previous interaction sequences to save tokens.
	currentInteractionSeqStart := 0
	for i := len(request.History) - 1; i >= 0; i-- {
		if request.History[i].IsInitial {
			currentInteractionSeqStart = i
			break
		}
	}

	// Build conversation history from previous turns.
	for i, turn := range request.History {
		// Add user request message.
		if turn.RequestContent != "" {
			userMsg := turn.RequestContent

			// Only include context for turns in the current interaction sequence.
			if i >= currentInteractionSeqStart && len(turn.RequestContext) > 0 {
				contextJSON, err := json.Marshal(turn.RequestContext)
				if err != nil {
					return nil, fmt.Errorf("failed to marshal turn context: %w", err)
				}
				userMsg += fmt.Sprintf("\n\nContext:\n\n%s", string(contextJSON))
			}

			msgs = append(msgs, openai.UserMessage(userMsg))
		}

		// Add AI response message with function call information.
		if turn.ResponseText != "" || turn.ResponseCommandName != "" {
			assistantMsg := turn.ResponseText
			if turn.ResponseCommandName != "" {
				if assistantMsg != "" {
					assistantMsg += "\n\n"
				}
				assistantMsg += fmt.Sprintf("Function call: %s", turn.ResponseCommandName)
				if len(turn.ResponseCommandArgs) > 0 {
					argsJSON, err := json.Marshal(turn.ResponseCommandArgs)
					if err != nil {
						return nil, fmt.Errorf("failed to marshal response command args for turn: %w", err)
					}
					assistantMsg += " with arguments " + string(argsJSON)
				}
			}
			msgs = append(msgs, openai.AssistantMessage(assistantMsg))
		}

		// Add command execution result as a separate user message if present.
		if turn.ResponseCommandName != "" && turn.ExecutedCommandResult != nil {
			resultMsg := fmt.Sprintf("Function call %s", turn.ResponseCommandName)
			if turn.ExecutedCommandResult.Success {
				resultMsg += " succeeded."
			} else {
				resultMsg += " failed: " + turn.ExecutedCommandResult.ErrorMessage
			}
			if turn.ExecutedCommandResult.IsBreak {
				resultMsg += " [Interaction terminated]"
			}
			msgs = append(msgs, openai.UserMessage(resultMsg))
		}
	}

	// Handle current turn based on interaction phase.
	if request.ContinuationTurn == 0 {
		// Initial turn: AI must execute exactly one command.
		msgs = append(msgs, openai.SystemMessage("This is the initial response."))

		// Add user content for initial turn.
		userMessage := request.Content
		if userMessage == "" {
			return nil, errors.New("missing user content in request")
		}
		if len(request.Context) > 0 {
			contextJSON, err := json.Marshal(request.Context)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal context: %w", err)
			}
			userMessage += fmt.Sprintf("\n\nContext:\n\n%s", string(contextJSON))
		}
		msgs = append(msgs, openai.UserMessage(userMessage))
	} else {
		// Continuation turn: flexible command execution.
		msgs = append(msgs, openai.SystemMessage("This is a continuation turn."))

		// Add previous command result as user message.
		if request.PreviousCommandResult == nil {
			return nil, fmt.Errorf("missing previous command result in continuation turn %d", request.ContinuationTurn)
		}
		var resultMsg string
		if request.PreviousCommandResult.Success {
			resultMsg = "The previous function call succeeded."
		} else {
			resultMsg = fmt.Sprintf("The previous function call failed: %s", request.PreviousCommandResult.ErrorMessage)
		}
		msgs = append(msgs, openai.UserMessage(resultMsg))
	}

	return msgs, nil
}

// convertCommandSpecsToTools converts command specs to OpenAI tool definitions.
func convertCommandSpecsToTools(commandSpecs []CommandSpec) []openai.ChatCompletionToolUnionParam {
	if len(commandSpecs) == 0 {
		return nil
	}

	tools := make([]openai.ChatCompletionToolUnionParam, 0, len(commandSpecs))
	for _, spec := range commandSpecs {
		properties := make(map[string]any, len(spec.Parameters))
		required := make([]string, 0, len(spec.Parameters))
		for _, param := range spec.Parameters {
			properties[param.Name] = map[string]string{
				"type":        convertGoTypeToJSONSchemaType(param.Type),
				"description": param.Description,
			}
			required = append(required, param.Name)
		}

		tool := openai.ChatCompletionFunctionTool(openai.FunctionDefinitionParam{
			Name:        spec.Name,
			Description: openai.Opt(spec.Description),
			Parameters: openai.FunctionParameters{
				"type":                 "object",
				"properties":           properties,
				"required":             required,
				"additionalProperties": false,
			},
			Strict: openai.Opt(true), // Enable strict mode for reliable parameter validation.
		})
		tools = append(tools, tool)
	}
	return tools
}

// convertGoTypeToJSONSchemaType converts Go type strings to JSON Schema types.
func convertGoTypeToJSONSchemaType(goType string) string {
	switch goType {
	case "string":
		return "string"
	case "int8", "int16", "int", "int32", "int64",
		"uint8", "uint16", "uint", "uint32", "uint64":
		return "integer"
	case "float32", "float64":
		return "number"
	case "bool":
		return "boolean"
	default:
		// For complex types like slices, maps, or custom types, default to object.
		return "object"
	}
}

// manageHistory checks if history needs archiving and performs it if necessary.
func (ai *AIInteraction) manageHistory(ctx context.Context, request *Request) (*ArchivedHistory, *Request, error) {
	archiveCount := calculateTurnsToArchive(request)
	if archiveCount == 0 {
		return nil, request, nil
	}
	turnsToArchive := request.History[:archiveCount]

	var msgs []openai.ChatCompletionMessageParamUnion

	// Add system prompt as the first system message.
	msgs = append(msgs, openai.SystemMessage(archiveSystemPrompt))

	// Add existing archive as assistant message if present.
	if request.ArchivedHistory != "" {
		archivedHistoryMsg := fmt.Sprintf("Here is the current archive:\n\n%s", request.ArchivedHistory)
		msgs = append(msgs, openai.AssistantMessage(archivedHistoryMsg))
	}

	// Add turns to archive as user message.
	turnsToArchiveJSON, err := json.Marshal(turnsToArchive)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal turns to archive: %w", err)
	}
	turnsToArchiveMsg := fmt.Sprintf("New interaction turns to archive:\n\n%s", string(turnsToArchiveJSON))
	msgs = append(msgs, openai.UserMessage(turnsToArchiveMsg))

	choice, err := ai.callOpenAI(ctx, msgs, nil, false)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to archive history: %w", err)
	}

	archivedHistory := &ArchivedHistory{
		Content:   choice.Message.Content,
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
