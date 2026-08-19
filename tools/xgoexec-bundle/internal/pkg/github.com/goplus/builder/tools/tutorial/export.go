// export by github.com/goplus/ixgo/cmd/qexp

package tutorial

import (
	q "github.com/goplus/builder/tools/tutorial"

	"github.com/goplus/ixgo"
	"go/constant"
	"reflect"
)

func init() {
	ixgo.RegisterPackage(&ixgo.Package{
		Name: "tutorial",
		Path: "github.com/goplus/builder/tools/tutorial",
		Deps: map[string]string{
			"encoding/json": "json",
			"fmt":           "fmt",
			"github.com/goplus/builder/tools/xgoexec": "xgoexec",
			"reflect": "reflect",
			"strings": "strings",
			"sync":    "sync",
		},
		Interfaces: map[string]reflect.Type{
			"CourseProto": reflect.TypeOf((*q.CourseProto)(nil)).Elem(),
		},
		NamedTypes: map[string]reflect.Type{
			"CodeEditor":       reflect.TypeOf((*q.CodeEditor)(nil)).Elem(),
			"Copilot":          reflect.TypeOf((*q.Copilot)(nil)).Elem(),
			"CopilotRound":     reflect.TypeOf((*q.CopilotRound)(nil)).Elem(),
			"Course":           reflect.TypeOf((*q.Course)(nil)).Elem(),
			"Editor":           reflect.TypeOf((*q.Editor)(nil)).Elem(),
			"Project":          reflect.TypeOf((*q.Project)(nil)).Elem(),
			"Ruler":            reflect.TypeOf((*q.Ruler)(nil)).Elem(),
			"Runtime":          reflect.TypeOf((*q.Runtime)(nil)).Elem(),
			"Spotlight":        reflect.TypeOf((*q.Spotlight)(nil)).Elem(),
			"SpotlightOptions": reflect.TypeOf((*q.SpotlightOptions)(nil)).Elem(),
		},
		AliasTypes: map[string]reflect.Type{},
		Vars:       map[string]reflect.Value{},
		Funcs: map[string]reflect.Value{
			"Gopt_Course_Main": reflect.ValueOf(q.Gopt_Course_Main),
		},
		TypedConsts: map[string]ixgo.TypedConst{},
		UntypedConsts: map[string]ixgo.UntypedConst{
			"XGoPackage": {Typ: "untyped bool", Value: constant.MakeBool(bool(q.XGoPackage))},
		},
	})
}
