package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentSemanticTokensFull(t *testing.T) {
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
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		mainSpxTokens, err := s.textDocumentSemanticTokensFull(&SemanticTokensParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		})
		require.NoError(t, err)
		require.NotNil(t, mainSpxTokens)
		assert.Equal(t, []uint32{
			1, 0, 3, 9, 0, // var
			0, 4, 1, 13, 0, // (
			1, 1, 8, 5, 1, // MySprite
			0, 9, 6, 1, 0, // Sprite
			0, 0, 6, 2, 0, // Sprite
			1, 0, 1, 13, 0, // )
			1, 0, 8, 5, 0, // MySprite
			0, 8, 1, 13, 0, // .
			0, 1, 4, 8, 0, // turn
			0, 5, 4, 5, 6, // Left
			1, 0, 3, 7, 0, // run
			0, 4, 8, 11, 0, // assets
			0, 10, 1, 13, 0, // {
			0, 1, 5, 6, 0, // Title
			0, 5, 1, 13, 0, // :
			0, 2, 9, 11, 0, // My Game
			0, 9, 1, 13, 0, // }
		}, mainSpxTokens.Data)

		mySpriteTokens, err := s.textDocumentSemanticTokensFull(&SemanticTokensParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteTokens)
		assert.Equal(t, []uint32{
			1, 0, 7, 8, 0, // onStart
			0, 8, 2, 13, 0, // =>
			0, 3, 1, 13, 0, // {
			1, 1, 8, 5, 0, // MySprite
			0, 8, 1, 13, 0, // .
			0, 1, 4, 8, 0, // turn
			0, 5, 5, 5, 6, // Right
			1, 0, 1, 13, 0, // }
		}, mySpriteTokens.Data)
	})
}
