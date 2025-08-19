package aidescription

import (
	"testing"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	t.Run("ValidParameters", func(t *testing.T) {
		client := openai.NewClient(option.WithAPIKey("test-key"))
		modelID := "gpt-3.5-turbo"

		ai, err := New(client, modelID)
		assert.NoError(t, err)
		assert.NotNil(t, ai)
		assert.Equal(t, modelID, ai.openaiModelID)
	})

	t.Run("MissingModelID", func(t *testing.T) {
		client := openai.NewClient(option.WithAPIKey("test-key"))

		ai, err := New(client, "")
		assert.Error(t, err)
		assert.Nil(t, ai)
		assert.Contains(t, err.Error(), "missing openai model id")
	})
}

func TestBuildChatCompletionParams(t *testing.T) {
	client := openai.NewClient(option.WithAPIKey("test-key"))
	ai, err := New(client, "gpt-3.5-turbo")
	require.NoError(t, err)

	systemPrompt := "System prompt content"
	userPrompt := "User prompt content"

	params := ai.buildChatCompletionParams(systemPrompt, userPrompt)

	assert.Equal(t, "gpt-3.5-turbo", params.Model)
	assert.Equal(t, int64(maxTokens), params.MaxTokens.Value)
	assert.Equal(t, temperature, params.Temperature.Value)
	assert.Len(t, params.Messages, 2)

	// Check system message
	systemMsg := params.Messages[0].OfSystem
	require.NotNil(t, systemMsg)
	assert.Equal(t, systemPrompt, systemMsg.Content.OfString.Value)

	// Check user message
	userMsg := params.Messages[1].OfUser
	require.NotNil(t, userMsg)
	assert.Equal(t, userPrompt, userMsg.Content.OfString.Value)
}

func TestExtractDescription(t *testing.T) {
	t.Run("ValidResponse", func(t *testing.T) {
		response := &openai.ChatCompletion{
			Choices: []openai.ChatCompletionChoice{
				{
					Message: openai.ChatCompletionMessage{
						Content: "Test description content",
					},
				},
			},
		}

		desc, err := extractDescription(response)
		assert.NoError(t, err)
		assert.Equal(t, "Test description content", desc)
	})

	t.Run("NoChoices", func(t *testing.T) {
		response := &openai.ChatCompletion{
			Choices: []openai.ChatCompletionChoice{},
		}

		desc, err := extractDescription(response)
		assert.Error(t, err)
		assert.Equal(t, "", desc)
		assert.Equal(t, errNoResponse, err)
	})

	t.Run("EmptyContent", func(t *testing.T) {
		response := &openai.ChatCompletion{
			Choices: []openai.ChatCompletionChoice{
				{
					Message: openai.ChatCompletionMessage{
						Content: "",
					},
				},
			},
		}

		desc, err := extractDescription(response)
		assert.Error(t, err)
		assert.Equal(t, "", desc)
		assert.Equal(t, errEmptyResponse, err)
	})
}
