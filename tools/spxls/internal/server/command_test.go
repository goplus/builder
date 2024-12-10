package server

import (
	"slices"
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerSpxGetDefinitions(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
			}
		}), nil)

		mainSpxParams := []SpxGetDefinitionsParams{
			{
				TextDocumentPositionParams: TextDocumentPositionParams{
					TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
					Position:     Position{Line: 0, Character: 0},
				},
			},
		}
		mainSpxDefs, err := s.spxGetDefinitions(mainSpxParams)
		require.NoError(t, err)
		require.NotNil(t, mainSpxDefs)
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("builtin"),
			Name:    toStringPtr("println"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("main"),
			Name:    toStringPtr("MySprite"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Game.play"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Game.onStart"),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Sprite.turn"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mainSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Sprite.onStart"),
		}))

		mySpriteSpxParams := []SpxGetDefinitionsParams{
			{
				TextDocumentPositionParams: TextDocumentPositionParams{
					TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
					Position:     Position{Line: 0, Character: 0},
				},
			},
		}
		mySpriteSpxDefs, err := s.spxGetDefinitions(mySpriteSpxParams)
		require.NoError(t, err)
		require.NotNil(t, mySpriteSpxDefs)
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("builtin"),
			Name:    toStringPtr("println"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Game.play"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mySpriteSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Game.onStart"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Sprite.turn"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Sprite.onStart"),
		}))
	})
}

// spxDefinitionIdentifierSliceContains reports whether a slice of [SpxDefinitionIdentifier]
// contains a specific [SpxDefinitionIdentifier].
func spxDefinitionIdentifierSliceContains(defs []SpxDefinitionIdentifier, def SpxDefinitionIdentifier) bool {
	return slices.ContainsFunc(defs, func(d SpxDefinitionIdentifier) bool {
		return fromStringPtr(d.Package) == fromStringPtr(def.Package) &&
			fromStringPtr(d.Name) == fromStringPtr(def.Name) &&
			fromIntPtr(d.OverloadIndex) == fromIntPtr(def.OverloadIndex)
	})
}
