package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestFileMap() map[string][]byte {
	return map[string][]byte{
		"main.spx": []byte(`
var (
	MyAircraft MyAircraft
	Bullet     Bullet
)
run "assets", {Title: "Bullet (by Go+)"}
`),
		"MyAircraft.spx": []byte(`
onStart => {
	for {
		wait 0.1
		Bullet.clone
		play "biu"
		setXYpos mouseX, mouseY
	}
}
`),
		"Bullet.spx": []byte(`
onCloned => {
	setXYpos MyAircraft.xpos, MyAircraft.ypos+5
	show
	for {
		wait 0.04
		step 10
		if touching(Edge) {
			destroy
		}
	}
}
`),
		"assets/index.json":                    []byte(`{"backdrops":[{"x":0,"y":0,"faceRight":0,"bitmapResolution":2,"name":"backdrop1","path":"backdrop1.png"}],"backdropIndex":0,"map":{"width":480,"height":360,"mode":"fillRatio"},"run":{"width":480,"height":360},"zorder":["MyAircraft","Bullet"]}`),
		"assets/backdrop1.png":                 nil,
		"assets/sprites/MyAircraft/index.json": []byte(`{"heading":90,"x":-14.502367071209733,"y":-151.76923076923077,"size":0.45,"rotationStyle":"normal","costumeIndex":0,"visible":true,"isDraggable":false,"pivot":{"x":0,"y":0},"costumes":[{"x":98,"y":122,"faceRight":0,"bitmapResolution":2,"name":"hero","path":"hero.png"}],"fAnimations":{},"animBindings":{}}`),
		"assets/sprites/MyAircraft/hero.png":   nil,
		"assets/sprites/Bullet/index.json":     []byte(`{"heading":0,"x":230,"y":185,"size":0.65,"rotationStyle":"normal","costumeIndex":0,"visible":false,"isDraggable":false,"pivot":{"x":0,"y":0},"costumes":[{"x":8,"y":20,"faceRight":90,"bitmapResolution":2,"name":"bullet","path":"bullet.png"}],"fAnimations":{},"animBindings":{}}`),
		"assets/sprites/Bullet/bullet.png":     nil,
		"assets/sounds/biu/index.json":         []byte(`{"rate":0,"sampleCount":0,"path":"biu.wav"}`),
		"assets/sounds/biu/biu.wav":            nil,
	}
}

