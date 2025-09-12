package aiinteraction

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildMessages(t *testing.T) {
	t.Run("BasicRequest", func(t *testing.T) {
		request := &Request{
			Content: "Hello, AI",
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 3)

		systemMsg := messages[0].OfSystem
		require.NotNil(t, systemMsg)
		assert.Contains(t, systemMsg.Content.OfString.Value, "AI player in XBuilder")

		turnMsg := messages[1].OfSystem
		require.NotNil(t, turnMsg)
		assert.Equal(t, "This is the initial turn.", turnMsg.Content.OfString.Value)

		userMsg := messages[2].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Hello, AI", userMsg.Content.OfString.Value)
	})

	t.Run("RequestWithContext", func(t *testing.T) {
		request := &Request{
			Content: "Move player",
			Context: map[string]any{
				"playerPos": map[string]int{"x": 10, "y": 20},
				"gameState": "active",
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 3)

		userMsg := messages[2].OfUser
		require.NotNil(t, userMsg)
		content := userMsg.Content.OfString.Value
		assert.Contains(t, content, "Move player")
		assert.Contains(t, content, "Context:")
		assert.Contains(t, content, "playerPos")
		assert.Contains(t, content, "gameState")
	})

	t.Run("RequestWithRole", func(t *testing.T) {
		request := &Request{
			Content: "Test message",
			Role:    "friendly NPC",
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 4)

		assert.NotNil(t, messages[0].OfSystem)

		roleMsg := messages[1].OfSystem
		require.NotNil(t, roleMsg)
		assert.Contains(t, roleMsg.Content.OfString.Value, "Your assigned role in this game:")
		assert.Contains(t, roleMsg.Content.OfString.Value, "friendly NPC")
	})

	t.Run("RequestWithRoleContext", func(t *testing.T) {
		request := &Request{
			Content: "Test message",
			Role:    "shopkeeper",
			RoleContext: map[string]any{
				"shop": "weapons",
				"gold": 1000,
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 5)

		roleContextMsg := messages[2].OfSystem
		require.NotNil(t, roleContextMsg)
		assert.Contains(t, roleContextMsg.Content.OfString.Value, "Additional context for your role:")
		assert.Contains(t, roleContextMsg.Content.OfString.Value, "shop")
		assert.Contains(t, roleContextMsg.Content.OfString.Value, "weapons")
	})

	t.Run("RequestWithKnowledgeBase", func(t *testing.T) {
		request := &Request{
			Content: "Test message",
			KnowledgeBase: map[string]any{
				"worldName": "Fantasy Realm",
				"rules":     []string{"no magic", "turn-based"},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 4)

		kbMsg := messages[1].OfSystem
		require.NotNil(t, kbMsg)
		assert.Contains(t, kbMsg.Content.OfString.Value, "Background knowledge about the game world and context:")
		assert.Contains(t, kbMsg.Content.OfString.Value, "Fantasy Realm")
		assert.Contains(t, kbMsg.Content.OfString.Value, "turn-based")
	})

	t.Run("RequestWithArchivedHistory", func(t *testing.T) {
		request := &Request{
			Content:         "Continue game",
			ArchivedHistory: "Previous interactions: Player explored the forest and found a treasure chest.",
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 4)

		archiveMsg := messages[1].OfAssistant
		require.NotNil(t, archiveMsg)
		assert.Contains(t, archiveMsg.Content.OfString.Value, "Archived history summary from earlier interaction sequences:")
		assert.Contains(t, archiveMsg.Content.OfString.Value, "Player explored the forest")
	})

	t.Run("RequestWithTurnHistory", func(t *testing.T) {
		request := &Request{
			Content: "Next action",
			History: []Turn{
				{
					RequestContent: "Look around",
					ResponseText:   "You see a forest path",
				},
				{
					RequestContent: "Walk forward",
					ResponseText:   "You encounter a wolf",
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 7)

		userMsg1 := messages[1].OfUser
		require.NotNil(t, userMsg1)
		assert.Equal(t, "Look around", userMsg1.Content.OfString.Value)

		assistantMsg1 := messages[2].OfAssistant
		require.NotNil(t, assistantMsg1)
		assert.Equal(t, "You see a forest path", assistantMsg1.Content.OfString.Value)

		userMsg2 := messages[3].OfUser
		require.NotNil(t, userMsg2)
		assert.Equal(t, "Walk forward", userMsg2.Content.OfString.Value)

		assistantMsg2 := messages[4].OfAssistant
		require.NotNil(t, assistantMsg2)
		assert.Equal(t, "You encounter a wolf", assistantMsg2.Content.OfString.Value)
	})

	t.Run("HistoryWithCommandExecution", func(t *testing.T) {
		request := &Request{
			Content: "Next action",
			History: []Turn{
				{
					RequestContent:      "Attack the enemy",
					ResponseText:        "I'll attack now",
					ResponseCommandName: "Attack",
					ResponseCommandArgs: map[string]any{"target": "goblin", "weapon": "sword"},
					ExecutedCommandResult: &CommandResult{
						Success: true,
					},
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 6)

		assistantMsg := messages[2].OfAssistant
		require.NotNil(t, assistantMsg)
		assistantContent := assistantMsg.Content.OfString.Value
		assert.Contains(t, assistantContent, "I'll attack now")

		// Check tool calls
		require.Len(t, assistantMsg.ToolCalls, 1)
		toolCall := assistantMsg.ToolCalls[0].OfFunction
		require.NotNil(t, toolCall)
		assert.Equal(t, "Attack", toolCall.Function.Name)
		assert.Contains(t, toolCall.Function.Arguments, "target")
		assert.Contains(t, toolCall.Function.Arguments, "goblin")

		// Check tool message for result
		resultMsg := messages[3].OfTool
		require.NotNil(t, resultMsg)
		resultContent := resultMsg.Content.OfString.Value
		assert.Equal(t, "Success", resultContent)
	})

	t.Run("HistoryWithFailedCommands", func(t *testing.T) {
		request := &Request{
			Content: "Try again",
			History: []Turn{
				{
					RequestContent:      "Open the door",
					ResponseText:        "Attempting to open",
					ResponseCommandName: "OpenDoor",
					ResponseCommandArgs: map[string]any{"doorId": "main"},
					ExecutedCommandResult: &CommandResult{
						Success:      false,
						ErrorMessage: "Door is locked",
					},
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 6)

		assistantMsg := messages[2].OfAssistant
		require.NotNil(t, assistantMsg)
		assistantContent := assistantMsg.Content.OfString.Value
		assert.Contains(t, assistantContent, "Attempting to open")

		// Check tool calls
		require.Len(t, assistantMsg.ToolCalls, 1)
		toolCall := assistantMsg.ToolCalls[0].OfFunction
		require.NotNil(t, toolCall)
		assert.Equal(t, "OpenDoor", toolCall.Function.Name)
		assert.Contains(t, toolCall.Function.Arguments, "doorId")

		// Check tool message for result
		resultMsg := messages[3].OfTool
		require.NotNil(t, resultMsg)
		resultContent := resultMsg.Content.OfString.Value
		assert.Equal(t, "Error: Door is locked", resultContent)
	})

	t.Run("HistoryWithBreakCommands", func(t *testing.T) {
		request := &Request{
			Content: "Continue",
			History: []Turn{
				{
					RequestContent:      "Exit game",
					ResponseText:        "Goodbye!",
					ResponseCommandName: "ExitGame",
					ExecutedCommandResult: &CommandResult{
						Success: true,
						IsBreak: true,
					},
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 6)

		assistantMsg := messages[2].OfAssistant
		require.NotNil(t, assistantMsg)
		assistantContent := assistantMsg.Content.OfString.Value
		assert.Contains(t, assistantContent, "Goodbye!")

		// Check tool calls
		require.Len(t, assistantMsg.ToolCalls, 1)
		toolCall := assistantMsg.ToolCalls[0].OfFunction
		require.NotNil(t, toolCall)
		assert.Equal(t, "ExitGame", toolCall.Function.Name)

		// Check tool message for result
		resultMsg := messages[3].OfTool
		require.NotNil(t, resultMsg)
		resultContent := resultMsg.Content.OfString.Value
		assert.Equal(t, "Success with BREAK signal", resultContent)
	})

	t.Run("InitialTurn", func(t *testing.T) {
		request := &Request{
			Content:          "Start game",
			ContinuationTurn: 0,
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 3)

		turnMsg := messages[1].OfSystem
		require.NotNil(t, turnMsg)
		assert.Equal(t, "This is the initial turn.", turnMsg.Content.OfString.Value)

		userMsg := messages[2].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Start game", userMsg.Content.OfString.Value)
	})

	t.Run("ContinuationTurnSuccess", func(t *testing.T) {
		request := &Request{
			ContinuationTurn: 1,
			History: []Turn{
				{
					RequestContent:      "Start game",
					ResponseText:        "Starting",
					ResponseCommandName: "Initialize",
					ExecutedCommandResult: &CommandResult{
						Success: true,
					},
					IsInitial: true,
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 6) // System, User, Assistant (with tool call), Tool (result), System (continuation), User (continue)

		// Check continuation turn system message
		turnMsg := messages[4].OfSystem
		require.NotNil(t, turnMsg)
		assert.Contains(t, turnMsg.Content.OfString.Value, "continuation turn")
		assert.Contains(t, turnMsg.Content.OfString.Value, "command execution results")

		// Check continuation user message
		userMsg := messages[5].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Continue.", userMsg.Content.OfString.Value)
	})

	t.Run("ContinuationTurnFailure", func(t *testing.T) {
		request := &Request{
			ContinuationTurn: 2,
			History: []Turn{
				{
					RequestContent:      "Move north",
					ResponseText:        "Moving",
					ResponseCommandName: "MovePlayer",
					ResponseCommandArgs: map[string]any{"direction": "north"},
					ExecutedCommandResult: &CommandResult{
						Success:      false,
						ErrorMessage: "Invalid move",
					},
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 6) // System, User, Assistant (with tool call), Tool (result), System (continuation), User (continue)

		// Check the tool message in history has the error
		historyToolMsg := messages[3].OfTool
		require.NotNil(t, historyToolMsg)
		assert.Equal(t, "Error: Invalid move", historyToolMsg.Content.OfString.Value)
		assert.Equal(t, "call_0_MovePlayer", historyToolMsg.ToolCallID)

		// Check continuation messages
		turnMsg := messages[4].OfSystem
		require.NotNil(t, turnMsg)
		assert.Contains(t, turnMsg.Content.OfString.Value, "continuation turn")

		userMsg := messages[5].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Continue.", userMsg.Content.OfString.Value)
	})

	t.Run("MissingContentInInitialTurn", func(t *testing.T) {
		request := &Request{
			ContinuationTurn: 0,
		}

		messages, err := buildMessages(request)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing user content in request")
		assert.Nil(t, messages)
	})

	t.Run("MissingHistoryInContinuation", func(t *testing.T) {
		request := &Request{
			ContinuationTurn: 1,
		}

		messages, err := buildMessages(request)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing history for continuation turn")
		assert.Nil(t, messages)
	})

	t.Run("InvalidJSONSerialization", func(t *testing.T) {
		request := &Request{
			Content: "Test",
			Context: map[string]any{
				"circular": nil,
			},
		}

		// Create circular reference
		circular := make(map[string]any)
		circular["self"] = circular
		request.Context["circular"] = circular

		messages, err := buildMessages(request)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to marshal context")
		assert.Nil(t, messages)
	})

	t.Run("CompleteScenario", func(t *testing.T) {
		request := &Request{
			Content: "Final battle",
			Context: map[string]any{
				"playerLevel": 10,
				"boss":        "Dragon King",
			},
			Role: "brave warrior",
			RoleContext: map[string]any{
				"weapon": "legendary sword",
				"armor":  "enchanted mail",
			},
			KnowledgeBase: map[string]any{
				"setting": "medieval fantasy",
				"quest":   "save the kingdom",
			},
			ArchivedHistory: "Long adventure through many lands...",
			History: []Turn{
				{
					RequestContent:      "Prepare for battle",
					RequestContext:      map[string]any{"location": "castle"},
					ResponseText:        "I ready my weapon",
					ResponseCommandName: "PrepareWeapon",
					ResponseCommandArgs: map[string]any{"weapon": "sword"},
					ExecutedCommandResult: &CommandResult{
						Success: true,
					},
				},
			},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 10)

		assert.NotNil(t, messages[0].OfSystem)

		roleMsg := messages[1].OfSystem
		require.NotNil(t, roleMsg)
		assert.Contains(t, roleMsg.Content.OfString.Value, "brave warrior")

		roleContextMsg := messages[2].OfSystem
		require.NotNil(t, roleContextMsg)
		assert.Contains(t, roleContextMsg.Content.OfString.Value, "legendary sword")

		kbMsg := messages[3].OfSystem
		require.NotNil(t, kbMsg)
		assert.Contains(t, kbMsg.Content.OfString.Value, "medieval fantasy")

		archiveMsg := messages[4].OfAssistant
		require.NotNil(t, archiveMsg)
		assert.Contains(t, archiveMsg.Content.OfString.Value, "Long adventure")

		historyUserMsg := messages[5].OfUser
		require.NotNil(t, historyUserMsg)
		assert.Contains(t, historyUserMsg.Content.OfString.Value, "Prepare for battle")
		assert.Contains(t, historyUserMsg.Content.OfString.Value, "location")

		historyAssistantMsg := messages[6].OfAssistant
		require.NotNil(t, historyAssistantMsg)
		assert.Contains(t, historyAssistantMsg.Content.OfString.Value, "I ready my weapon")

		// Check tool calls in history
		require.Len(t, historyAssistantMsg.ToolCalls, 1)
		toolCall := historyAssistantMsg.ToolCalls[0].OfFunction
		require.NotNil(t, toolCall)
		assert.Equal(t, "PrepareWeapon", toolCall.Function.Name)
		assert.Contains(t, toolCall.Function.Arguments, "weapon")

		// Check tool message for result
		historyResultMsg := messages[7].OfTool
		require.NotNil(t, historyResultMsg)
		assert.Equal(t, "Success", historyResultMsg.Content.OfString.Value)

		turnMsg := messages[8].OfSystem
		require.NotNil(t, turnMsg)
		assert.Equal(t, "This is the initial turn.", turnMsg.Content.OfString.Value)

		finalUserMsg := messages[9].OfUser
		require.NotNil(t, finalUserMsg)
		assert.Contains(t, finalUserMsg.Content.OfString.Value, "Final battle")
		assert.Contains(t, finalUserMsg.Content.OfString.Value, "Dragon King")
	})

	t.Run("EmptyValues", func(t *testing.T) {
		request := &Request{
			Content:         "Test",
			Context:         map[string]any{},
			Role:            "",
			RoleContext:     map[string]any{},
			KnowledgeBase:   map[string]any{},
			ArchivedHistory: "",
			History:         []Turn{},
		}

		messages, err := buildMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 3)

		assert.NotNil(t, messages[0].OfSystem)
		assert.NotNil(t, messages[1].OfSystem)
		assert.NotNil(t, messages[2].OfUser)
	})
}

func TestConvertCommandSpecsToTools(t *testing.T) {
	t.Run("NoCommandSpecs", func(t *testing.T) {
		result := convertCommandSpecsToTools(nil)
		assert.Nil(t, result)

		result = convertCommandSpecsToTools([]CommandSpec{})
		assert.Nil(t, result)
	})

	t.Run("SingleCommandWithParameters", func(t *testing.T) {
		specs := []CommandSpec{
			{
				Name:        "MovePlayer",
				Description: "Move the player to a position",
				Parameters: []CommandParamSpec{
					{Name: "X", Type: "int", Description: "X coordinate"},
					{Name: "Y", Type: "int", Description: "Y coordinate"},
					{Name: "PlayerName", Type: "string", Description: "Name of the player"},
				},
			},
		}

		result := convertCommandSpecsToTools(specs)
		require.Len(t, result, 1)

		tool := result[0].OfFunction
		require.NotNil(t, tool)
		assert.Equal(t, "MovePlayer", tool.Function.Name)
		assert.Equal(t, "Move the player to a position", tool.Function.Description.Value)

		params := tool.Function.Parameters
		assert.Equal(t, "object", params["type"])
		assert.Equal(t, false, params["additionalProperties"])

		properties := params["properties"].(map[string]any)
		assert.Len(t, properties, 3)

		xProp := properties["X"].(map[string]string)
		assert.Equal(t, "integer", xProp["type"])
		assert.Equal(t, "X coordinate", xProp["description"])

		yProp := properties["Y"].(map[string]string)
		assert.Equal(t, "integer", yProp["type"])
		assert.Equal(t, "Y coordinate", yProp["description"])

		playerProp := properties["PlayerName"].(map[string]string)
		assert.Equal(t, "string", playerProp["type"])
		assert.Equal(t, "Name of the player", playerProp["description"])

		required := params["required"].([]string)
		assert.ElementsMatch(t, []string{"X", "Y", "PlayerName"}, required)

		assert.Equal(t, true, tool.Function.Strict.Value)
	})

	t.Run("CommandWithNoParameters", func(t *testing.T) {
		specs := []CommandSpec{
			{
				Name:        "GetStatus",
				Description: "Get current status",
				Parameters:  []CommandParamSpec{},
			},
		}

		result := convertCommandSpecsToTools(specs)
		require.Len(t, result, 1)

		tool := result[0].OfFunction
		require.NotNil(t, tool)
		assert.Equal(t, "GetStatus", tool.Function.Name)
		assert.Equal(t, "Get current status", tool.Function.Description.Value)

		params := tool.Function.Parameters
		properties := params["properties"].(map[string]any)
		assert.Len(t, properties, 0)

		required := params["required"].([]string)
		assert.Len(t, required, 0)
	})

	t.Run("MultipleCommands", func(t *testing.T) {
		specs := []CommandSpec{
			{
				Name:        "Attack",
				Description: "Attack an enemy",
				Parameters: []CommandParamSpec{
					{Name: "Target", Type: "string", Description: "Enemy to attack"},
				},
			},
			{
				Name:        "Defend",
				Description: "Defend against attacks",
				Parameters:  []CommandParamSpec{},
			},
		}

		result := convertCommandSpecsToTools(specs)
		require.Len(t, result, 2)

		attackTool := result[0].OfFunction
		require.NotNil(t, attackTool)
		assert.Equal(t, "Attack", attackTool.Function.Name)

		defendTool := result[1].OfFunction
		require.NotNil(t, defendTool)
		assert.Equal(t, "Defend", defendTool.Function.Name)
	})
}

func TestConvertGoTypeToJSONSchemaType(t *testing.T) {
	for _, tt := range []struct {
		goType string
		want   string
	}{
		{"string", "string"},
		{"int", "integer"},
		{"int8", "integer"},
		{"int16", "integer"},
		{"int32", "integer"},
		{"int64", "integer"},
		{"uint", "integer"},
		{"uint8", "integer"},
		{"uint16", "integer"},
		{"uint32", "integer"},
		{"uint64", "integer"},
		{"float32", "number"},
		{"float64", "number"},
		{"bool", "boolean"},
		{"[]string", "object"},
		{"map[string]int", "object"},
		{"CustomStruct", "object"},
	} {
		t.Run(tt.goType, func(t *testing.T) {
			got := convertGoTypeToJSONSchemaType(tt.goType)
			assert.Equal(t, tt.want, got)
		})
	}
}
