package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentImplementation(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
type MyInterface interface {
	myMethod()
}

type MyType struct{}

func (t MyType) myMethod() {}

type MyType2 struct{}

func (t MyType2) myMethod() {}

var x MyInterface
`),
		}), nil)

		implementations, err := s.textDocumentImplementation(&ImplementationParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, implementations)
		locations, ok := implementations.([]Location)
		require.True(t, ok)
		require.Len(t, locations, 2)
		assert.Contains(t, locations, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 7, Character: 16},
				End:   Position{Line: 7, Character: 16},
			},
		})
		assert.Contains(t, locations, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 11, Character: 17},
				End:   Position{Line: 11, Character: 17},
			},
		})
	})

	t.Run("NonInterfaceMethod", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
type MyType struct{}

func (t MyType) myMethod() {}
`),
		}), nil)

		implementation, err := s.textDocumentImplementation(&ImplementationParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 3, Character: 16},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, implementation)
		location, ok := implementation.(Location)
		require.True(t, ok)
		assert.Equal(t, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 3, Character: 16},
				End:   Position{Line: 3, Character: 16},
			},
		}, location)
	})

	t.Run("InvalidPosition", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
type MyType struct{}
`),
		}), nil)

		implementation, err := s.textDocumentImplementation(&ImplementationParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 99, Character: 99},
			},
		})
		require.NoError(t, err)
		require.Nil(t, implementation)
	})
}
