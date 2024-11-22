package server

import (
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/stretchr/testify/assert"
)

func TestServerTextDocumentFormatting(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
// A spx game.

var (
  MyAircraft MyAircraft
  Bullet Bullet
)
run "assets",    { Title:    "Bullet (by Go+)" }
`),
			}
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.NoError(t, err)
		assert.Len(t, edits, 1)
		assert.Equal(t, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 8, Character: 0},
			},
			NewText: `// A spx game.

var (
	MyAircraft MyAircraft
	Bullet     Bullet
)

run "assets", {Title: "Bullet (by Go+)"}
`,
		}, edits[0])
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.gop": []byte(`echo "Hello, Go+!"`),
			}
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.NoError(t, err)
		assert.Nil(t, edits)
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return nil
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.Error(t, err)
		assert.Nil(t, edits)
	})

	t.Run("NoChangesNeeded", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`run "assets", {Title: "Bullet (by Go+)"}` + "\n"),
			}
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.NoError(t, err)
		assert.Nil(t, edits)
	})

	t.Run("FormatError", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte("vbr Foobar string"),
			}
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to format document")
		assert.Nil(t, edits)
	})

	t.Run("WithFormatSpx", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`// A spx game.

func Func1() {}

var (
	MyAircraft MyAircraft
)

func Func2() {}

var Bullet Bullet

func Func3() {}

run "assets", {Title: "Bullet (by Go+)"}
`),
			}
		}), nil)
		params := &DocumentFormattingParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		edits, err := s.textDocumentFormatting(params)
		assert.NoError(t, err)
		assert.Len(t, edits, 1)
		assert.Equal(t, TextEdit{
			Range: Range{
				Start: Position{Line: 0, Character: 0},
				End:   Position{Line: 15, Character: 0},
			},
			NewText: `// A spx game.

var (
	MyAircraft MyAircraft
	Bullet     Bullet
)

func Func1() {}

func Func2() {}

func Func3() {}

run "assets", {Title: "Bullet (by Go+)"}
`,
		}, edits[0])
	})
}
