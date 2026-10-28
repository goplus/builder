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
			"encoding":      "encoding",
			"encoding/json": "json",
			"errors":        "errors",
			"fmt":           "fmt",
			"github.com/goplus/builder/tools/xgoexec": "xgoexec",
			"github.com/visualfc/gid":                 "gid",
			"math":                                    "math",
			"reflect":                                 "reflect",
			"runtime":                                 "runtime",
			"strings":                                 "strings",
			"sync":                                    "sync",
			"sync/atomic":                             "atomic",
			"time":                                    "time",
		},
		Interfaces: map[string]reflect.Type{
			"CourseProto": reflect.TypeOf((*q.CourseProto)(nil)).Elem(),
			"RunGroup":    reflect.TypeOf((*q.RunGroup)(nil)).Elem(),
		},
		NamedTypes: map[string]reflect.Type{
			"CodeEditor":       reflect.TypeOf((*q.CodeEditor)(nil)).Elem(),
			"Copilot":          reflect.TypeOf((*q.Copilot)(nil)).Elem(),
			"CopilotRound":     reflect.TypeOf((*q.CopilotRound)(nil)).Elem(),
			"Course":           reflect.TypeOf((*q.Course)(nil)).Elem(),
			"Editor":           reflect.TypeOf((*q.Editor)(nil)).Elem(),
			"Project":          reflect.TypeOf((*q.Project)(nil)).Elem(),
			"Ruler":            reflect.TypeOf((*q.Ruler)(nil)).Elem(),
			"RunPolicy":        reflect.TypeOf((*q.RunPolicy)(nil)).Elem(),
			"Runtime":          reflect.TypeOf((*q.Runtime)(nil)).Elem(),
			"Spotlight":        reflect.TypeOf((*q.Spotlight)(nil)).Elem(),
			"SpotlightOptions": reflect.TypeOf((*q.SpotlightOptions)(nil)).Elem(),
		},
		AliasTypes: map[string]reflect.Type{},
		Vars:       map[string]reflect.Value{},
		Funcs: map[string]reflect.Value{
			"XGot_Course_Main": reflect.ValueOf(q.XGot_Course_Main),
		},
		TypedConsts: map[string]ixgo.TypedConst{
			"CancelPreviousPolicy": {Typ: reflect.TypeOf(q.CancelPreviousPolicy), Value: constant.MakeInt64(int64(q.CancelPreviousPolicy))},
			"QueuePolicy":          {Typ: reflect.TypeOf(q.QueuePolicy), Value: constant.MakeInt64(int64(q.QueuePolicy))},
			"SkipPolicy":           {Typ: reflect.TypeOf(q.SkipPolicy), Value: constant.MakeInt64(int64(q.SkipPolicy))},
		},
		UntypedConsts: map[string]ixgo.UntypedConst{
			"XGoPackage": {Typ: "untyped bool", Value: constant.MakeBool(bool(q.XGoPackage))},
		},
	})
}