func TestServerTextDocumentDiagnostic(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(newTestFileMap()), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})

	t.Run("ParseError", func(t *testing.T) {
		fileMap := newTestFileMap()
		fileMap["main.spx"] = []byte(`
// Invalid syntax, missing closing parenthesis
var (
	MyAircraft MyAircraft
`)
		s := New(newMapFSWithoutModTime(fileMap), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		require.Len(t, fullReport.Items, 2)
		assert.Contains(t, fullReport.Items, Diagnostic{
			Severity: SeverityError,
			Message:  "expected ')', found 'EOF'",
			Range: Range{
				Start: Position{Line: 3, Character: 23},
				End:   Position{Line: 3, Character: 23},
			},
		})
		assert.Contains(t, fullReport.Items, Diagnostic{
			Severity: SeverityError,
			Message:  "expected ';', found 'EOF'",
			Range: Range{
				Start: Position{Line: 3, Character: 23},
				End:   Position{Line: 3, Character: 23},
			},
		})
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		fileMap := newTestFileMap()
		fileMap["main.gop"] = []byte(`echo "Hello, Go+!"`)
		s := New(newMapFSWithoutModTime(fileMap), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})

	t.Run("NonMainPackageDecl", func(t *testing.T) {
		fileMap := newTestFileMap()
		fileMap["main.spx"] = []byte("package nonmain")
		s := New(newMapFSWithoutModTime(fileMap), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		require.Len(t, fullReport.Items, 1)
		assert.Contains(t, fullReport.Items, Diagnostic{
			Severity: SeverityError,
			Message:  "package name must be main",
			Range: Range{
				Start: Position{Line: 0, Character: 8},
				End:   Position{Line: 0, Character: 15},
			},
		})
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(newTestFileMap()), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})
}

func TestServerWorkspaceDiagnostic(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(newTestFileMap()), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 3)
		foundFiles := make(map[string]struct{})
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			relPath, err := s.fromDocumentURI(fullReport.URI)
			require.NoError(t, err)
			foundFiles[relPath] = struct{}{}
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			assert.Empty(t, fullReport.Items)
		}
		assert.Contains(t, foundFiles, "main.spx")
		assert.Contains(t, foundFiles, "MyAircraft.spx")
		assert.Contains(t, foundFiles, "Bullet.spx")
	})

	t.Run("ParseError", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
// Invalid syntax, missing closing parenthesis
var (
	MyAircraft MyAircraft
`),
			"MyAircraft.spx":    []byte(`var x int`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			if fullReport.URI == "file:///main.spx" {
				require.Len(t, fullReport.Items, 2)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "expected ')', found 'EOF'",
					Range: Range{
						Start: Position{Line: 3, Character: 23},
						End:   Position{Line: 3, Character: 23},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "expected ';', found 'EOF'",
					Range: Range{
						Start: Position{Line: 3, Character: 23},
						End:   Position{Line: 3, Character: 23},
					},
				})
			} else {
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("EmptyWorkspace", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.EqualError(t, err, "no valid main.spx file found in main package")
		require.Nil(t, report)
	})

	t.Run("SoundResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	Sound1 Sound
)
play Sound1
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
const ConstSoundName = "ConstSoundName"
var (
	VarSoundName string
	Sound2       Sound
)
VarSoundName = "VarSoundName"
onStart => {
	play ""
	play ConstSoundName
	play "LiteralSoundName"
	play VarSoundName
	play Sound1
	play Sound2
}
`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///MySprite.spx":
				require.Len(t, fullReport.Items, 3)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "sound resource name cannot be empty",
					Range: Range{
						Start: Position{Line: 8, Character: 6},
						End:   Position{Line: 8, Character: 8},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sound resource "ConstSoundName" not found`,
					Range: Range{
						Start: Position{Line: 9, Character: 6},
						End:   Position{Line: 9, Character: 20},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sound resource "LiteralSoundName" not found`,
					Range: Range{
						Start: Position{Line: 10, Character: 6},
						End:   Position{Line: 10, Character: 24},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("BackdropResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onBackdrop "", func() {}
onBackdrop "NonExistentBackdrop", func() {}
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
const ConstBackdropName = "ConstBackdropName"
var VarBackdropName string
VarBackdropName = "VarBackdropName"
onStart => {
	onBackdrop ConstBackdropName, func() {}
	onBackdrop "LiteralBackdropName", func() {}
	onBackdrop VarBackdropName, func() {}
}
`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///main.spx":
				require.Len(t, fullReport.Items, 2)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "backdrop resource name cannot be empty",
					Range: Range{
						Start: Position{Line: 1, Character: 11},
						End:   Position{Line: 1, Character: 13},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `backdrop resource "NonExistentBackdrop" not found`,
					Range: Range{
						Start: Position{Line: 2, Character: 11},
						End:   Position{Line: 2, Character: 32},
					},
				})
			case "file:///MySprite.spx":
				require.Len(t, fullReport.Items, 2)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `backdrop resource "ConstBackdropName" not found`,
					Range: Range{
						Start: Position{Line: 5, Character: 12},
						End:   Position{Line: 5, Character: 29},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `backdrop resource "LiteralBackdropName" not found`,
					Range: Range{
						Start: Position{Line: 6, Character: 12},
						End:   Position{Line: 6, Character: 33},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("SpriteResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
var (
	MySprite1 Sprite
	MySprite2 MySprite2
)
run "assets", {Title: "My Game"}
`),
			"MySprite1.spx": []byte(`
var MySprite3 Sprite
onStart => {
	animate "roll-in"
	MySprite2.animate "roll-out"
}
`),
			"MySprite2.spx": []byte(`
onStart => {
	MySprite1.animate "roll-out"
	animate "roll-in"
	MySprite2.animate "roll-out"
}
`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 3)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///MySprite1.spx":
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sprite resource "MySprite1" not found`,
					Range: Range{
						Start: Position{Line: 3, Character: 1},
						End:   Position{Line: 3, Character: 18},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sprite resource "MySprite2" not found`,
					Range: Range{
						Start: Position{Line: 4, Character: 1},
						End:   Position{Line: 4, Character: 10},
					},
				})
			case "file:///MySprite2.spx":
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sprite resource "MySprite2" not found`,
					Range: Range{
						Start: Position{Line: 3, Character: 1},
						End:   Position{Line: 3, Character: 18},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `sprite resource "MySprite2" not found`,
					Range: Range{
						Start: Position{Line: 4, Character: 1},
						End:   Position{Line: 4, Character: 10},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("SpriteCostumeResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	setCostume ""
	setCostume "NonExistentCostume"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///MySprite.spx":
				require.Len(t, fullReport.Items, 2)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "sprite costume resource name cannot be empty",
					Range: Range{
						Start: Position{Line: 2, Character: 12},
						End:   Position{Line: 2, Character: 14},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `costume resource "NonExistentCostume" not found in sprite "MySprite"`,
					Range: Range{
						Start: Position{Line: 3, Character: 12},
						End:   Position{Line: 3, Character: 32},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("SpriteAnimationResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
onStart => {
	animate ""
	animate "roll-in"
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///MySprite.spx":
				require.Len(t, fullReport.Items, 2)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "sprite animation resource name cannot be empty",
					Range: Range{
						Start: Position{Line: 2, Character: 9},
						End:   Position{Line: 2, Character: 11},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `animation resource "roll-in" not found in sprite "MySprite"`,
					Range: Range{
						Start: Position{Line: 3, Character: 9},
						End:   Position{Line: 3, Character: 18},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("WidgetResourceNotFound", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
const ConstWidgetName = "ConstWidgetName"
var VarWidgetName string
VarWidgetName = "VarWidgetName"
onStart => {
	getWidget Monitor, ""
	getWidget Monitor, ConstWidgetName
	getWidget Monitor, "LiteralWidgetName"
	getWidget Monitor, VarWidgetName
}
`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			switch fullReport.URI {
			case "file:///MySprite.spx":
				require.Len(t, fullReport.Items, 3)
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  "widget resource name cannot be empty",
					Range: Range{
						Start: Position{Line: 5, Character: 20},
						End:   Position{Line: 5, Character: 22},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `widget resource "ConstWidgetName" not found`,
					Range: Range{
						Start: Position{Line: 6, Character: 20},
						End:   Position{Line: 6, Character: 35},
					},
				})
				assert.Contains(t, fullReport.Items, Diagnostic{
					Severity: SeverityError,
					Message:  `widget resource "LiteralWidgetName" not found`,
					Range: Range{
						Start: Position{Line: 7, Character: 20},
						End:   Position{Line: 7, Character: 39},
					},
				})
			default:
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("WithNonBasicTypeAliases", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
run "assets", {Title: "My Game"}
`),
			"MySprite.spx": []byte(`
import "image/color"

onStart => {
	touchingColor color.RGBA{0, 0, 0, 0}
}
`),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			assert.Empty(t, fullReport.Items)
		}
	})

	t.Run("OnKey", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`
onKey KeyLeft, => {}

onKey [KeyRight, KeyUp, KeyDown], => {}

run "assets", {Title: "My Game"}
`),
			"assets/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 1)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			assert.Empty(t, fullReport.Items)
		}
	})

	t.Run("NoTypeSpriteVarDeclaration", func(t *testing.T) {
		s := New(newMapFSWithoutModTime(map[string][]byte{
			"main.spx": []byte(`// An spx game.

var (
	MySprite
)

run "assets", {Title: "My Game"}
`),
			"MySprite.spx":                       []byte(``),
			"assets/index.json":                  []byte(`{}`),
			"assets/sprites/MySprite/index.json": []byte(`{}`),
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)
		for _, item := range report.Items {
			fullReport := item.Value.(WorkspaceFullDocumentDiagnosticReport)
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			assert.Empty(t, fullReport.Items)
		}
	})
}
