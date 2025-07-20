package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/stretchr/testify/assert"
)

func TestGenerateMessageBaseParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &GenerateMessageBaseParams{}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("Too many messages", func(t *testing.T) {
		params := &GenerateMessageBaseParams{
			Messages: make([]copilot.Message, MaxMessageCount+1),
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "too many messages", msg)
	})

	t.Run("Invalid message role", func(t *testing.T) {
		params := &GenerateMessageBaseParams{
			Messages: []copilot.Message{
				{
					Role: copilot.Role("invalid"),
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid role: invalid role", msg)
	})

	t.Run("Invalid message content type", func(t *testing.T) {
		params := &GenerateMessageBaseParams{
			Messages: []copilot.Message{
				{
					Role: copilot.RoleUser,
					Content: copilot.Content{
						Type: copilot.ContentType("invalid"),
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: invalid content type", msg)
	})

	t.Run("Invalid message empty content text", func(t *testing.T) {
		params := &GenerateMessageBaseParams{
			Messages: []copilot.Message{
				{
					Role: copilot.RoleUser,
					Content: copilot.Content{
						Type: copilot.ContentTypeText,
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: missing text", msg)
	})

	t.Run("Invalid message too long content text", func(t *testing.T) {
		params := &GenerateMessageBaseParams{
			Messages: []copilot.Message{
				{
					Role: copilot.RoleUser,
					Content: copilot.Content{
						Type: copilot.ContentTypeText,
						Text: "a" + string(make([]byte, copilot.MaxContentLength)),
					},
				},
			},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid message at index 0: invalid content: text too long", msg)
	})
}
