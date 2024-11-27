package server

import (
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/vfs"
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
	}
}

func TestServerTextDocumentDiagnostic(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return newTestFileMap()
		}), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(*RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected *RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})

	t.Run("ParseError", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			fileMap := newTestFileMap()
			fileMap["main.spx"] = []byte(`
// Invalid syntax, missing closing parenthesis
var (
	MyAircraft MyAircraft
`)
			return fileMap
		}), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(*RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected *RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.NotEmpty(t, fullReport.Items)
		assert.Contains(t, fullReport.Items[0].Message, "expected ')'")
		assert.NotNil(t, fullReport.Items[0].Range)
		assert.Equal(t, Position{Line: 4, Character: 24}, fullReport.Items[0].Range.Start)
		assert.Equal(t, Position{Line: 4, Character: 24}, fullReport.Items[0].Range.End)
	})

	t.Run("NonSpxFile", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			fileMap := newTestFileMap()
			fileMap["main.gop"] = []byte(`echo "Hello, Go+!"`)
			return fileMap
		}), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///main.gop"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(*RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected *RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})

	t.Run("FileNotFound", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return newTestFileMap()
		}), nil)
		params := &DocumentDiagnosticParams{
			TextDocument: TextDocumentIdentifier{URI: "file:///notexist.spx"},
		}

		report, err := s.textDocumentDiagnostic(params)
		require.NoError(t, err)
		require.NotNil(t, report)

		fullReport, ok := report.Value.(*RelatedFullDocumentDiagnosticReport)
		assert.True(t, ok, "expected *RelatedFullDocumentDiagnosticReport")
		assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
		assert.Empty(t, fullReport.Items)
	})
}

func TestServerWorkspaceDiagnostic(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return newTestFileMap()
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 3)

		foundFiles := make(map[string]bool)
		for _, item := range report.Items {
			fullReport := item.Value.(*WorkspaceFullDocumentDiagnosticReport)
			foundFiles[string(fullReport.URI)] = true
			assert.Equal(t, string(DiagnosticFull), fullReport.Kind)
			assert.Empty(t, fullReport.Items)
		}
		assert.Contains(t, foundFiles, "main.spx")
		assert.Contains(t, foundFiles, "MyAircraft.spx")
		assert.Contains(t, foundFiles, "Bullet.spx")
	})

	t.Run("ParseError", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{
				"main.spx": []byte(`
// Invalid syntax, missing closing parenthesis
var (
	MyAircraft MyAircraft
`),
				"MyAircraft.spx": []byte(`var x int`),
			}
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.NoError(t, err)
		require.NotNil(t, report)
		assert.Len(t, report.Items, 2)

		for _, item := range report.Items {
			fullReport := item.Value.(*WorkspaceFullDocumentDiagnosticReport)
			if fullReport.URI == "file:///main.spx" {
				assert.NotEmpty(t, fullReport.Items)
				assert.Contains(t, fullReport.Items[0].Message, "expected ')'")
			} else {
				assert.Empty(t, fullReport.Items)
			}
		}
	})

	t.Run("EmptyWorkspace", func(t *testing.T) {
		s := New(vfs.NewMapFS(func() map[string][]byte {
			return map[string][]byte{}
		}), nil)

		report, err := s.workspaceDiagnostic(&WorkspaceDiagnosticParams{})
		require.EqualError(t, err, "no valid spx files found in main package")
		require.Nil(t, report)
	})
}
