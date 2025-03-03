package server

import (
	"slices"
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentCompletion(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)

MySprite.
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

		emptyLineItems, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, emptyLineItems)
		assert.NotEmpty(t, emptyLineItems)
		assert.True(t, containsCompletionItemLabel(emptyLineItems, "println"))
		assert.True(t, containsCompletionSpxDefinitionID(emptyLineItems, SpxDefinitionIdentifier{
			Package: util.ToPtr("main"),
			Name:    util.ToPtr("MySprite"),
		}))

		assert.Contains(t, emptyLineItems, SpxDefinition{
			ID: SpxDefinitionIdentifier{
				Package: util.ToPtr("github.com/goplus/spx"),
				Name:    util.ToPtr("Game.getWidget"),
			},
			Overview: "func getWidget(T Type, name WidgetName) *T",

			CompletionItemLabel:            "getWidget",
			CompletionItemKind:             FunctionCompletion,
			CompletionItemInsertText:       "getWidget",
			CompletionItemInsertTextFormat: PlainTextTextFormat,
		}.CompletionItem())

		mySpriteDotItems, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 5, Character: 9},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteDotItems)
		assert.NotEmpty(t, mySpriteDotItems)
		assert.False(t, containsCompletionItemLabel(mySpriteDotItems, "println"))
		assert.True(t, containsCompletionSpxDefinitionID(mySpriteDotItems, SpxDefinitionIdentifier{
			Package:    util.ToPtr("github.com/goplus/spx"),
			Name:       util.ToPtr("Sprite.turn"),
			OverloadID: util.ToPtr("0"),
		}))
		assert.True(t, containsCompletionSpxDefinitionID(mySpriteDotItems, SpxDefinitionIdentifier{
			Package:    util.ToPtr("github.com/goplus/spx"),
			Name:       util.ToPtr("Sprite.turn"),
			OverloadID: util.ToPtr("1"),
		}))
		assert.True(t, containsCompletionSpxDefinitionID(mySpriteDotItems, SpxDefinitionIdentifier{
			Package:    util.ToPtr("github.com/goplus/spx"),
			Name:       util.ToPtr("Sprite.turn"),
			OverloadID: util.ToPtr("2"),
		}))
		assert.True(t, containsCompletionSpxDefinitionID(mySpriteDotItems, SpxDefinitionIdentifier{
			Package:    util.ToPtr("github.com/goplus/spx"),
			Name:       util.ToPtr("Sprite.clone"),
			OverloadID: util.ToPtr("0"),
		}))
		assert.True(t, containsCompletionSpxDefinitionID(mySpriteDotItems, SpxDefinitionIdentifier{
			Package:    util.ToPtr("github.com/goplus/spx"),
			Name:       util.ToPtr("Sprite.clone"),
			OverloadID: util.ToPtr("1"),
		}))
	})

	t.Run("InSpxEventHandler", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onStart => {

}
run "assets", {Title: "My Game"}
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.False(t, containsCompletionSpxDefinitionID(items, SpxDefinitionIdentifier{
			Package: util.ToPtr("github.com/goplus/spx"),
			Name:    util.ToPtr("Sprite.onStart"),
		}))
		assert.False(t, containsCompletionSpxDefinitionID(items, SpxDefinitionIdentifier{
			Package: util.ToPtr("github.com/goplus/spx"),
			Name:    util.ToPtr("Sprite.onClick"),
		}))
	})

	t.Run("InStringLit", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "a
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 6},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.Empty(t, items)
	})

	t.Run("InComment", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
// Run My G
run "assets", {Title: "My Game"}
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 11},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.Empty(t, items)
	})

	t.Run("InStringLit", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "a
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 6},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.Empty(t, items)
	})

	t.Run("InImportStringLit", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
import "f
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 9},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "fmt"))
	})

	t.Run("InImportGroupStringLit", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
import (
	"f
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 3},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "fmt"))
	})

	t.Run("PackageMember", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
import "fmt"
fmt.
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 4},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "println"))
	})

	t.Run("GeneralOrUnknown", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`

onStart => {

}
run "assets", {Title: "My Game"}
`),
		}), nil)

		items1, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items1)
		assert.NotEmpty(t, items1)
		assert.True(t, containsCompletionItemLabel(items1, "len"))

		items2, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 12},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items2)
		assert.Empty(t, items2)

		items3, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 3, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items3)
		assert.NotEmpty(t, items3)
		assert.True(t, containsCompletionItemLabel(items3, "len"))
	})

	t.Run("VarDecl", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
func test() {}
onStart => {
	var x i
}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 3, Character: 8},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "int"))
		assert.True(t, containsCompletionItemLabel(items, "MySprite"))
		assert.True(t, containsCompletionItemLabel(items, "Sprite"))
		assert.False(t, containsCompletionItemLabel(items, "len"))
		assert.False(t, containsCompletionItemLabel(items, "test"))
		assert.False(t, containsCompletionItemLabel(items, "play"))
	})

	t.Run("VarDeclAndAssign", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onStart => {
	var x SpriteName = "m"
}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 22},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "MySprite"))
	})

	t.Run("SpxSoundResourceStringLit", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
play "r"
run "assets", {Title: "My Game"}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sounds/recording/index.json": []byte(`{}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 7},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "recording"))
	})

	t.Run("FuncOverloads", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	recording Sound
)

