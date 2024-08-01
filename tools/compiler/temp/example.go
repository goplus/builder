package temp

import (
	"fmt"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
)

func main() {
	// src
	src := `package main
    import "fmt"
    func main() {
        fmt.Println("Hello, World!")
    }`

	// create file set
	fset := token.NewFileSet()

	// parse file
	node, err := parser.ParseFile(fset, "", src, parser.AllErrors)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	// ast node
	printAstNode(node, fset)
}

func printAstNode(node interface{}, fset *token.FileSet) {
	ast.Print(fset, node)
}
