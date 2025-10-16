package aiinteraction

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/openai/openai-go/v2"
)

const (
	// maxTokens defines the maximum number of tokens for the AI response.
	maxTokens = 2048

	// temperature assumes DeepSeek-based deployments and keeps gameplay
	// agents stable with zero randomness.
	//
	// See https://api-docs.deepseek.com/quick_start/parameter_settings.
	temperature = 0.0
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
		Text: choice.Message.Content,
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
		archivedHistoryMsg := fmt.Sprintf("Archived history summary from earlier interaction sequences:\n\n%s", request.ArchivedHistory)
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
		// Mark sequence boundaries for better context understanding.
		if turn.IsInitial && i > 0 {
			msgs = append(msgs, openai.SystemMessage("--- New interaction sequence ---"))
		}

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
			if turn.ResponseCommandName != "" {
				// Generate a unique tool call ID for this historical turn.
				toolCallID := fmt.Sprintf("call_%d_%s", i, turn.ResponseCommandName)

				// Marshal arguments if present.
				args := "{}"
				if len(turn.ResponseCommandArgs) > 0 {
					argsJSON, err := json.Marshal(turn.ResponseCommandArgs)
					if err != nil {
						return nil, fmt.Errorf("failed to marshal response command args for turn: %w", err)
					}
					args = string(argsJSON)
				}

				// Create assistant message with function call.
				assistantMsg := openai.ChatCompletionMessageParamUnion{
					OfAssistant: &openai.ChatCompletionAssistantMessageParam{
						Content: openai.ChatCompletionAssistantMessageParamContentUnion{
							OfString: openai.Opt(turn.ResponseText),
						},
						ToolCalls: []openai.ChatCompletionMessageToolCallUnionParam{
							{
								OfFunction: &openai.ChatCompletionMessageFunctionToolCallParam{
									ID: toolCallID,
									Function: openai.ChatCompletionMessageFunctionToolCallFunctionParam{
										Name:      turn.ResponseCommandName,
										Arguments: args,
									},
								},
							},
						},
					},
				}
				msgs = append(msgs, assistantMsg)

				// Add command execution result as a tool message if present.
				if turn.ExecutedCommandResult != nil {
					// Format the result content.
					var resultContent string
					if turn.ExecutedCommandResult.Success {
						resultContent = "Success"
						if turn.ExecutedCommandResult.IsBreak {
							resultContent += " with BREAK signal"
						}
					} else {
						resultContent = fmt.Sprintf("Error: %s", turn.ExecutedCommandResult.ErrorMessage)
					}
					msgs = append(msgs, openai.ToolMessage(resultContent, toolCallID))
				}
			} else {
				msgs = append(msgs, openai.AssistantMessage(turn.ResponseText))
			}
		}
	}

	// Handle current turn based on interaction phase.
	if request.ContinuationTurn == 0 {
		// Validate that we have user content.
		if request.Content == "" {
			return nil, errors.New("missing user content in request")
		}

		msgs = append(msgs, openai.SystemMessage("This is the initial turn."))

		userMessage := request.Content
		if len(request.Context) > 0 {
			contextJSON, err := json.Marshal(request.Context)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal context: %w", err)
			}
			userMessage += fmt.Sprintf("\n\nContext:\n\n%s", string(contextJSON))
		}
		msgs = append(msgs, openai.UserMessage(userMessage))
	} else {
		// Validate that we have history to continue from.
		if len(request.History) == 0 {
			return nil, errors.New("missing history for continuation turn")
		}
		msgs = append(
			msgs,
			openai.SystemMessage("This is a continuation turn. Review the command execution results in the conversation history, particularly the most recent one, to determine the next action."),
			openai.UserMessage("Continue."),
		)
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

// Archive processes interaction turns and creates or updates an archive.
func (ai *AIInteraction) Archive(ctx context.Context, turnsToArchive []Turn, existingArchive string) (*ArchivedHistory, error) {
	if len(turnsToArchive) == 0 {
		return nil, errors.New("no turns to archive")
	}

	var msgs []openai.ChatCompletionMessageParamUnion

	// Add system prompt as the first system message.
	msgs = append(msgs, openai.SystemMessage(archiveSystemPrompt))

	// Add existing archive as assistant message if present.
	if existingArchive != "" {
		archivedHistoryMsg := fmt.Sprintf("Here is the current archive:\n\n%s", existingArchive)
		msgs = append(msgs, openai.AssistantMessage(archivedHistoryMsg))
	}

	// Add turns to archive as user message.
	turnsToArchiveJSON, err := json.Marshal(turnsToArchive)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal turns to archive: %w", err)
	}
	turnsToArchiveMsg := fmt.Sprintf("New interaction turns to archive:\n\n%s", string(turnsToArchiveJSON))
	msgs = append(msgs, openai.UserMessage(turnsToArchiveMsg))

	choice, err := ai.callOpenAI(ctx, msgs, nil, false)
	if err != nil {
		return nil, fmt.Errorf("failed to archive history: %w", err)
	}

	archivedHistory := &ArchivedHistory{
		Content: choice.Message.Content,
	}
	return archivedHistory, nil
}
