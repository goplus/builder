package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"reflect"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
)

// astWalker is a structure for printing values as JSON
type astWalker struct {
	buffer       *bytes.Buffer
	fileSet      *token.FileSet
	filter       ast.FieldFilter
	ptrMap       map[interface{}]int
	line         int
	functionList []*funcItem
}

// json can make astWalker in to buffer to print.
func (jp *astWalker) json(x reflect.Value) {
	if !ast.NotNilFilter("", x) {
		jp.buffer.WriteString("null")
		return
	}

	switch x.Kind() {
	case reflect.Interface:
		jp.json(x.Elem())

	case reflect.Map:
		jp.buffer.WriteString("{")
		keys := x.MapKeys()
		for i, key := range keys {

			if i > 0 {
				jp.buffer.WriteString(", ")
			}
			jp.json(key)
			jp.buffer.WriteString(": ")
			jp.json(x.MapIndex(key))
		}
		jp.buffer.WriteString("}")

	case reflect.Ptr:
		ptr := x.Interface()

		if line, exists := jp.ptrMap[ptr]; exists {
			jp.buffer.WriteString(fmt.Sprintf("\"@%d\"", line))
		} else {
			jp.ptrMap[ptr] = jp.line
			jp.json(x.Elem())
		}

	case reflect.Array, reflect.Slice:
		jp.buffer.WriteString("[")

		for i := 0; i < x.Len(); i++ {
			if i > 0 {
				jp.buffer.WriteString(", ")
			}
			jp.json(x.Index(i))
		}
		jp.buffer.WriteString("]")

	case reflect.Struct:
		jp.buffer.WriteString("{")
		t := x.Type()

		for i := 0; i < t.NumField(); i++ {
			name := t.Field(i).Name
			if token.IsExported(name) {
				value := x.Field(i)
				if jp.filter == nil || jp.filter(name, value) {
					jp.buffer.WriteString(fmt.Sprintf("\"%s\": ", name))
					jp.json(value)
					jp.buffer.WriteString(", ")
				}
			}
		}
		jp.buffer.WriteString("}")

	default:
		v := x.Interface()
		switch v := v.(type) {
		case string:
			jp.buffer.WriteString(fmt.Sprintf("%q", v))
		default:
			jsonBytes, err := json.Marshal(v)
			if err != nil {
				jp.buffer.WriteString(fmt.Sprintf("\"%v\"", v))
			} else {
				jp.buffer.Write(jsonBytes)
			}
		}
	}
}

// jsonPrint generates the JSON representation of x and writes it to w.
func jsonPrint(fset *token.FileSet, x interface{}) error {
	w := os.Stdout

	jp := astWalker{
		buffer:  new(bytes.Buffer),
		fileSet: fset,
		filter:  ast.NotNilFilter,
		ptrMap:  make(map[interface{}]int),
	}

	if x == nil {
		jp.buffer.WriteString("null")
	} else {
		jp.json(reflect.ValueOf(x))
	}

	//fmt.Println(jp.buffer.String())
	_, err := w.Write(jp.buffer.Bytes())
	return err
}

type BasePos struct {
	StartPos      int      `json:"startPos"`
	EndPos        int      `json:"endPos"`
	StartPosition Position `json:"startPosition"`
	EndPosition   Position `json:"endPosition"`
}

type Position struct {
	Filename string `json:"filename"`
	Offset   int    `json:"offset"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
}

type funcItem struct {
	BasePos
	Name       string           `json:"name"`
	Signature  string           `json:"signature"`
	Parameters []*funcParameter `json:"parameters"`
	Overload   string           `json:"overload"`
	PkgName    string           `json:"pkgName"`
	PkgPath    string           `json:"pkgPath"`
	fnExpr     ast.Expr
	argsExpr   []ast.Expr
}

type funcList []*funcItem

func (l *funcList) Position(fset *token.FileSet) {
	for _, fun := range *l {
		fun.Pos2Position(fset)
		for _, paramItem := range fun.Parameters {
			if paramItem != nil {
				paramItem.Pos2Position(fset)
			}
		}
	}
}

type funcParameter struct {
	BasePos
	Name  string `json:"name"`
	Type  string `json:"type"`
	Value string `json:"value"`
	Unit  string `json:"unit"`
}

// Pos2Position can make Pos(int) into Position
func (f *funcItem) Pos2Position(fset *token.FileSet) {
	f.StartPosition = Position(fset.Position(token.Pos(f.StartPos)))
	f.EndPosition = Position(fset.Position(token.Pos(f.EndPos)))
}

// Pos2Position can make Pos(int) into Position
func (p *funcParameter) Pos2Position(fset *token.FileSet) {
	p.StartPosition = Position(fset.Position(token.Pos(p.StartPos)))
	p.EndPosition = Position(fset.Position(token.Pos(p.EndPos)))
}

type callExprVisitor struct {
	funcList funcList
}

func (v *callExprVisitor) Visit(node ast.Node) ast.Visitor {
	if callExpr, ok := node.(*ast.CallExpr); ok {
		fun := &funcItem{}
		fun.fnExpr = callExpr.Fun
		fun.argsExpr = callExpr.Args
		v.funcList = append(v.funcList, fun)
	}
	return v
}

func getCodeFunctionList(file *ast.File) (funcList, error) {
	fv := &callExprVisitor{}

	ast.Walk(fv, file)

	return fv.funcList, nil
}
