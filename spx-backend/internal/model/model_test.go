package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseVisibility(t *testing.T) {
	t.Run("Private", func(t *testing.T) {
		v, err := ParseVisibility("private")
		require.NoError(t, err)
		assert.Equal(t, VisibilityPrivate, v)
	})

	t.Run("Public", func(t *testing.T) {
		v, err := ParseVisibility("public")
		require.NoError(t, err)
		assert.Equal(t, VisibilityPublic, v)
	})

	t.Run("Invalid", func(t *testing.T) {
		_, err := ParseVisibility("invalid")
		assert.EqualError(t, err, "invalid visibility: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		_, err := ParseVisibility("")
		assert.EqualError(t, err, "invalid visibility: ")
	})
}

func TestVisibilityString(t *testing.T) {
	t.Run("Private", func(t *testing.T) {
		v := VisibilityPrivate
		assert.Equal(t, "private", v.String())
	})

	t.Run("Public", func(t *testing.T) {
		v := VisibilityPublic
		assert.Equal(t, "public", v.String())
	})

	t.Run("Invalid", func(t *testing.T) {
		v := Visibility(255)
		assert.Equal(t, "Visibility(255)", v.String())
	})
}

func TestVisibilityMarshalText(t *testing.T) {
	t.Run("Private", func(t *testing.T) {
		v := VisibilityPrivate
		text, err := v.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("private"), text)
	})

	t.Run("Public", func(t *testing.T) {
		v := VisibilityPublic
		text, err := v.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("public"), text)
	})

	t.Run("Invalid", func(t *testing.T) {
		v := Visibility(255)
		_, err := v.MarshalText()
		assert.EqualError(t, err, "invalid visibility: 255")
	})
}

func TestVisibilityUnmarshalText(t *testing.T) {
	t.Run("Private", func(t *testing.T) {
		var v Visibility
		err := v.UnmarshalText([]byte("private"))
		require.NoError(t, err)
		assert.Equal(t, VisibilityPrivate, v)
	})

	t.Run("Public", func(t *testing.T) {
		var v Visibility
		err := v.UnmarshalText([]byte("public"))
		require.NoError(t, err)
		assert.Equal(t, VisibilityPublic, v)
	})

	t.Run("Invalid", func(t *testing.T) {
		var v Visibility
		err := v.UnmarshalText([]byte("invalid"))
		assert.EqualError(t, err, "invalid visibility: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		var v Visibility
		err := v.UnmarshalText([]byte(""))
		assert.EqualError(t, err, "invalid visibility: ")
	})
}

func TestFileCollectionScan(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan([]byte(`{"a":"b"}`))
		require.NoError(t, err)
		assert.Equal(t, FileCollection{"a": "b"}, fc)
	})

	t.Run("Nil", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan(nil)
		require.NoError(t, err)
		require.NotNil(t, fc)
		assert.Empty(t, fc)
	})

	t.Run("EmptyJSON", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan([]byte(`{}`))
		require.NoError(t, err)
		require.NotNil(t, fc)
		assert.Empty(t, fc)
	})

	t.Run("InvalidJSON", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan([]byte(`{`))
		require.Error(t, err)
		assert.ErrorAs(t, err, new(*json.SyntaxError))
	})

	t.Run("InvalidJSONType", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan([]byte(`[]`))
		require.Error(t, err)
		assert.ErrorAs(t, err, new(*json.UnmarshalTypeError))
	})

	t.Run("IncompatibleType", func(t *testing.T) {
		var fc FileCollection
		err := fc.Scan(true)
		require.Error(t, err)
		assert.EqualError(t, err, "incompatible type for FileCollection")
	})
}

func TestFileCollectionValue(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		fc := FileCollection{"a": "b"}
		v, err := fc.Value()
		require.NoError(t, err)
		assert.Equal(t, `{"a":"b"}`, string(v.([]byte)))
	})

	t.Run("Empty", func(t *testing.T) {
		fc := FileCollection{}
		v, err := fc.Value()
		require.NoError(t, err)
		assert.Equal(t, `{}`, string(v.([]byte)))
	})
}
