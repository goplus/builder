package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentHover(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
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
Game.onClick => {}
onClick => {}
on "MySprite"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
MySprite.onClick => {}
onClick => {}
onStart => {
	MySprite.turn Right
	clone
	imagePoint.X = 100
}
onTouchStart ["MySprite"], => {}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
			"assets/sounds/MySound/index.json":   []byte(`{}`),
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
				Value: "<definition-item def-id=\"gop:main?Game.count\" overview=\"var count int\">\ncount is a variable.\n</definition-item>\n",
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
				Value: "<definition-item def-id=\"gop:main?MaxCount\" overview=\"const MaxCount = 100\">\nMaxCount is a constant.\n</definition-item>\n",
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
				Value: "<definition-item def-id=\"gop:main?Game.Add\" overview=\"func Add(x int, y int) int\">\nAdd is a function.\n</definition-item>\n",
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
				Value: "<definition-item def-id=\"gop:main?Point\" overview=\"type Point\">\nPoint is a type.\n</definition-item>\n",
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
				Value: "<definition-item def-id=\"gop:main?Point.X\" overview=\"field X int\">\nX is a field.\n</definition-item>\n",
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
				Value: "<definition-item def-id=\"gop:builtin?int8\" overview=\"type int8\">\nint8 is the set of all signed 8-bit integers.\nRange: -128 through 127.\n</definition-item>\n",
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

		GameOnClickHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 38, Character: 5},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, GameOnClickHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:github.com/goplus/spx?Game.onClick\" overview=\"func onClick(onClick func())\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 38, Character: 5},
				End:   Position{Line: 38, Character: 12},
			},
		}, GameOnClickHover)

		mainSpxOnClickHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 39, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mainSpxOnClickHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:github.com/goplus/spx?Game.onClick\" overview=\"func onClick(onClick func())\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 39, Character: 0},
				End:   Position{Line: 39, Character: 7},
			},
		}, mainSpxOnClickHover)

		mainSpxOnHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 40, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mainSpxOnHover)
		assert.Contains(t, mainSpxOnHover.Contents.Value, `def-id="gop:github.com/goplus/spx?Game.on#2"`)
		assert.Equal(t, Range{
			Start: Position{Line: 40, Character: 0},
			End:   Position{Line: 40, Character: 2},
		}, mainSpxOnHover.Range)

		mySpriteOnClickFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 1, Character: 9},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteOnClickFuncHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:github.com/goplus/spx?Sprite.onClick\" overview=\"func onClick(onClick func())\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 1, Character: 9},
				End:   Position{Line: 1, Character: 16},
			},
		}, mySpriteOnClickFuncHover)

		mySpriteSpxOnClickFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 2, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteSpxOnClickFuncHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:github.com/goplus/spx?Sprite.onClick\" overview=\"func onClick(onClick func())\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 2, Character: 0},
				End:   Position{Line: 2, Character: 7},
			},
		}, mySpriteSpxOnClickFuncHover)

		mySpriteCloneFuncHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 5, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, mySpriteCloneFuncHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:github.com/goplus/spx?Sprite.clone#0\" overview=\"func clone()\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 6},
			},
		}, mySpriteCloneFuncHover)

		imagePointFieldHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 6, Character: 12},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, imagePointFieldHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<definition-item def-id=\"gop:image?Point.X\" overview=\"field X int\">\n</definition-item>\n",
			},
			Range: Range{
				Start: Position{Line: 6, Character: 12},
				End:   Position{Line: 6, Character: 13},
			},
		}, imagePointFieldHover)

		onTouchStartFirstArgHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 8, Character: 14},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, onTouchStartFirstArgHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "<resource-preview resource=\"spx://resources/sprites/MySprite\" />\n",
			},
			Range: Range{
				Start: Position{Line: 8, Character: 14},
				End:   Position{Line: 8, Character: 24},
			},
		}, onTouchStartFirstArgHover)
	})

	t.Run("InvalidPosition", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`var x int`),
		}), nil)

		hover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 99, Character: 99},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover)
		assert.Contains(t, hover.Contents.Value, `def-id="gop:builtin?int"`)
		assert.Equal(t, Range{
			Start: Position{Line: 0, Character: 6},
			End:   Position{Line: 0, Character: 9},
		}, hover.Range)
	})

	t.Run("ImportsAtASTFilePosition", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
import (
	"fmt"
	"image"
)

fmt.Println("Hello, World!")
`),
		}), nil)

		importHover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, importHover)
		assert.Equal(t, &Hover{
			Contents: MarkupContent{
				Kind:  Markdown,
				Value: "Package fmt implements formatted I/O with functions analogous to C's printf and scanf.",
			},
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 6},
			},
		}, importHover)
	})

	t.Run("Append", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var nums []int
nums = append(nums, 1)
`),
		}), nil)

		hover, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 7},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover)
		assert.Contains(t, hover.Contents.Value, `def-id="gop:builtin?append"`)
		assert.Equal(t, Range{
			Start: Position{Line: 2, Character: 7},
			End:   Position{Line: 2, Character: 13},
		}, hover.Range)
	})

	t.Run("WithGopBuiltins", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var num int128
echo num
`),
		}), nil)

		hover1, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 1, Character: 8},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover1)
		assert.Contains(t, hover1.Contents.Value, `def-id="gop:builtin?int128"`)
		assert.Equal(t, Range{
			Start: Position{Line: 1, Character: 8},
			End:   Position{Line: 1, Character: 14},
		}, hover1.Range)

		hover2, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover2)
		assert.Contains(t, hover2.Contents.Value, `def-id="gop:fmt?println"`)
		assert.Equal(t, Range{
			Start: Position{Line: 2, Character: 0},
			End:   Position{Line: 2, Character: 4},
		}, hover2.Range)
	})

	t.Run("WithNonENCharacters", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onStart => {
	var 中文 []int
	中文 = append(中文, 1)
	println "非英文", 中文
}
`),
		}), nil)

		hover1, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 3, Character: 15},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover1)
		assert.Contains(t, hover1.Contents.Value, `def-id="gop:main?%E4%B8%AD%E6%96%87"`)
		assert.Equal(t, Range{
			Start: Position{Line: 3, Character: 13},
			End:   Position{Line: 3, Character: 15},
		}, hover1.Range)

		hover2, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 3, Character: 18},
			},
		})
		require.NoError(t, err)
		require.Nil(t, hover2)

		hover3, err := s.textDocumentHover(&HoverParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 18},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, hover3)
		assert.Contains(t, hover3.Contents.Value, `def-id="gop:main?%E4%B8%AD%E6%96%87"`)
		assert.Equal(t, Range{
			Start: Position{Line: 4, Character: 16},
			End:   Position{Line: 4, Character: 18},
		}, hover3.Range)
	})
}
