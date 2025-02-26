package appends

import (
	_ "embed"
	"go/ast"
	"go/types"

	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/inspect"
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/internal/analysisutil"
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/internal/typeutil"
	"github.com/goplus/builder/tools/spxls/internal/ast/inspector"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
)

//go:embed doc.go
var doc string

var Analyzer = &protocol.Analyzer{
	Name:     "appends",
	Doc:      analysisutil.MustExtractDoc(doc, "appends"),
	URL:      "https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/appends",
	Requires: []*protocol.Analyzer{inspect.Analyzer},
	Run:      run,
}

func run(pass *protocol.Pass) (any, error) {
	inspect := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)

	nodeFilter := []ast.Node{
		(*ast.CallExpr)(nil),
	}
	inspect.Preorder(nodeFilter, func(n ast.Node) {
		call := n.(*ast.CallExpr)
		b, ok := typeutil.Callee(pass.TypesInfo, call).(*types.Builtin)
		if ok && b.Name() == "append" && len(call.Args) == 1 {
			pass.ReportRangef(call, "append with no values")
		}
	})

	return nil, nil
}
