package controller

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAIDescriptionParamsValidate(t *testing.T) {
	t.Run("ValidContent", func(t *testing.T) {
		params := &AIDescriptionParams{
			Content: "Valid game content for AI description",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyContent", func(t *testing.T) {
		params := &AIDescriptionParams{
			Content: "",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "content is required", msg)
	})

	t.Run("ContentTooLong", func(t *testing.T) {
		params := &AIDescriptionParams{
			Content: strings.Repeat("a", 100001),
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "content length exceeds 100000 characters", msg)
	})

	t.Run("MaxLengthContent", func(t *testing.T) {
		params := &AIDescriptionParams{
			Content: strings.Repeat("a", 100000),
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ContentWithSpecialCharacters", func(t *testing.T) {
		params := &AIDescriptionParams{
			Content: "Game content with special chars: @#$%^&*()[]{}|\\;':\",./<>?",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}
