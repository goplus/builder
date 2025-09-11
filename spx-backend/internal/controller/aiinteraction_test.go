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

func TestAIInteractionArchiveParamsValidate(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &AIInteractionArchiveParams{
			Turns: []aiinteraction.Turn{
				{
					RequestContent: "Test",
					ResponseText:   "Response",
				},
			},
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("NoTurns", func(t *testing.T) {
		params := &AIInteractionArchiveParams{
			Turns: []aiinteraction.Turn{},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "no turns to archive", msg)
	})

	t.Run("TooManyTurns", func(t *testing.T) {
		turns := make([]aiinteraction.Turn, 51)
		for i := range turns {
			turns[i] = aiinteraction.Turn{
				RequestContent: "Test",
				ResponseText:   "Response",
			}
		}
		params := &AIInteractionArchiveParams{
			Turns: turns,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Contains(t, msg, "too many turns to archive")
	})

	t.Run("MaxTurnsAllowed", func(t *testing.T) {
		turns := make([]aiinteraction.Turn, 50)
		for i := range turns {
			turns[i] = aiinteraction.Turn{
				RequestContent: "Test",
				ResponseText:   "Response",
			}
		}
		params := &AIInteractionArchiveParams{
			Turns: turns,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}
