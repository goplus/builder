package controller

import (
	"testing"

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
			Messages: make([]Message, MAX_MESSAGE_COUNT+1),
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "too many messages", msg)
	})

	t.Run("Invalid message role", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []Message{
				{
					Role: Role("invalid"),
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid role: invalid role", msg)
	})

	t.Run("Invalid message content type", func(t *testing.T) {
		params := &GenerateMessageParams{
			Messages: []Message{
				{
					Role: RoleUser,
					Content: Content{
						Type: ContentType("invalid"),
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
			Messages: []Message{
				{
					Role: RoleUser,
					Content: Content{
						Type: ContentTypeText,
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
			Messages: []Message{
				{
					Role: RoleUser,
					Content: Content{
						Type: ContentTypeText,
						Text: "a" + string(make([]byte, MAX_CONTENT_TEXT_LENGTH)),
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: text too long", msg)
	})
}
