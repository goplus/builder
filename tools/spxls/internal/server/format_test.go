package server

import (
	"io/fs"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentFormatting(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
// An spx game.

var (
  MyAircraft MyAircraft
  Bullet Bullet
)
type Score int
run "assets",    { Title:    "Bullet (by Go+)" }
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 9, Character: 0},
			},
			NewText: `// An spx game.

type Score int

var (
	MyAircraft MyAircraft
	Bullet     Bullet
)

run "assets", {Title: "Bullet (by Go+)"}
`,
		})
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.gop": []byte(`echo "Hello, Go+!"`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Nil(t, edits)
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.ErrorIs(t, err, fs.ErrNotExist)
		require.Nil(t, edits)
	})

	t.Run("NoChangesNeeded", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`run "assets", {Title: "Bullet (by Go+)"}` + "\n"),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Nil(t, edits)
	})

	t.Run("AcceptableFormatError", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.

var MyAircraft MyAircraft
!InvalidSyntax
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 4, Character: 0},
			},
			NewText: `// An spx game.

var (
	MyAircraft MyAircraft
)

!InvalidSyntax
`,
		})
	})

	t.Run("WithFormatSpx", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.

var (
	// The aircraft.
	MyAircraft MyAircraft // The only aircraft.
)

var Bullet Bullet // The first bullet.

// The second bullet.
var Bullet2 Bullet

var (
	// The third bullet.
	Bullet3 Bullet
)

// The fifth var block.
var (
	Bullet4 Bullet // The fourth bullet.
)

// The last var block.
var (
	// The fifth bullet.
	Bullet5 Bullet

	Bullet6 Bullet // The sixth bullet.
)
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 29, Character: 0},
			},
			NewText: `// An spx game.

var (
	// The aircraft.
	MyAircraft MyAircraft // The only aircraft.

	Bullet Bullet // The first bullet.

	// The second bullet.
	Bullet2 Bullet

	// The third bullet.
	Bullet3 Bullet

	// The fifth var block.

	Bullet4 Bullet // The fourth bullet.

	// The last var block.

	// The fifth bullet.
	Bullet5 Bullet

	Bullet6 Bullet // The sixth bullet.
)
`,
		})
	})

	t.Run("NoTypeSpriteVarDeclaration", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.

var (
	MySprite
)

run "assets", {Title: "My Game"}
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Nil(t, edits)
	})

	t.Run("WithImportStmt", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.
import "math"

onClick => {
	println math.floor(2.5)
}

run "assets", {Title: "My Game"}
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Nil(t, edits)
	})

	t.Run("WithUnusedLambdaParams", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.
onKey [KeyLeft, KeyRight], (key) => {
	println "key"
}

onKey [KeyLeft, KeyRight], (key) => {
	println key
}
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 8, Character: 0},
			},
			NewText: `// An spx game.

onKey [KeyLeft, KeyRight], () => {
	println "key"
}

onKey [KeyLeft, KeyRight], (key) => {
	println key
}
`,
		})
	})

	t.Run("WithUnusedLambdaParamsForSprite", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": {},
			"MySprite.spx": []byte(`// An spx game.
onKey [KeyLeft, KeyRight], (key) => {
	println "key"
}
onTouchStart s => {}
onTouchStart s => {
	println "touched", s
}
onTouchStart => {}
onTouchStart (s, t) => { // type mismatch
}
onTouchStart 123, (s) => { // type mismatch
}
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 13, Character: 0},
			},
			NewText: `// An spx game.

onKey [KeyLeft, KeyRight], () => {
	println "key"
}
onTouchStart => {
}
onTouchStart s => {
	println "touched", s
}
onTouchStart => {
}
onTouchStart (s, t) => { // type mismatch
}
onTouchStart 123, (s) => { // type mismatch
}
`,
		})
	})

	t.Run("EmptyFile", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(``),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Nil(t, edits)
	})

	t.Run("WhitespaceOnlyFile", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(` `),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 0, Character: 1},
			},
			NewText: ``,
		})
	})

	t.Run("WithFloatingComments", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`import "fmt"

// floating comment1

// comment for var a
var a int

// floating comment2

// comment for func test
func test() {
	// comment inside func test
}

// floating comment3

// comment for const b
const b = "123"

// floating comment4
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 20, Character: 0},
			},
			NewText: `import "fmt"

// floating comment1

// floating comment2

// floating comment3

// comment for const b
const b = "123"

// comment for var a
var (
	a int
)

// comment for func test
func test() {
	// comment inside func test
}

// floating comment4
`,
		})
	})

	t.Run("WithTrailingComments", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`import "fmt" // trailing comment for import "fmt"

const foo = "bar" // trailing comment for const foo

var a int // trailing comment for var a

func test() {} // trailing comment for func test
`),
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		require.NoError(t, err)
		require.Len(t, edits, 1)
		assert.Contains(t, edits, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 7, Character: 0},
			},
			NewText: `import "fmt" // trailing comment for import "fmt"

const foo = "bar" // trailing comment for const foo

var (
	a int
) // trailing comment for var a

func test() {} // trailing comment for func test
`,
		})
	})
}
