package server

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentDocumentLink(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
const Backdrop1 BackdropName = "backdrop1"
const Backdrop1a = Backdrop1
var (
	MySound  Sound
	MySprite Sprite
)
run "assets", {Title: "Bullet (by Go+)"}
`),
			"MySprite.spx": []byte(`
onStart => {
	play "MySound"
	onBackdrop "backdrop1", func() {}
	MySprite.setCostume "costume1"
	MySprite.animate "anim1"
	getWidget Monitor, "widget1"
	var spriteName SpriteName = "MySprite"
	spriteName = "MySprite"
}
`),
			"assets/index.json":                  []byte(`{"backdrops":[{"name":"backdrop1"}],"zorder":[{"name":"widget1","type":"monitor"}]}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}],"fAnimations":{"anim1":{}}}`),
			"assets/sounds/MySound/index.json":   []byte(`{}`),
		}), nil)

		paramsForMainSpx := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}
		linksForMainSpx, err := s.textDocumentDocumentLink(paramsForMainSpx)
		require.NoError(t, err)
		require.Len(t, linksForMainSpx, 14)
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 1, Character: 6},
				End:   Position{Line: 1, Character: 15},
			},
			Target: toURI("gop:main?Backdrop1"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 1, Character: 16},
				End:   Position{Line: 1, Character: 28},
			},
			Target: toURI("gop:github.com/goplus/spx?BackdropName"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 1, Character: 31},
				End:   Position{Line: 1, Character: 42},
			},
			Target: toURI("spx://resources/backdrops/backdrop1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 6},
				End:   Position{Line: 2, Character: 16},
			},
			Target: toURI("gop:main?Backdrop1a"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 19},
				End:   Position{Line: 2, Character: 28},
			},
			Target: toURI("gop:main?Backdrop1"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 19},
				End:   Position{Line: 2, Character: 28},
			},
			Target: toURI("spx://resources/backdrops/backdrop1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindConstantReference,
			},
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 1},
				End:   Position{Line: 4, Character: 8},
			},
			Target: toURI("spx://resources/sounds/MySound"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindAutoBinding,
			},
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 1},
				End:   Position{Line: 4, Character: 8},
			},
			Target: toURI("gop:main?Game.MySound"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 10},
				End:   Position{Line: 4, Character: 15},
			},
			Target: toURI("gop:github.com/goplus/spx?Sound"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindAutoBinding,
			},
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 9},
			},
			Target: toURI("gop:main?Game.MySprite"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 10},
				End:   Position{Line: 5, Character: 16},
			},
			Target: toURI("gop:github.com/goplus/spx?Sprite"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 7, Character: 0},
				End:   Position{Line: 7, Character: 3},
			},
			Target: toURI("gop:github.com/goplus/spx?Game.run"),
		})
		assert.Contains(t, linksForMainSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 7, Character: 15},
				End:   Position{Line: 7, Character: 20},
			},
			Target: toURI("gop:github.com/goplus/spx?Game.Title"),
		})

		paramsForMySpriteSpx := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
		}
		linksForMySpriteSpx, err := s.textDocumentDocumentLink(paramsForMySpriteSpx)
		require.NoError(t, err)
		require.Len(t, linksForMySpriteSpx, 21)
		for _, link := range linksForMySpriteSpx {
			if link.Range.Start.Line > 6 {
				fmt.Println(link.Range, *link.Target)
			}
		}
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 12},
				End:   Position{Line: 3, Character: 23},
			},
			Target: toURI("spx://resources/backdrops/backdrop1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 6},
				End:   Position{Line: 2, Character: 15},
			},
			Target: toURI("spx://resources/sounds/MySound"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 5},
			},
			Target: toURI("gop:github.com/goplus/spx?Game.play#3"),
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 1},
				End:   Position{Line: 4, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindAutoBindingReference,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 9},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindAutoBindingReference,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 5, Character: 18},
				End:   Position{Line: 5, Character: 25},
			},
			Target: toURI("spx://resources/sprites/MySprite/animations/anim1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 4, Character: 21},
				End:   Position{Line: 4, Character: 31},
			},
			Target: toURI("spx://resources/sprites/MySprite/costumes/costume1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 6, Character: 20},
				End:   Position{Line: 6, Character: 29},
			},
			Target: toURI("spx://resources/widgets/widget1"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 7, Character: 29},
				End:   Position{Line: 7, Character: 39},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
		assert.Contains(t, linksForMySpriteSpx, DocumentLink{
			Range: Range{
				Start: Position{Line: 8, Character: 14},
				End:   Position{Line: 8, Character: 24},
			},
			Target: toURI("spx://resources/sprites/MySprite"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindStringLiteral,
			},
		})
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.gop": []byte(`echo "Hello, Go+!"`),
		}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		links, err := s.textDocumentDocumentLink(params)
		assert.NoError(t, err)
		assert.Nil(t, links)
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		links, err := s.textDocumentDocumentLink(params)
		assert.NoError(t, err)
		assert.Nil(t, links)
	})

	t.Run("ParseError", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
// Invalid syntax
var (
	MySound Sound
`),
			"assets/index.json":                []byte(`{}`),
			"assets/sounds/MySound/index.json": []byte(`{}`),
		}), nil)
		params := &DocumentLinkParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		links, err := s.textDocumentDocumentLink(params)
		require.NoError(t, err)
		require.Len(t, links, 3)
		assert.Contains(t, links, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 1},
				End:   Position{Line: 3, Character: 8},
			},
			Target: toURI("spx://resources/sounds/MySound"),
			Data: SpxResourceRefDocumentLinkData{
				Kind: SpxResourceRefKindAutoBinding,
			},
		})
		assert.Contains(t, links, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 1},
				End:   Position{Line: 3, Character: 8},
			},
			Target: toURI("gop:main?Game.MySound"),
		})
		assert.Contains(t, links, DocumentLink{
			Range: Range{
				Start: Position{Line: 3, Character: 9},
				End:   Position{Line: 3, Character: 14},
			},
			Target: toURI("gop:github.com/goplus/spx?Sound"),
		})
	})
}
