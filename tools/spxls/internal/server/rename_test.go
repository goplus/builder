package server

import (
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerSpxRenameBackdropResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, refKey.(SpxBackdropResourceRefKey), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 13},
				End:   Position{Line: 2, Character: 22},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 14},
				End:   Position{Line: 3, Character: 23},
			},
			NewText: "backdrop2",
		})
	})

	t.Run("ConstantName", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, refKey.(SpxBackdropResourceRefKey), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 1)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 2, Character: 20},
				End:   Position{Line: 2, Character: 29},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 0)
	})

	t.Run("TypedConstantName", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
// const Backdrop1 BackdropName = "backdrop1" // TODO: See https://github.com/goplus/builder/issues/1127
onBackdrop "backdrop1", func() {}
run "assets", {Title: "My Game"}
`),
				"MySprite.spx": []byte(`
onStart => {
	onBackdrop "backdrop1", func() {}
}
`),
				"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, refKey.(SpxBackdropResourceRefKey), "backdrop2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		// TODO: See https://github.com/goplus/builder/issues/1127
		// require.Len(t, mainSpxChanges, 2)
		// assert.Contains(t, mainSpxChanges, TextEdit{
		// 	Range: Range{
		// 		Start: Position{Line: 2, Character: 33},
		// 		End:   Position{Line: 2, Character: 42},
		// 	},
		// 	NewText: "backdrop2",
		// })
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 13},
				End:   Position{Line: 3, Character: 22},
			},
			NewText: "backdrop2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 14},
				End:   Position{Line: 3, Character: 23},
			},
			NewText: "backdrop2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
onBackdrop "backdrop1", func() {}
run "assets", {Title: "My Game"}
`),
				"assets/index.json": []byte(`{"backdrops":[{"name":"backdrop1","path":"backdrop1.png"},{"name":"backdrop2","path":"backdrop2.png"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/backdrops/backdrop1"))
		require.NoError(t, err)

		changes, err := s.spxRenameBackdropResource(result, refKey.(SpxBackdropResourceRefKey), "backdrop2")
		require.EqualError(t, err, `backdrop resource "backdrop2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSoundResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sounds/Sound1/index.json": []byte(`{"path":"sound1.wav"}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sounds/Sound1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSoundResource(result, refKey.(SpxSoundResourceRefKey), "Sound2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 2},
				End:   Position{Line: 3, Character: 8},
			},
			NewText: "Sound2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 5, Character: 7},
				End:   Position{Line: 5, Character: 13},
			},
			NewText: "Sound2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 7},
				End:   Position{Line: 3, Character: 13},
			},
			NewText: "Sound2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
play "Sound1"
run "assets", {Title: "My Game"}
`),
				"assets/sounds/Sound1/index.json": []byte(`{"path":"sound1.wav"}`),
				"assets/sounds/Sound2/index.json": []byte(`{"path":"sound2.wav"}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sounds/Sound1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSoundResource(result, refKey.(SpxSoundResourceRefKey), "Sound2")
		require.EqualError(t, err, `sound resource "Sound2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/Sprite1/index.json": []byte(`{}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, refKey.(SpxSpriteResourceRefKey), "Sprite2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 2)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 2},
				End:   Position{Line: 3, Character: 9},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 8},
			},
			NewText: "Sprite2",
		})

		sprite1SpxChanges := changes[s.toDocumentURI("Sprite1.spx")]
		require.Len(t, sprite1SpxChanges, 1)
		assert.Contains(t, sprite1SpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 2},
				End:   Position{Line: 3, Character: 9},
			},
			NewText: "Sprite2",
		})
	})

	t.Run("SpriteType", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/Sprite1/index.json": []byte(`{}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, refKey.(SpxSpriteResourceRefKey), "Sprite2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 3)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 2},
				End:   Position{Line: 3, Character: 9},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 10},
				End:   Position{Line: 3, Character: 17},
			},
			NewText: "Sprite2",
		})
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 5, Character: 1},
				End:   Position{Line: 5, Character: 8},
			},
			NewText: "Sprite2",
		})

		sprite1SpxChanges := changes[s.toDocumentURI("Sprite1.spx")]
		require.Len(t, sprite1SpxChanges, 1)
		assert.Contains(t, sprite1SpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 2},
				End:   Position{Line: 3, Character: 9},
			},
			NewText: "Sprite2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/Sprite1/index.json": []byte(`{}`),
				"assets/sprites/Sprite2/index.json": []byte(`{}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/Sprite1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteResource(result, refKey.(SpxSpriteResourceRefKey), "Sprite2")
		require.EqualError(t, err, `sprite resource "Sprite2" already exists`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteCostumeResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, refKey.(SpxSpriteCostumeResourceRefKey), "costume2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 5, Character: 22},
				End:   Position{Line: 5, Character: 30},
			},
			NewText: "costume2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 14},
				End:   Position{Line: 3, Character: 22},
			},
			NewText: "costume2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"},{"name":"costume2"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, refKey.(SpxSpriteCostumeResourceRefKey), "costume2")
		require.EqualError(t, err, `sprite costume resource "costume2" already exists`)
		require.Nil(t, changes)
	})

	t.Run("NonExistentSprite", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"costumes":[{"name":"costume1"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/NonExistentSprite/costumes/costume1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteCostumeResource(result, refKey.(SpxSpriteCostumeResourceRefKey), "costume2")
		require.EqualError(t, err, `failed to get sprite resource "NonExistentSprite": open assets/sprites/NonExistentSprite/index.json: file does not exist`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameSpriteAnimationResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{}}}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, refKey.(SpxSpriteAnimationResourceRefKey), "anim2")
		require.NoError(t, err)
		require.Len(t, changes, 2)

		mainSpxChanges := changes[s.toDocumentURI("main.spx")]
		require.Len(t, mainSpxChanges, 1)
		assert.Contains(t, mainSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 5, Character: 19},
				End:   Position{Line: 5, Character: 24},
			},
			NewText: "anim2",
		})

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 11},
				End:   Position{Line: 3, Character: 16},
			},
			NewText: "anim2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{},"anim2":{}}}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/MySprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, refKey.(SpxSpriteAnimationResourceRefKey), "anim2")
		require.EqualError(t, err, `sprite animation resource "anim2" already exists`)
		require.Nil(t, changes)
	})

	t.Run("NonExistentSprite", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
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
				"assets/sprites/MySprite/index.json": []byte(`{"fAnimations":{"anim1":{}}}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/sprites/NonExistentSprite/animations/anim1"))
		require.NoError(t, err)

		changes, err := s.spxRenameSpriteAnimationResource(result, refKey.(SpxSpriteAnimationResourceRefKey), "anim2")
		require.EqualError(t, err, `failed to get sprite resource "NonExistentSprite": open assets/sprites/NonExistentSprite/index.json: file does not exist`)
		require.Nil(t, changes)
	})
}

