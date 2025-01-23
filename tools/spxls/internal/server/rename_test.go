package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerTextDocumentPrepareRename(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
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
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		range1, err := s.textDocumentPrepareRename(&PrepareRenameParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 1},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, range1)
		assert.Equal(t, Range{
			Start: Position{Line: 2, Character: 1},
			End:   Position{Line: 2, Character: 9},
		}, *range1)

		range2, err := s.textDocumentPrepareRename(&PrepareRenameParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 4, Character: 0},
			},
		})
		require.NoError(t, err)
		require.NotNil(t, range2)
		assert.Equal(t, Range{
			Start: Position{Line: 4, Character: 0},
			End:   Position{Line: 4, Character: 8},
		}, *range2)

		range3, err := s.textDocumentPrepareRename(&PrepareRenameParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 10},
			},
		})
		require.NoError(t, err)
		require.Nil(t, range3)
	})

	t.Run("ThisPtr", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onClick => {
	_ = this
}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onClick => {
	_ = this
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		range1, err := s.textDocumentPrepareRename(&PrepareRenameParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
				Position:     Position{Line: 2, Character: 5},
			},
		})
		require.NoError(t, err)
		require.Nil(t, range1)

		range2, err := s.textDocumentPrepareRename(&PrepareRenameParams{
			TextDocumentPositionParams: TextDocumentPositionParams{
				TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
				Position:     Position{Line: 2, Character: 5},
			},
		})
		require.NoError(t, err)
		require.Nil(t, range2)
	})
}

func TestServerTextDocumentRename(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
const Foo = "bar"
MySprite.turn Left
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
println Foo
onStart => {
	MySprite.turn Right
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		workspaceEdit, err := s.textDocumentRename(&RenameParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
			Position:     Position{Line: 4, Character: 6},
			NewName:      "Bar",
		})
		require.NoError(t, err)
		require.NotNil(t, workspaceEdit)
		require.NotNil(t, workspaceEdit.Changes)

		mainSpxChanges := workspaceEdit.Changes["file:///main.spx"]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 6},
				End:   Position{Line: 4, Character: 9},
			},
			NewText: "Bar",
		})

		mySpriteSpxChanges := workspaceEdit.Changes["file:///MySprite.spx"]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 1, Character: 8},
				End:   Position{Line: 1, Character: 11},
			},
			NewText: "Bar",
		})
	})

	t.Run("RenameReference", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
const Foo = "bar"
MySprite.turn Left
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
println Foo
onStart => {
	MySprite.turn Right
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		workspaceEdit, err := s.textDocumentRename(&RenameParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
			Position:     Position{Line: 1, Character: 9},
			NewName:      "Bar",
		})
		require.NoError(t, err)
		require.NotNil(t, workspaceEdit)
		require.NotNil(t, workspaceEdit.Changes)

		mainSpxChanges := workspaceEdit.Changes["file:///main.spx"]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 6},
				End:   Position{Line: 4, Character: 9},
			},
			NewText: "Bar",
		})

		mySpriteSpxChanges := workspaceEdit.Changes["file:///MySprite.spx"]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 1, Character: 8},
				End:   Position{Line: 1, Character: 11},
			},
			NewText: "Bar",
		})
	})

	t.Run("SpxResource", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
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
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		workspaceEdit, err := s.textDocumentRename(&RenameParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
			Position:     Position{Line: 2, Character: 4},
			NewName:      "NewSprite",
		})
		require.NoError(t, err)
		require.NotNil(t, workspaceEdit)
		require.NotNil(t, workspaceEdit.Changes)

		mainSpxChanges := workspaceEdit.Changes["file:///main.spx"]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 9},
			},
			NewText: "NewSprite",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 0},
				End:   Position{Line: 4, Character: 8},
			},
			NewText: "NewSprite",
		})

		mySpriteSpxChanges := workspaceEdit.Changes["file:///MySprite.spx"]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 9},
			},
			NewText: "NewSprite",
		})
	})

	t.Run("ThisPtr", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onClick => {
	_ = this
}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onClick => {
	_ = this
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		mainSpxWorkspaceEdit, err := s.textDocumentRename(&RenameParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
			Position:     Position{Line: 2, Character: 5},
			NewName:      "that",
		})
		require.EqualError(t, err, `failed to find definition of object "this"`)
		require.Nil(t, mainSpxWorkspaceEdit)

		mySpriteSpxWorkspaceEdit, err := s.textDocumentRename(&RenameParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///MySprite.spx"},
			Position:     Position{Line: 2, Character: 5},
			NewName:      "that",
		})
		require.EqualError(t, err, `failed to find definition of object "this"`)
		require.Nil(t, mySpriteSpxWorkspaceEdit)
	})
}

func TestServerSpxRenameBackdropResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onBackdrop "backdrop1", func() {}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	onBackdrop "backdrop1", func() {}
}
`),
			"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, id.(SpxBackdropResourceID), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 1, Character: 12},
				End:   Position{Line: 1, Character: 21},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 13},
				End:   Position{Line: 2, Character: 22},
			},
			NewText: "backdrop2",
		})
	})

	t.Run("ConstantName", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
const Backdrop1 = "backdrop1"
onBackdrop Backdrop1, func() {}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	onBackdrop Backdrop1, func() {}
}
`),
			"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, id.(SpxBackdropResourceID), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 1)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 1, Character: 19},
				End:   Position{Line: 1, Character: 28},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 0)
	})

	t.Run("TypedConstantName", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
const Backdrop1 BackdropName = "backdrop1"
onBackdrop "backdrop1", func() {}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	onBackdrop "backdrop1", func() {}
}
`),
			"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, id.(SpxBackdropResourceID), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 1, Character: 32},
				End:   Position{Line: 1, Character: 41},
			},
			NewText: "backdrop2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 12},
				End:   Position{Line: 2, Character: 21},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 13},
				End:   Position{Line: 2, Character: 22},
			},
			NewText: "backdrop2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onBackdrop "backdrop1", func() {}
run "assets", {Title: "My Game"}
`),
			"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"},{"name":"backdrop2","path":"backdrop2.png"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, id.(SpxBackdropResourceID), "backdrop2")
		require.EqualError(t, err, `backdrop resource "backdrop2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSoundResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sound1 Sound
)
play "Sound1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	play Sound1
}
`),
			"assets/index.json":               []byte(`{}`),
			"assets/sounds/Sound1/index.json": []byte(`{"path":"sound1.wav"}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sounds/Sound1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSoundResource(result, id.(SpxSoundResourceID), "Sound2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 7},
			},
			NewText: "Sound2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 6},
				End:   Position{Line: 4, Character: 12},
			},
			NewText: "Sound2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 6},
				End:   Position{Line: 2, Character: 12},
			},
			NewText: "Sound2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
play "Sound1"
run "assets", {Title: "My Game"}
`),
			"assets/index.json":               []byte(`{}`),
			"assets/sounds/Sound1/index.json": []byte(`{"path":"sound1.wav"}`),
			"assets/sounds/Sound2/index.json": []byte(`{"path":"sound2.wav"}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sounds/Sound1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSoundResource(result, id.(SpxSoundResourceID), "Sound2")
		require.EqualError(t, err, `sound resource "Sound2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sprite1 Sprite
)
Sprite1.turn Left
run "assets", {Title: "My Game"}
`),
			"Sprite1.spx": []byte(`
onStart => {
	Sprite1.turn Right
}
`),
			"assets/index.json":                 []byte(`{}`),
			"assets/sprites/Sprite1/index.json": []byte(`{}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, id.(SpxSpriteResourceID), "Sprite2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 8},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 0},
				End:   Position{Line: 4, Character: 7},
			},
			NewText: "Sprite2",
		})

		sprite1SpxChanges := changes[s.toDocumentURI("Sprite1.spx")]
		require.Len(t, sprite1SpxChanges, 1)
		assert.Contains(t, sprite1SpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 8},
			},
			NewText: "Sprite2",
		})
	})

	t.Run("SpriteType", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sprite1 Sprite1
)
Sprite1.turn Left
run "assets", {Title: "My Game"}
`),
			"Sprite1.spx": []byte(`
