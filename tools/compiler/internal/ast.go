package internal

import (
	"fmt"
	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
)

func GetSPXFunctionsDecl(fileName, fileCode string) {
	err := spxCodeTree(fileName, fileCode)
	if err != nil {
		fmt.Println("111111")
		fmt.Println(err)
		return
	}
}

func spxCodeTree(fileName, fileCode string) error {
	//new file set
	fset := token.NewFileSet()

	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return err
	}

	err = ast.Print(fset, file)
	if err != nil {
		return err
	}
	//
	//ast.Inspect(file, func(node ast.Node) bool {
	//
	//	return true
	//})

	return nil
}
