package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