onStart => {
	Sprite1.turn Right
}
`),
			"assets/index.json":                 []byte(`{}`),
			"assets/sprites/Sprite1/index.json": []byte(`{}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, id.(SpxSpriteResourceID), "Sprite2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 3)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 8},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 9},
				End:   Position{Line: 2, Character: 16},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 0},
				End:   Position{Line: 4, Character: 7},
			},
			NewText: "Sprite2",
		})

		sprite1SpxChanges := changes[s.toDocumentURI("Sprite1.spx")]
		require.Len(t, sprite1SpxChanges, 1)
		assert.Contains(t, sprite1SpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 1},
				End:   Position{Line: 2, Character: 8},
			},
			NewText: "Sprite2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sprite1 Sprite
	Sprite2 Sprite
)
Sprite1.turn Left
Sprite2.turn Left
run "assets", {Title: "My Game"}
`),
			"Sprite1.spx": []byte(`
onStart => {
	Sprite1.turn Right
}
`),
			"Sprite2.spx": []byte(`
onStart => {
	Sprite2.turn Right
}
`),
			"assets/index.json":                 []byte(`{}`),
			"assets/sprites/Sprite1/index.json": []byte(`{}`),
			"assets/sprites/Sprite2/index.json": []byte(`{}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, id.(SpxSpriteResourceID), "Sprite2")
		require.EqualError(t, err, `sprite resource "Sprite2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteCostumeResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.setCostume "costume1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	setCostume "costume1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, id.(SpxSpriteCostumeResourceID), "costume2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 21},
				End:   Position{Line: 4, Character: 29},
			},
			NewText: "costume2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 13},
				End:   Position{Line: 2, Character: 21},
			},
			NewText: "costume2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.setCostume "costume1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	setCostume "costume1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"},{"name":"costume2"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, id.(SpxSpriteCostumeResourceID), "costume2")
		require.EqualError(t, err, `sprite costume resource "costume2" already exists`)
		require.Nil(t, changes)
	})

	t.Run("NonExistentSprite", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.setCostume "costume1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	setCostume "costume1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/NonExistentSprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, id.(SpxSpriteCostumeResourceID), "costume2")
		require.EqualError(t, err, `sprite resource "NonExistentSprite" not found`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteAnimationResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.animate "anim1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	animate "anim1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{}}}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, id.(SpxSpriteAnimationResourceID), "anim2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 4, Character: 18},
				End:   Position{Line: 4, Character: 23},
			},
			NewText: "anim2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 10},
				End:   Position{Line: 2, Character: 15},
			},
			NewText: "anim2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.animate "anim1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	animate "anim1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{},"anim2":{}}}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, id.(SpxSpriteAnimationResourceID), "anim2")
		require.EqualError(t, err, `sprite animation resource "anim2" already exists`)
		require.Nil(t, changes)
	})

	t.Run("NonExistentSprite", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite Sprite
)
MySprite.animate "anim1"
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	animate "anim1"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{}}}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/NonExistentSprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, id.(SpxSpriteAnimationResourceID), "anim2")
		require.EqualError(t, err, `sprite resource "NonExistentSprite" not found`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameWidgetResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	getWidget Monitor, "widget1"
}
`),
			"assets/index.json": []byte(`{"zorder":[{"name":"widget1"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/widgets/widget1"))
		require.NoError(t, err)

		changes, err := s.spxRenameWidgetResource(result, id.(SpxWidgetResourceID), "widget2")
		require.NoError(t, err)
		require.Len(t, changes, 1)

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 21},
				End:   Position{Line: 2, Character: 28},
			},
			NewText: "widget2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	getWidget Monitor, "widget1"
}
`),
			"assets/index.json": []byte(`{"zorder":[{"name":"widget1"},{"name":"widget2"}]}`),
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		id, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/widgets/widget1"))
		require.NoError(t, err)

		changes, err := s.spxRenameWidgetResource(result, id.(SpxWidgetResourceID), "widget2")
		require.EqualError(t, err, `widget resource "widget2" already exists`)
		require.Nil(t, changes)
	})
}
