package controller

import (
	"strings"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/aiinteraction"
	"github.com/stretchr/testify/assert"
)

func TestAIInteractionTurnParamsValidate(t *testing.T) {
	cmdSpecs := []aiinteraction.CommandSpec{
		{
			Name:        "TestCommand",
			Description: "A test command",
		},
	}

	t.Run("Normal", func(t *testing.T) {
		params := &AIInteractionTurnParams{
			Content:      "Test message",
			CommandSpecs: cmdSpecs,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("MissingContent", func(t *testing.T) {
		params := &AIInteractionTurnParams{
			CommandSpecs: cmdSpecs,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing content", msg)
	})

	t.Run("ContentTooLong", func(t *testing.T) {
		params := &AIInteractionTurnParams{
			Content:      strings.Repeat("c", 10000),
			CommandSpecs: cmdSpecs,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "content length exceeds 280 characters", msg)
	})

	t.Run("NoAvailableCommands", func(t *testing.T) {
		params := &AIInteractionTurnParams{
			Content: "Test message",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "no available commands", msg)
	})

	t.Run("BothContentAndCommandsMissing", func(t *testing.T) {
		params := &AIInteractionTurnParams{}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing content", msg)
	})
}
