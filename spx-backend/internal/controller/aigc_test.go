package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMattingParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyImageUrl", func(t *testing.T) {
		params := &MattingParams{}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing imageUrl", msg)
	})
}
