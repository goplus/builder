package appends

import (
	"go/types"
	"testing"

	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/inspect"
	"github.com/goplus/builder/tools/spxls/internal/ast/inspector"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
	"github.com/goplus/gop/x/typesutil"
)

func TestAppends(t *testing.T) {
	tests := []struct {
		name     string
		src      string
		wantDiag bool
	}{
		{
			name: "append without values",
			src: `
var s []int
_ = append(s)
`,
			wantDiag: true,
		},
		{
			name: "append with values",
			src: `
var s []int
_ = append(s, 1)
`,
			wantDiag: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create file set and parse source
			fset := token.NewFileSet()
			f, err := parser.ParseFile(fset, "test.gop", tt.src, parser.ParseComments)
			if err != nil {
				t.Fatal(err)
			}

			info := &typesutil.Info{
				Types: make(map[ast.Expr]types.TypeAndValue),
				Defs:  make(map[*ast.Ident]types.Object),
				Uses:  make(map[*ast.Ident]types.Object),
			}

			checker := typesutil.NewChecker(
				&types.Config{},
				&typesutil.Config{
					Fset:  fset,
					Types: types.NewPackage("test", "test"),
				},
				nil,
				info,
			)

			if err := checker.Files(nil, []*ast.File{f}); err != nil {
				t.Log("type checking error:", err)
			}

			var diagnostics []protocol.Diagnostic
			// Create pass
			pass := &protocol.Pass{
				Fset:      fset,
				Files:     []*ast.File{f},
				TypesInfo: info,
				Report: func(d protocol.Diagnostic) {
					diagnostics = append(diagnostics, d)
				},
				ResultOf: map[*protocol.Analyzer]any{
					inspect.Analyzer: inspector.New([]*ast.File{f}),
				},
			}

			// Run analyzer
			_, err = Analyzer.Run(pass)
			if err != nil {
				t.Fatal(err)
			}

			for _, diagnostic := range diagnostics {
				t.Logf("got diagnostic: %v", diagnostic)
			}
			hasDiag := len(diagnostics) > 0
			if hasDiag != tt.wantDiag {
				t.Errorf("got diagnostic = %v, want %v", hasDiag, tt.wantDiag)
			}
		})
	}
}
