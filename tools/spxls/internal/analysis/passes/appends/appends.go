package appends

import (
	_ "embed"

	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/inspect"
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/internal/analysisutil"
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/internal/typeutil"
	"github.com/goplus/builder/tools/spxls/internal/ast/inspector"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
	"github.com/goplus/gogen"
	"github.com/goplus/gop/ast"
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
		// ast.Print(pass.Fset, call)
		// fmt.Printf("%T\n", typeutil.Callee(pass.TypesInfo, call))
		b, ok := typeutil.Callee(pass.TypesInfo, call).(*gogen.TemplateFunc)
		// fmt.Println(ok, b.Name())
		if ok && b.Name() == "append" && len(call.Args) == 1 {
			pass.ReportRangef(call, "append with no values")
		}
	})

	return nil, nil
}
