package aiinteraction

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateTurnsToArchive(t *testing.T) {
	t.Run("NoArchivingNeeded", func(t *testing.T) {
		request := &Request{
			History: make([]Turn, 10),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 0, count)
	})

	t.Run("FirstTimeArchiving", func(t *testing.T) {
		request := &Request{
			ArchivedHistory: "",
			History:         make([]Turn, 30),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 10, count)
	})

	t.Run("FirstTimeArchivingLargeHistory", func(t *testing.T) {
		request := &Request{
			ArchivedHistory: "",
			History:         make([]Turn, 50),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 30, count)
	})

	t.Run("SubsequentArchivingNotNeeded", func(t *testing.T) {
		request := &Request{
			ArchivedHistory: "existing archive",
			History:         make([]Turn, 25),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 0, count)
	})

	t.Run("SubsequentArchiving", func(t *testing.T) {
		request := &Request{
			ArchivedHistory: "existing archive",
			History:         make([]Turn, 35),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 15, count)
	})

	t.Run("SubsequentArchivingLargeHistory", func(t *testing.T) {
		request := &Request{
			ArchivedHistory: "existing archive",
			History:         make([]Turn, 50),
		}

		count := calculateTurnsToArchive(request)
		assert.Equal(t, 15, count)
	})
}

func TestApplyArchivedHistory(t *testing.T) {
	t.Run("ApplyFirstTimeArchiving", func(t *testing.T) {
		history := make([]Turn, 30)
		for i := range history {
			history[i] = Turn{
				RequestContent: fmt.Sprintf("Request %d", i+1),
				ResponseText:   fmt.Sprintf("Response %d", i+1),
			}
		}
		request := &Request{
			Content:         "User content",
			ArchivedHistory: "",
			History:         history,
		}
		archivedHistory := &ArchivedHistory{
			Content:   "new archive content",
			TurnCount: 10,
		}

		processedRequest := applyArchivedHistory(request, archivedHistory)
		assert.Equal(t, "new archive content", processedRequest.ArchivedHistory)
		assert.Len(t, processedRequest.History, 20)
		assert.Equal(t, "Request 11", processedRequest.History[0].RequestContent)
		assert.Equal(t, "Response 11", processedRequest.History[0].ResponseText)
		assert.Equal(t, "Request 30", processedRequest.History[19].RequestContent)
		assert.Equal(t, "Response 30", processedRequest.History[19].ResponseText)
		assert.Equal(t, "User content", processedRequest.Content)
	})

	t.Run("ApplySubsequentArchiving", func(t *testing.T) {
		history := make([]Turn, 35)
		for i := range history {
			history[i] = Turn{
				RequestContent: fmt.Sprintf("Request %d", i+1),
				ResponseText:   fmt.Sprintf("Response %d", i+1),
			}
		}
		request := &Request{
			Content:         "User content",
			ArchivedHistory: "old archive",
			History:         history,
		}
		archivedHistory := &ArchivedHistory{
			Content:   "updated archive",
			TurnCount: 15,
		}

		processedRequest := applyArchivedHistory(request, archivedHistory)
		assert.Equal(t, "updated archive", processedRequest.ArchivedHistory)
		assert.Len(t, processedRequest.History, 20)
		assert.Equal(t, "Request 16", processedRequest.History[0].RequestContent)
		assert.Equal(t, "Response 16", processedRequest.History[0].ResponseText)
		assert.Equal(t, "Request 35", processedRequest.History[19].RequestContent)
		assert.Equal(t, "Response 35", processedRequest.History[19].ResponseText)
		assert.Equal(t, "User content", processedRequest.Content)
	})
}

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

	t.Run("LargeHistoryPreservesAll", func(t *testing.T) {
		history := make([]Turn, 25)
		for i := range history {
			history[i] = Turn{
				RequestContent: fmt.Sprintf("Request %d", i+1),
				ResponseText:   fmt.Sprintf("Response %d", i+1),
			}
		}

		request := &Request{
			Content: "Final message",
			History: history,
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 51)

		firstMsg := messages[0].OfUser
		require.NotNil(t, firstMsg)
		assert.Equal(t, "Request 1", firstMsg.Content.OfString.Value)

		lastHistoryMsg := messages[49].OfAssistant
		require.NotNil(t, lastHistoryMsg)
		assert.Equal(t, "Response 25", lastHistoryMsg.Content.OfString.Value)

		finalMsg := messages[50].OfUser
		require.NotNil(t, finalMsg)
		assert.Equal(t, "Final message", finalMsg.Content.OfString.Value)
	})

	t.Run("EmptyHistory", func(t *testing.T) {
		request := &Request{
			Content: "Single message",
			History: []Turn{},
		}

		messages, err := buildConversationMessages(request)

		require.NoError(t, err)
		require.Len(t, messages, 1)

		userMsg := messages[0].OfUser
		require.NotNil(t, userMsg)
		assert.Equal(t, "Single message", userMsg.Content.OfString.Value)
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
