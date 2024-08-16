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

	t.Run("InvalidImageUrl", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidImageUrl3", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidScheme", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "ftp://example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: unsupported scheme", msg)
	})

	t.Run("LocalImageUrl", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://localhost:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LocalImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://127.0.0.1:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LocalImageUrl3", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://[::1]:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LanImageUrl1", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://192.168.0.1:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LanImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://[fe80::1]:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})
}
