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
	buffer          *bytes.Buffer
	fileSet         *token.FileSet
	filter          ast.FieldFilter
	ptrMap          map[interface{}]int
	line            int
	spxFunctionList []*codeFunction
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

// WalkAST is a function to get info from code.
func (jp *astWalker) WalkAST(x reflect.Value) {
	if !ast.NotNilFilter("", x) {
		return
	}

	switch x.Kind() {
	case reflect.Interface:
		jp.WalkAST(x.Elem())

	case reflect.Map:
		keys := x.MapKeys()
		for _, key := range keys {
			jp.WalkAST(key)
			jp.WalkAST(x.MapIndex(key))
		}

	case reflect.Ptr:
		ptr := x.Interface()
		if _, exists := jp.ptrMap[ptr]; exists {
		} else {
			jp.ptrMap[ptr] = jp.line
			jp.WalkAST(x.Elem())
		}

	case reflect.Array, reflect.Slice:
		for i := 0; i < x.Len(); i++ {
			jp.WalkAST(x.Index(i))
		}

	case reflect.Struct:
		t := x.Type()
		for i := 0; i < t.NumField(); i++ {
			name := t.Field(i).Name
			if token.IsExported(name) {
				value := x.Field(i)
				if jp.filter == nil || jp.filter(name, value) {
					if name == "Fun" {
						jp.spxFunctionList = append(jp.spxFunctionList, createFunStruct(value))
					}
					jp.WalkAST(value)
				}
			}
		}

	default:
		_ = x.Interface()

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

	fmt.Println(jp.buffer.String())
	_, err := w.Write(jp.buffer.Bytes())
	return err
}

// codeFunction is spx function called in code.
type codeFunction struct {
	Name       string         `json:"name"`
	Position   token.Position `json:"posn"`
	Pos        int            `json:"pos"`
	Signature  string         `json:"signature"`
	Parameters []parameter    `json:"parameters"`
}

type parameter struct {
	Name     string   `json:"name"`
	Type     string   `json:"type"`
	Position position `json:"position"`
	Unit     string   `json:"unit"`
}

// Pos2Position can make Pos(int) into Position
func (f *codeFunction) Pos2Position(fset *token.FileSet) {
	f.Position = fset.Position(token.Pos(f.Pos))
}

// createFunStruct is able to make a code function struct.
func createFunStruct(value reflect.Value) *codeFunction {
	f := &codeFunction{}
	for j := 0; j < value.Elem().Elem().Type().NumField(); j++ {
		name := value.Elem().Elem().Type().Field(j).Name
		if token.IsExported(name) {
			value := value.Elem().Elem().Field(j)
			if name == "NamePos" {
				f.Pos = int(value.Int())
			}
			if name == "Name" {
				f.Name = value.String()
			}
		}
	}
	return f
}

func getCodeFunctionList(fset *token.FileSet, fileName, fileCode string) ([]*codeFunction, error) {
	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}
	//
	//err = jsonPrint(fset, file)
	//if err != nil {
	//	fmt.Println(err)
	//	return nil, err
	//}

	jp := astWalker{
		buffer:  new(bytes.Buffer),
		fileSet: fset,
		filter:  ast.NotNilFilter,
		ptrMap:  make(map[interface{}]int),
	}

	if file == nil {
		jp.buffer.WriteString("null")
	} else {
		jp.WalkAST(reflect.ValueOf(file))
	}

	for _, f := range jp.spxFunctionList {
		f.Pos2Position(jp.fileSet)
	}

	return jp.spxFunctionList, nil

}
