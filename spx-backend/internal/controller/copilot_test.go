package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
	"github.com/stretchr/testify/assert"
)

func TestGenerateMessageParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &GenerateMessageParams{}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("Too many messages", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: make([]types.Message, MAX_MESSAGE_COUNT+1),
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "too many messages", msg)
	})

	t.Run("Invalid message role", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []types.Message{
				{
					Role: types.Role("invalid"),
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid role: invalid role", msg)
	})

	t.Run("Invalid message content type", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []types.Message{
				{
					Role: types.RoleUser,
					Content: types.Content{
						Type: types.ContentType("invalid"),
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: invalid content type", msg)
	})

	t.Run("Invalid message empty content text", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []types.Message{
				{
					Role: types.RoleUser,
					Content: types.Content{
						Type: types.ContentTypeText,
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: missing text", msg)
	})

	t.Run("Invalid message too long content text", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []types.Message{
				{
					Role: types.RoleUser,
					Content: types.Content{
						Type: types.ContentTypeText,
						Text: "a" + string(make([]byte, types.MAX_CONTENT_TEXT_LENGTH)),
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: text too long", msg)
	})
}
