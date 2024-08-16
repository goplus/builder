package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"reflect"

	"github.com/goplus/gop/ast"
	"github.com/goplus/gop/token"
)

func GetSPXFunctionsDecl(fileName, fileCode string) []*fun {
	fList, err := spxCodeFuncList(fileName, fileCode)
	if err != nil {
		return nil
	}
	return fList
}

type fun struct {
	Name      string         `json:"name"`
	Posn      token.Position `json:"posn"`
	Pos       int            `json:"pos"`
	Signature string         `json:"signature"`
}

func (f *fun) Pos2Posn(fset *token.FileSet) {
	f.Posn = fset.Position(token.Pos(f.Pos))
}

func createFunStruct(value reflect.Value) *fun {
	f := &fun{}
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

// jsonPrinter is a structure for printing values as JSON
type jsonPrinter struct {
	buffer     *bytes.Buffer
	fset       *token.FileSet
	filter     ast.FieldFilter
	ptrmap     map[interface{}]int
	line       int
	spxfunlist []*fun
}

func (jp *jsonPrinter) printValue(x reflect.Value) {
	if !ast.NotNilFilter("", x) {
		jp.buffer.WriteString("null")
		return
	}

	switch x.Kind() {
	case reflect.Interface:
		jp.printValue(x.Elem())

	case reflect.Map:
		jp.buffer.WriteString("{")
		keys := x.MapKeys()
		for i, key := range keys {

			if i > 0 {
				jp.buffer.WriteString(", ")
			}
			jp.printValue(key)
			jp.buffer.WriteString(": ")
			jp.printValue(x.MapIndex(key))
		}
		jp.buffer.WriteString("}")

	case reflect.Ptr:
		ptr := x.Interface()

		if line, exists := jp.ptrmap[ptr]; exists {
			jp.buffer.WriteString(fmt.Sprintf("\"@%d\"", line))
		} else {
			jp.ptrmap[ptr] = jp.line
			jp.printValue(x.Elem())
		}

	case reflect.Array, reflect.Slice:
		jp.buffer.WriteString("[")

		for i := 0; i < x.Len(); i++ {
			if i > 0 {
				jp.buffer.WriteString(", ")
			}

			jp.printValue(x.Index(i))
		}
		jp.buffer.WriteString("]")

	case reflect.Struct:
		jp.buffer.WriteString("{")
		t := x.Type()

		for i := 0; i < t.NumField(); i++ {
			if i > 0 {
				jp.buffer.WriteString(", ")
			}
			name := t.Field(i).Name
			if token.IsExported(name) {
				value := x.Field(i)
				if jp.filter == nil || jp.filter(name, value) {
					jp.buffer.WriteString(fmt.Sprintf("\"%s\": ", name))
					if name == "Fun" {
						jp.spxfunlist = append(jp.spxfunlist, createFunStruct(value))
					}
					jp.printValue(value)
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

// JSONPrint generates the JSON representation of x and writes it to w.
func JSONPrint(w io.Writer, fset *token.FileSet, x interface{}, f ast.FieldFilter) error {
	jp := jsonPrinter{
		buffer: new(bytes.Buffer),
		fset:   fset,
		filter: f,
		ptrmap: make(map[interface{}]int),
	}

	if x == nil {
		jp.buffer.WriteString("null")
	} else {
		jp.printValue(reflect.ValueOf(x))
	}

	_, err := w.Write(jp.buffer.Bytes())
	return err
}

// JSONPrintToStdout prints the JSON representation of x to standard output.
func JSONPrintToStdout(fset *token.FileSet, x interface{}) error {
	return JSONPrint(os.Stdout, fset, x, ast.NotNilFilter)
}

func GetCodeSPXFuncList(fset *token.FileSet, x interface{}) []*fun {
	jp := jsonPrinter{
		buffer: new(bytes.Buffer),
		fset:   fset,
		filter: ast.NotNilFilter,
		ptrmap: make(map[interface{}]int),
	}

	if x == nil {
		jp.buffer.WriteString("null")
	} else {
		jp.printValue(reflect.ValueOf(x))
	}

	for _, f := range jp.spxfunlist {
		f.Pos2Posn(jp.fset)
	}

	return jp.spxfunlist
}

func spxCodeFuncList(fileName, fileCode string) ([]*fun, error) {
	//new file set
	fset := token.NewFileSet()

	file, err := initParser(fset, fileName, fileCode)
	if err != nil {
		return nil, err
	}

	fList := GetCodeSPXFuncList(fset, file)

	return fList, nil
}
