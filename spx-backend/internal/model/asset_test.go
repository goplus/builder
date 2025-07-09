package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseAssetType(t *testing.T) {
	t.Run("Sprite", func(t *testing.T) {
		at, err := ParseAssetType("sprite")
		require.NoError(t, err)
		assert.Equal(t, AssetTypeSprite, at)
	})

	t.Run("Backdrop", func(t *testing.T) {
		at, err := ParseAssetType("backdrop")
		require.NoError(t, err)
		assert.Equal(t, AssetTypeBackdrop, at)
	})

	t.Run("Sound", func(t *testing.T) {
		at, err := ParseAssetType("sound")
		require.NoError(t, err)
		assert.Equal(t, AssetTypeSound, at)
	})

	t.Run("Invalid", func(t *testing.T) {
		_, err := ParseAssetType("invalid")
		assert.EqualError(t, err, "invalid asset type: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		_, err := ParseAssetType("")
		assert.EqualError(t, err, "invalid asset type: ")
	})
}

func TestAssetTypeString(t *testing.T) {
	t.Run("Sprite", func(t *testing.T) {
		at := AssetTypeSprite
		assert.Equal(t, "sprite", at.String())
	})

	t.Run("Backdrop", func(t *testing.T) {
		at := AssetTypeBackdrop
		assert.Equal(t, "backdrop", at.String())
	})

	t.Run("Sound", func(t *testing.T) {
		at := AssetTypeSound
		assert.Equal(t, "sound", at.String())
	})

	t.Run("Invalid", func(t *testing.T) {
		at := AssetType(255)
		assert.Equal(t, "AssetType(255)", at.String())
	})
}

func TestAssetTypeMarshalText(t *testing.T) {
	t.Run("Sprite", func(t *testing.T) {
		at := AssetTypeSprite
		text, err := at.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("sprite"), text)
	})

	t.Run("Backdrop", func(t *testing.T) {
		at := AssetTypeBackdrop
		text, err := at.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("backdrop"), text)
	})

	t.Run("Sound", func(t *testing.T) {
		at := AssetTypeSound
		text, err := at.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("sound"), text)
	})

	t.Run("Invalid", func(t *testing.T) {
		at := AssetType(255)
		_, err := at.MarshalText()
		assert.EqualError(t, err, "invalid asset type: 255")
	})
}

func TestAssetTypeUnmarshalText(t *testing.T) {
	t.Run("Sprite", func(t *testing.T) {
		var at AssetType
		err := at.UnmarshalText([]byte("sprite"))
		require.NoError(t, err)
		assert.Equal(t, AssetTypeSprite, at)
	})

	t.Run("Backdrop", func(t *testing.T) {
		var at AssetType
		err := at.UnmarshalText([]byte("backdrop"))
		require.NoError(t, err)
		assert.Equal(t, AssetTypeBackdrop, at)
	})

	t.Run("Sound", func(t *testing.T) {
		var at AssetType
		err := at.UnmarshalText([]byte("sound"))
		require.NoError(t, err)
		assert.Equal(t, AssetTypeSound, at)
	})

	t.Run("Invalid", func(t *testing.T) {
		var at AssetType
		err := at.UnmarshalText([]byte("invalid"))
		assert.EqualError(t, err, "invalid asset type: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		var at AssetType
		err := at.UnmarshalText([]byte(""))
		assert.EqualError(t, err, "invalid asset type: ")
	})
}
