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

		mainSpxFileScopeParams := []SpxGetDefinitionsParams{
			{
				TextDocumentPositionParams: TextDocumentPositionParams{
					TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
					Position:     Position{Line: 0, Character: 0},
				},
			},
		}
		mainSpxFileScopeDefs, err := s.spxGetDefinitions(mainSpxFileScopeParams)
		require.NoError(t, err)
		require.NotNil(t, mainSpxFileScopeDefs)
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("builtin"),
			Name:    toStringPtr("println"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("main"),
			Name:    toStringPtr("MySprite"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Game.play"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Game.onStart"),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Sprite.turn"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mainSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Sprite.onStart"),
		}))

		mySpriteSpxFileScopeParams := []SpxGetDefinitionsParams{
			{
				TextDocumentPositionParams: TextDocumentPositionParams{
					TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
					Position:     Position{Line: 0, Character: 0},
				},
			},
		}
		mySpriteSpxFileScopeDefs, err := s.spxGetDefinitions(mySpriteSpxFileScopeParams)
		require.NoError(t, err)
		require.NotNil(t, mySpriteSpxFileScopeDefs)
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("builtin"),
			Name:    toStringPtr("println"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Game.play"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mySpriteSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Game.onStart"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Sprite.turn"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxFileScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Sprite.onStart"),
		}))

		mySpriteSpxOnStartScopeParams := []SpxGetDefinitionsParams{
			{
				TextDocumentPositionParams: TextDocumentPositionParams{
					TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
					Position:     Position{Line: 2, Character: 0},
				},
			},
		}
		mySpriteSpxOnStartScopeDefs, err := s.spxGetDefinitions(mySpriteSpxOnStartScopeParams)
		require.NoError(t, err)
		require.NotNil(t, mySpriteSpxOnStartScopeDefs)
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxOnStartScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr("builtin"),
			Name:    toStringPtr("println"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxOnStartScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Game.play"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mySpriteSpxOnStartScopeDefs, SpxDefinitionIdentifier{
			Package: toStringPtr(spxPkgPath),
			Name:    toStringPtr("Game.onStart"),
		}))
		assert.True(t, spxDefinitionIdentifierSliceContains(mySpriteSpxOnStartScopeDefs, SpxDefinitionIdentifier{
			Package:       toStringPtr(spxPkgPath),
			Name:          toStringPtr("Sprite.turn"),
			OverloadIndex: toIntPtr(1),
		}))
		assert.False(t, spxDefinitionIdentifierSliceContains(mySpriteSpxOnStartScopeDefs, SpxDefinitionIdentifier{
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
