package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentReferences(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.turn Left
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	MySprite.turn Right
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		mainSpxMySpriteRef, err := s.textDocumentReferences(&ReferenceParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 2},
			},
			Context: ReferenceContext{
				IncludeDeclaration: true,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mainSpxMySpriteRef)
		require.Len(t, mainSpxMySpriteRef, 3)
		assert.Contains(t, mainSpxMySpriteRef, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 9},
			},
		})
		assert.Contains(t, mainSpxMySpriteRef, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 4, Character: 0},
				End:   Position{Line: 4, Character: 8},
			},
		})
		assert.Contains(t, mainSpxMySpriteRef, Location{
			URI: "file:///MySprite.spx",
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 9},
			},
		})

		mainSpxTurnRef, err := s.textDocumentReferences(&ReferenceParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 9},
			},
			Context: ReferenceContext{
				IncludeDeclaration: true,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mainSpxTurnRef)
		require.Len(t, mainSpxTurnRef, 2)
		assert.Contains(t, mainSpxTurnRef, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 4, Character: 9},
				End:   Position{Line: 4, Character: 13},
			},
		})
		assert.Contains(t, mainSpxTurnRef, Location{
			URI: "file:///MySprite.spx",
			Range: Range{
				Start: Position{Line: 2, Character: 10},
				End:   Position{Line: 2, Character: 14},
			},
		})
	})

	t.Run("InvalidPosition", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`var x int`),
		}), nil)

		refs, err := s.textDocumentReferences(&ReferenceParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 99, Character: 99},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, refs)
		require.Len(t, refs, 1)
		assert.Contains(t, refs, Location{
			URI: "file:///main.spx",
			Range: Range{
				Start: Position{Line: 0, Character: 6},
				End:   Position{Line: 0, Character: 9},
			},
		})
	})
}
