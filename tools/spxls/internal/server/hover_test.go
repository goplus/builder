package server

import (
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentHover(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
import (
	"fmt"
	"image"
)

var (
	MySound  Sound
	MySprite Sprite

	// count is a variable.
	count int

	imagePoint image.Point
)

// MaxCount is a constant.
const MaxCount = 100

// Add is a function.
func Add(x, y int) int {
	return x + y
}

// Point is a type.
type Point struct {
	// X is a field.
	X int

	// Y is a field.
	Y int
}

fmt.Println(int8(1))

play MySound
MySprite.turn Left
MySprite.setCostume "costume1"
run "assets", {Title: "My Game"}
`),
				"MySprite.spx": []byte(`
onStart => {
	MySprite.turn Right
	clone
	imagePoint.X = 100
}
`),
				"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
				"assets/sounds/MySound/index.json":   []byte(`{}`),
			}
		}), nil)

		mySoundHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 7, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySoundHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sounds/MySound\" />\n",
			},
			Range: Range{
				Start: Position{Line: 7, Character: 1},
				End:   Position{Line: 7, Character: 8},
			},
		}, mySoundHover)

		mySpriteHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 8, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sprites/MySprite\" />\n",
			},
			Range: Range{
				Start: Position{Line: 8, Character: 1},
				End:   Position{Line: 8, Character: 9},
			},
		}, mySpriteHover)

		varHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 11, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, varHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>var count int</definition-overview-wrapper>\n<definition-detail def-id=\"gop:main?count\">\ncount is a variable.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 11, Character: 1},
				End:   Position{Line: 11, Character: 6},
			},
		}, varHover)

		constHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 17, Character: 6},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, constHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>const MaxCount = 100</definition-overview-wrapper>\n<definition-detail def-id=\"gop:main?MaxCount\">\nMaxCount is a constant.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 17, Character: 6},
				End:   Position{Line: 17, Character: 14},
			},
		}, constHover)

		funcHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 20, Character: 5},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, funcHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>func Add(x int, y int) int</definition-overview-wrapper>\n<definition-detail def-id=\"gop:main?Game.Add\">\nAdd is a function.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 20, Character: 5},
				End:   Position{Line: 20, Character: 8},
			},
		}, funcHover)

		typeHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 25, Character: 5},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, typeHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>type Point struct{X int; Y int}</definition-overview-wrapper>\n<definition-detail def-id=\"gop:main?Point\">\nPoint is a type.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 25, Character: 5},
				End:   Position{Line: 25, Character: 10},
			},
		}, typeHover)

		typeFieldHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 27, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, typeFieldHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>field X int</definition-overview-wrapper>\n<definition-detail def-id=\"gop:main?Point.X\">\nX is a field.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 27, Character: 1},
				End:   Position{Line: 27, Character: 2},
			},
		}, typeFieldHover)

		pkgHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 33, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, pkgHover)
		assert.Equal(t, Range{
			Start: Position{Line: 33, Character: 0},
			End:   Position{Line: 33, Character: 3},
		}, pkgHover.Range)

		pkgFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 33, Character: 4},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, pkgFuncHover)
		assert.Equal(t, Range{
			Start: Position{Line: 33, Character: 4},
			End:   Position{Line: 33, Character: 11},
		}, pkgFuncHover.Range)

		builtinFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 33, Character: 12},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, builtinFuncHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>type int8 int8</definition-overview-wrapper>\n<definition-detail def-id=\"gop:builtin?int8\">\nint8 is the set of all signed 8-bit integers.\nRange: -128 through 127.\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 33, Character: 12},
				End:   Position{Line: 33, Character: 16},
			},
		}, builtinFuncHover)

		mySoundRefHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 35, Character: 5},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySoundRefHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sounds/MySound\" />\n",
			},
			Range: Range{
				Start: Position{Line: 35, Character: 5},
				End:   Position{Line: 35, Character: 12},
			},
		}, mySoundRefHover)

		mySpriteRefHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 36, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteRefHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sprites/MySprite\" />\n",
			},
			Range: Range{
				Start: Position{Line: 36, Character: 0},
				End:   Position{Line: 36, Character: 8},
			},
		}, mySpriteRefHover)

		mySpriteCostumeRefHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 37, Character: 20},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteCostumeRefHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sprites/MySprite/costumes/costume1\" />\n",
			},
			Range: Range{
				Start: Position{Line: 37, Character: 20},
				End:   Position{Line: 37, Character: 30},
			},
		}, mySpriteCostumeRefHover)

		mySpriteSetCostumeFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 37, Character: 9},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteSetCostumeFuncHover)
		assert.Equal(t, Range{
			Start: Position{Line: 37, Character: 9},
			End:   Position{Line: 37, Character: 19},
		}, mySpriteSetCostumeFuncHover.Range)

		mySpriteCloneFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 3, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteCloneFuncHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>func clone()</definition-overview-wrapper>\n<definition-detail def-id=\"gop:github.com/goplus/spx?Sprite.clone#0\">\n</definition-detail>\n<definition-overview-wrapper>func clone(data interface{})</definition-overview-wrapper>\n<definition-detail def-id=\"gop:github.com/goplus/spx?Sprite.clone#1\">\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 3, Character: 1},
				End:   Position{Line: 3, Character: 6},
			},
		}, mySpriteCloneFuncHover)

		imagePointFieldHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 4, Character: 12},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, imagePointFieldHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-overview-wrapper>field X int</definition-overview-wrapper>\n<definition-detail def-id=\"gop:image?Point.X\">\n</definition-detail>\n",
			},
			Range: Range{
				Start: Position{Line: 4, Character: 12},
				End:   Position{Line: 4, Character: 13},
			},
		}, imagePointFieldHover)
	})

	t.Run("InvalidPosition", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`var x int`),
			}
		}), nil)

		hover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 99, Character: 99},
			},
		})
		require.NoError(t, err)
		require.Nil(t, hover)
	})
}
