// Package inspect defines an Analyzer that provides an AST inspector
// (golang.org/x/tools/go/ast/inspector.Inspector) for the syntax trees
// of a package. It is only a building block for other analyzers.
//
// Example of use in another analysis:
//
//	import (
//		"github.com/goplus/builder/tools/spxls/internal/protocol"
//		"github.com/goplus/builder/tools/spxls/internal/analysis/passes/inspect"
//		"golang.org/x/tools/go/ast/inspector"
//	)
//
//	var Analyzer = &protocol.Analyzer{
//		...
//		Requires:       []*protocol.Analyzer{inspect.Analyzer},
//	}
//
//	func run(pass *protocol.Pass) (interface{}, error) {
//		inspect := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
//		inspect.Preorder(nil, func(n ast.Node) {
//			...
//		})
//		return nil, nil
//	}
package inspect

import (
	"reflect"

	"github.com/goplus/builder/tools/spxls/internal/ast/inspector"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
)

var Analyzer = &protocol.Analyzer{
	Name:             "inspect",
	Doc:              "optimize AST traversal for later passes",
	URL:              "https://pkg.go.dev/github.com/goplus/builder/internal/analysis/passes/inspect",
	Run:              run,
	RunDespiteErrors: true,
	ResultType:       reflect.TypeOf(new(inspector.Inspector)),
}

func run(pass *protocol.Pass) (any, error) {
	return inspector.New(pass.Files), nil
}
