package aiinteraction

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseAIResponse(t *testing.T) {
	t.Run("TextOnly", func(t *testing.T) {
		responseText := "This is a simple text response."
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, responseText, response.Text)
		assert.Empty(t, response.CommandName)
		assert.Nil(t, response.CommandArgs)
	})

	t.Run("WithCommand", func(t *testing.T) {
		responseText := "This is a response with a command.\nCOMMAND: TestCommand\nARGS: {\"param1\": \"value1\", \"param2\": 42}"
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, "This is a response with a command.", response.Text)
		assert.Equal(t, "TestCommand", response.CommandName)
		assert.NotNil(t, response.CommandArgs)
		assert.Equal(t, "value1", response.CommandArgs["param1"])
		assert.Equal(t, float64(42), response.CommandArgs["param2"])
	})

	t.Run("CommandNoArgs", func(t *testing.T) {
		responseText := "This is a response with a command but no args.\nCOMMAND: TestCommand"
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, "This is a response with a command but no args.", response.Text)
		assert.Equal(t, "TestCommand", response.CommandName)
		assert.Nil(t, response.CommandArgs)
	})

	t.Run("EmptyArgsValue", func(t *testing.T) {
		responseText := "Command with empty args.\nCOMMAND: TestCommand\nARGS: "
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, "Command with empty args.", response.Text)
		assert.Equal(t, "TestCommand", response.CommandName)
		assert.Nil(t, response.CommandArgs)
	})

	t.Run("InvalidJSON", func(t *testing.T) {
		responseText := "This is a response with invalid JSON.\nCOMMAND: TestCommand\nARGS: {invalid json}"
		response, err := parseAIResponse(responseText)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse command arguments")
		assert.Nil(t, response)
	})

	t.Run("MultilineResponse", func(t *testing.T) {
		responseText := "This is a response\nwith multiple lines\nof text.\nCOMMAND: TestCommand\nARGS: {\"param1\": \"value1\"}"
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, "This is a response\nwith multiple lines\nof text.", response.Text)
		assert.Equal(t, "TestCommand", response.CommandName)
		assert.Equal(t, "value1", response.CommandArgs["param1"])
	})

	t.Run("MissingSpaceAfterCommand", func(t *testing.T) {
		responseText := "Testing response.\nCOMMAND:TestCommand\nARGS: {\"param1\": \"value1\"}"
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, responseText, response.Text)
		assert.Empty(t, response.CommandName)
		assert.Nil(t, response.CommandArgs)
	})

	t.Run("ArgsWithoutCommand", func(t *testing.T) {
		responseText := "Testing response.\nARGS: {\"param1\": \"value1\"}"
		response, err := parseAIResponse(responseText)

		require.NoError(t, err)
		assert.Equal(t, responseText, response.Text)
		assert.Empty(t, response.CommandName)
		assert.Nil(t, response.CommandArgs)
	})
}