play r
run "assets", {Title: "My Game"}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sounds/recording/index.json": []byte(`{}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 5, Character: 6},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "recording"))
		assert.True(t, containsCompletionItemLabel(items, `"recording"`))
	})

	t.Run("WithImplicitSpxSpriteResource", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onClick => {
	setCostume "c"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume"}]}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 2, Character: 14},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "costume"))
	})

	t.Run("WithExplicitSpxSpriteResource", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)

MySprite.setCostume "c"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume"}]}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 5, Character: 22},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "costume"))
	})

	t.Run("WithCrossSpxSpriteResource", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sprite1 Sprite
	Sprite2 Sprite2
)
run "assets", {Title: "My Game"}
`),
			"Sprite1.spx": []byte(`
onClick => {
	Sprite2.setCostume "c"
}
`),
			"Sprite2.spx": []byte(`
`),
			"assets/index.json":                 []byte(`{}`),
			"assets/sprites/Sprite1/index.json": []byte(`{"costumes":[{"name":"Sprite1Costume"}]}`),
			"assets/sprites/Sprite2/index.json": []byte(`{"costumes":[{"name":"Sprite2Costume"}]}`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///Sprite1.spx"},
				Position:     Position{Line: 2, Character: 22},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "Sprite2Costume"))
	})

	t.Run("AtLineStartWithAnIdentifier", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onClick => {
	pr
}
`),
		}), nil)

		items, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 3},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items)
		assert.NotEmpty(t, items)
		assert.True(t, containsCompletionItemLabel(items, "println"))
	})

	t.Run("AtLineStartWithAMemberAccessExpression", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.setCo`), // Cursor at EOF.
			"MySprite.spx": []byte(`
onClick => {
	MySprite.setCo
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		items1, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 14},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items1)
		assert.NotEmpty(t, items1)
		assert.True(t, containsCompletionItemLabel(items1, "setCostume"))

		items2, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 2, Character: 15},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items2)
		assert.NotEmpty(t, items2)
		assert.True(t, containsCompletionItemLabel(items2, "setCostume"))
	})

	t.Run("WithGopBuiltins", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onClick => {
	var n in
}
`),
			"MySprite.spx": []byte(`
onClick => {
	ec
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		items1, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 9},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items1)
		assert.NotEmpty(t, items1)
		assert.True(t, containsCompletionItemLabel(items1, "int128"))

		items2, err := s.textDocumentCompletion(&CompletionParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 2, Character: 3},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, items2)
		assert.NotEmpty(t, items2)
		assert.True(t, containsCompletionItemLabel(items2, "echo"))
	})
}

func containsCompletionItemLabel(items []CompletionItem, label string) bool {
	return slices.ContainsFunc(items, func(item CompletionItem) bool {
		return item.Label == label
	})
}

func containsCompletionSpxDefinitionID(items []CompletionItem, id SpxDefinitionIdentifier) bool {
	return slices.ContainsFunc(items, func(item CompletionItem) bool {
		itemData, ok := item.Data.(*CompletionItemData)
		if !ok {
			return false
		}
		return itemData.Definition.String() == id.String()
	})
}
