package server

import (
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentDocumentLink(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
var (
	MySound  Sound
	MySprite Sprite
)
run "assets", {Title: "Bullet (by Go+)"}
`),
				"MySprite.spx": []byte(`
onStart => {
	play "sound1"
	onBackdrop "backdrop1", func() {}
	MySprite.setCostume "costume1"
	MySprite.animate "anim1"
	getWidget Monitor, "widget1"
}
`),
				"assets/index.json":                  []byte(`{"backdrops":[{"name":"backdrop1"}],"zorder":[{"name":"widget1","type":"monitor"}]}`),
				"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}],"fAnimations":{"anim1":{}}}`),
				"assets/sounds/sound1/index.json":    []byte(`{}`),
			}
		}), nil)

		paramsForMainSpx := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}
		linksForMainSpx, err := s.textDocumentDocumentLink(paramsForMainSpx)
		require.NoError(t, err)
		require.Len(t, linksForMainSpx, 2)
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 8},
			},
			Target: toURI("spx://resources/sounds/MySound"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 1},
				End:   Position{Line: 3, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
		})

		paramsForMySpriteSpx := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
		}
		linksForMySpriteSpx, err := s.textDocumentDocumentLink(paramsForMySpriteSpx)
		require.NoError(t, err)
		require.Len(t, linksForMySpriteSpx, 7)
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 12},
				End:   Position{Line: 3, Character: 23},
			},
			Target: toURI("spx://resources/backdrops/backdrop1"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 6},
				End:   Position{Line: 2, Character: 14},
			},
			Target: toURI("spx://resources/sounds/sound1"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 1},
				End:   Position{Line: 4, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 18},
				End:   Position{Line: 5, Character: 25},
			},
			Target: toURI("spx://resources/sprites/MySprite/animations/anim1"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 21},
				End:   Position{Line: 4, Character: 31},
			},
			Target: toURI("spx://resources/sprites/MySprite/costumes/costume1"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 6, Character: 20},
				End:   Position{Line: 6, Character: 29},
			},
			Target: toURI("spx://resources/widgets/widget1"),
		})
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.gop": []byte(`echo "Hello, Go+!"`),
			}
		}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		links, err := s.textDocumentDocumentLink(params)
		assert.NoError(t, err)
		assert.Nil(t, links)
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{}
		}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		links, err := s.textDocumentDocumentLink(params)
		assert.NoError(t, err)
		assert.Nil(t, links)
	})

	t.Run("ParseError", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
// Invalid syntax
var (
	MySound Sound
`),
			}
		}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		links, err := s.textDocumentDocumentLink(params)
		assert.NoError(t, err)
		assert.Nil(t, links)
	})
}
