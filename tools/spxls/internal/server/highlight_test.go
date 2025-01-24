package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentDocumentHighlight(t *testing.T) {
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

		mySpriteHighlights, err := s.textDocumentDocumentHighlight(&DocumentHighlightParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteHighlights)
		assert.Len(t, *mySpriteHighlights, 2)
		assert.Contains(t, *mySpriteHighlights, DocumentHighlight{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 9},
			},
			Kind: Write,
		})
		assert.Contains(t, *mySpriteHighlights, DocumentHighlight{
			Range: Range{
				Start: Position{Line: 4, Character: 0},
				End:   Position{Line: 4, Character: 8},
			},
			Kind: Read,
		})

		leftHighlights, err := s.textDocumentDocumentHighlight(&DocumentHighlightParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 14},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, leftHighlights)
		assert.Len(t, *leftHighlights, 1)
		assert.Contains(t, *leftHighlights, DocumentHighlight{
			Range: Range{
				Start: Position{Line: 4, Character: 14},
				End:   Position{Line: 4, Character: 18},
			},
			Kind: Read,
		})
	})
}
