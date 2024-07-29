package temp

import (
	"fmt"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/parser"
	"github.com/goplus/gop/token"
)

func main() {
	// 源代码
	src := `package main
    import "fmt"
    func main() {
        fmt.Println("Hello, World!")
    }`

	// 创建文件集
	fset := token.NewFileSet()

	// 解析源代码
	node, err := parser.ParseFile(fset, "", src, parser.AllErrors)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	// `node` 是一个 GoPlus AST 节点，表示整个源文件
	printAstNode(node, fset)
}

func printAstNode(node interface{}, fset *token.FileSet) {
	ast.Print(fset, node)
}