func TestServerSpxRenameWidgetResource(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
				"MySprite.spx": []byte(`
onStart => {
	getWidget Monitor, "widget1"
}
`),
				"assets/index.json": []byte(`{"zorder":[{"name":"widget1"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/widgets/widget1"))
		require.NoError(t, err)

		changes, err := s.spxRenameWidgetResource(result, refKey.(SpxWidgetResourceRefKey), "widget2")
		require.NoError(t, err)
		require.Len(t, changes, 1)

		mySpriteSpxChanges := changes[s.toDocumentURI("MySprite.spx")]
		require.Len(t, mySpriteSpxChanges, 1)
		assert.Contains(t, mySpriteSpxChanges, TextEdit{
			Range: Range{
				Start: Position{Line: 3, Character: 22},
				End:   Position{Line: 3, Character: 29},
			},
			NewText: "widget2",
		})
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
				"MySprite.spx": []byte(`
onStart => {
	getWidget Monitor, "widget1"
}
`),
				"assets/index.json": []byte(`{"zorder":[{"name":"widget1"},{"name":"widget2"}]}`),
			}
		}), nil)
		result, err := s.compile()
		require.NoError(t, err)
		require.False(t, result.hasErrorSeverityDiagnostic)

		refKey, err := ParseSpxResourceURI(SpxResourceURI("spx://resources/widgets/widget1"))
		require.NoError(t, err)

		changes, err := s.spxRenameWidgetResource(result, refKey.(SpxWidgetResourceRefKey), "widget2")
		require.EqualError(t, err, `widget resource "widget2" already exists`)
		require.Nil(t, changes)
	})
}