func TestBuildConversationMessages(t *testing.T) {
	t.Run("SimpleRequest", func(t *testing.T) {
		request := &Request{
			Content: "Hello, AI!",
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 1)

		userMsg := messages[0].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Hello, AI!", userMsg.Content.OfString.Value)
	})

	t.Run("WithContext", func(t *testing.T) {
		request := &Request{
			Content: "What's the context?",
			Context: map[string]any{
				"key": "value",
				"nested": map[string]any{
					"nestedKey": "nestedValue",
				},
			},
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 1)

		userMsg := messages[0].OfUser
		require.NotNil(t, userMsg)
		assert.Contains(t, userMsg.Content.OfString.Value, "What's the context?")
		assert.Contains(t, userMsg.Content.OfString.Value, "Context: ")

		contextJSON := userMsg.Content.OfString.Value[len("What's the context?\n\nContext: "):]
		var context map[string]any
		err = json.Unmarshal([]byte(contextJSON), &context)
		require.NoError(t, err)
		assert.Equal(t, "value", context["key"])
		nestedMap, ok := context["nested"].(map[string]any)
		require.True(t, ok)
		assert.Equal(t, "nestedValue", nestedMap["nestedKey"])
	})

	t.Run("WithSingleTurnHistory", func(t *testing.T) {
		request := &Request{
			Content: "Next message",
			History: []Turn{
				{
					RequestContent: "First message",
					ResponseText:   "First response",
				},
			},
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 3)

		userMsg1 := messages[0].OfUser
		require.NotNil(t, userMsg1)
		assert.Equal(t, "First message", userMsg1.Content.OfString.Value)

		aiMsg := messages[1].OfAssistant
		require.NotNil(t, aiMsg)
		assert.Equal(t, "First response", aiMsg.Content.OfString.Value)

		userMsg2 := messages[2].OfUser
		require.NotNil(t, userMsg2)
		assert.Equal(t, "Next message", userMsg2.Content.OfString.Value)
	})

	t.Run("WithHistoryCommand", func(t *testing.T) {
		request := &Request{
			Content: "Next message",
			History: []Turn{
				{
					RequestContent:      "First message",
					ResponseText:        "First response",
					ResponseCommandName: "TestCommand",
					ResponseCommandArgs: map[string]any{"arg1": "value1"},
				},
			},
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 3)

		aiMsg := messages[1].OfAssistant
		require.NotNil(t, aiMsg)
		assert.Contains(t, aiMsg.Content.OfString.Value, "First response")
		assert.Contains(t, aiMsg.Content.OfString.Value, "COMMAND: TestCommand")
		assert.Contains(t, aiMsg.Content.OfString.Value, "\"arg1\":\"value1\"")
	})

	t.Run("InvalidCommandArgs", func(t *testing.T) {
		request := &Request{
			Content: "Next message",
			History: []Turn{
				{
					RequestContent:      "First message",
					ResponseText:        "First response",
					ResponseCommandName: "TestCommand",
					ResponseCommandArgs: map[string]any{"circular": nil},
				},
			},
		}

		circular := make(map[string]any)
		circular["self"] = circular
		request.History[0].ResponseCommandArgs["circular"] = circular

		messages, err := buildConversationMessages(request)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to marshal command arguments")
		assert.Nil(t, messages)
	})

	t.Run("TruncatedHistory", func(t *testing.T) {
		history := make([]Turn, maxHistoryTurns+5)
		for i := range history {
			history[i] = Turn{
				RequestContent: "Request " + string(rune('a'+i)),
				ResponseText:   "Response " + string(rune('a'+i)),
			}
		}

		request := &Request{
			Content: "Final message",
			History: history,
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)

		wantLen := maxHistoryTurns*2 + 1
		require.Len(t, messages, wantLen)

		firstMsg := messages[0].OfUser
		require.NotNil(t, firstMsg)
		assert.Equal(t, "Request "+string(rune('a'+(len(history)-maxHistoryTurns))), firstMsg.Content.OfString.Value)

		lastMsg := messages[len(messages)-1].OfUser
		require.NotNil(t, lastMsg)
		assert.Equal(t, "Final message", lastMsg.Content.OfString.Value)
	})

	t.Run("ComplexRequest", func(t *testing.T) {
		request := &Request{
			Content: "Complex request",
			Context: map[string]any{
				"context": "additional",
			},
			History: []Turn{
				{
					RequestContent:      "Previous request",
					ResponseText:        "Previous response",
					ResponseCommandName: "PrevCommand",
					ResponseCommandArgs: map[string]any{
						"prevArg": 123,
					},
				},
			},
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 3)

		lastMsg := messages[2].OfUser
		require.NotNil(t, lastMsg)
		assert.Contains(t, lastMsg.Content.OfString.Value, "Complex request")
		assert.Contains(t, lastMsg.Content.OfString.Value, "Context: ")
		assert.Contains(t, lastMsg.Content.OfString.Value, "\"context\":\"additional\"")
	})

	t.Run("ContinuationTurnWithHistory", func(t *testing.T) {
		request := &Request{
			Content:          "This should be ignored",
			ContinuationTurn: 1,
			History: []Turn{
				{
					RequestContent: "Previous message",
					ResponseText:   "Previous response",
				},
			},
		}

		messages, err := buildConversationMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 2)

		userMsg := messages[0].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Previous message", userMsg.Content.OfString.Value)

		aiMsg := messages[1].OfAssistant
		require.NotNil(t, aiMsg)
		assert.Equal(t, "Previous response", aiMsg.Content.OfString.Value)
	})

	t.Run("ContinuationTurnWithoutHistory", func(t *testing.T) {
		request := &Request{
			Content:          "This should be ignored",
			ContinuationTurn: 2,
		}

		messages, err := buildConversationMessages(request)
		require.NoError(t, err)
		require.Empty(t, messages)
	})

	t.Run("ContinuationTurnWithContext", func(t *testing.T) {
		request := &Request{
			Content:          "This should be ignored",
			ContinuationTurn: 1,
			Context:          map[string]any{"key": "value"},
			History: []Turn{
				{
					RequestContent:      "Previous message",
					ResponseText:        "Previous response",
					ResponseCommandName: "TestCommand",
					ResponseCommandArgs: map[string]any{"arg": "value"},
				},
			},
		}

		messages, err := buildConversationMessages(request)
		require.NoError(t, err)
		require.Len(t, messages, 2)

		userMsg := messages[0].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Previous message", userMsg.Content.OfString.Value)

		aiMsg := messages[1].OfAssistant
		require.NotNil(t, aiMsg)
		assert.Contains(t, aiMsg.Content.OfString.Value, "Previous response")
		assert.Contains(t, aiMsg.Content.OfString.Value, "COMMAND: TestCommand")
		assert.Contains(t, aiMsg.Content.OfString.Value, "\"arg\":\"value\"")
	})
}
