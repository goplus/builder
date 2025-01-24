package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTextDocumentSignatureHelp(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
import "fmt"
var (
	MySprite Sprite
)
fmt.Println 
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

		help, err := s.textDocumentSignatureHelp(&SignatureHelpParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 5, Character: 11},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, help)
		require.Len(t, help.Signatures, 1)
		assert.Equal(t, SignatureInformation{
			Label: "Println(a []any) (int, error)",
			Parameters: []ParameterInformation{
				{
					Label: "a []any",
				},
			},
		}, help.Signatures[0])
	})
}
