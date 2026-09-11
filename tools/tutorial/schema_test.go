package tutorial

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestDeriveSchemaDescribesTheStruct(t *testing.T) {
	type detail struct {
		Reason string
	}
	type answer struct {
		Praise string   `json:"praise"`
		Score  int      `json:"score"`
		Passed bool     `json:"passed"`
		Ratio  float64  `json:"ratio"`
		Tags   []string `json:"tags"`
		Detail detail   `json:"detail"`
		Secret string   `json:"-"`
		hidden string
	}

	schema, err := deriveSchema(&answer{})
	if err != nil {
		t.Fatalf("deriveSchema: %v", err)
	}
	encoded, err := json.Marshal(schema)
	if err != nil {
		t.Fatalf("marshal schema: %v", err)
	}

	want := `{"properties":{"detail":{"properties":{"Reason":{"type":"string"}},"required":["Reason"],"type":"object"},` +
		`"passed":{"type":"boolean"},"praise":{"type":"string"},"ratio":{"type":"number"},"score":{"type":"integer"},` +
		`"tags":{"items":{"type":"string"},"type":"array"}},` +
		`"required":["praise","score","passed","ratio","tags","detail"],"type":"object"}`
	if got := string(encoded); got != want {
		t.Errorf("schema =\n%s\nwant\n%s", got, want)
	}
}

func TestDeriveSchemaRejectsUnusableResults(t *testing.T) {
	type answer struct {
		Praise string
	}
	type lowercase struct {
		praise string
	}

	// 自引用与互相引用：JSON Schema 要靠 $ref 才能表达递归，我们不生成 $ref，
	// 所以必须报错。不拦的话是无限递归——在 WASM 里就是解释器爆栈。
	type node struct {
		Label string
		Next  *node
	}
	type tree struct {
		Children []tree
	}

	// 无标签的匿名嵌入：encoding/json 会把内层字段提升到外层，与嵌套 schema
	// 背离（宿主按嵌套键生成，回填走提升规则读不到）——必须显式拒绝。
	type common struct {
		Comment string
	}
	type embedded struct {
		common
		Score int
	}
	for _, test := range []struct {
		name   string
		result any
		want   string
	}{
		{name: "nil", result: nil, want: "non-nil pointer"},
		{name: "value", result: answer{}, want: "must be a pointer"},
		{name: "nil pointer", result: (*answer)(nil), want: "must not be a nil pointer"},
		{name: "not a struct", result: new(string), want: "must point to a struct"},
		// XGo authors may lowercase field names out of habit; encoding/json
		// could never fill such a struct, so it must not look like it worked.
		{name: "no exported fields", result: &lowercase{}, want: "no serializable exported fields"},
		{name: "self reference", result: &node{}, want: "refers to itself"},
		{name: "self reference through slice", result: &tree{}, want: "refers to itself"},
		{name: "mutual reference", result: &left{}, want: "refers to itself"},
		{name: "untagged embedded field", result: &embedded{}, want: "embedded fields are not supported"},
	} {
		t.Run(test.name, func(t *testing.T) {
			_, err := deriveSchema(test.result)
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), test.want) {
				t.Errorf("error = %q, want it to mention %q", err, test.want)
			}
		})
	}
}

func TestGenerateJSONFillsTheResult(t *testing.T) {
	host := newFakeHost()
	host.responses["copilot_generateJSON"] = `{"praise":"used stepTo","score":5}`

	type answer struct {
		Praise string `json:"praise"`
		Score  int    `json:"score"`
	}
	var filled answer

	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			course.Copilot.GenerateJSON("judge this", &filled)
			course.Complete()
		})
	})

	if filled.Praise != "used stepTo" || filled.Score != 5 {
		t.Errorf("result = %+v", filled)
	}
	request, ok := host.requestOf("copilot_generateJSON")
	if !ok {
		t.Fatal("copilot_generateJSON was not called")
	}
	if !strings.Contains(request, `"schema":{"properties":{"praise":{"type":"string"}`) {
		t.Errorf("request did not carry the derived schema: %s", request)
	}
}

// left 与 right 互相引用，用来验证环检测不只认直接自引用。
// 互相引用的类型必须声明在包级：Go 的局部类型声明是顺序的，彼此看不见对方。
type left struct{ Right *right }
type right struct{ Left *left }

// TestDeriveSchemaAcceptsTaggedEmbedding 验证带 json 标签的匿名字段被当作普通
// 命名字段（encoding/json 对带名字的匿名字段不做提升），schema 生成嵌套对象。
func TestDeriveSchemaAcceptsTaggedEmbedding(t *testing.T) {
	type Common struct {
		Comment string `json:"comment"`
	}
	type feedback struct {
		Common `json:"common"`
		Score  int `json:"score"`
	}

	schema, err := deriveSchema(&feedback{})
	if err != nil {
		t.Fatal(err)
	}
	properties := schema["properties"].(map[string]any)
	if _, ok := properties["common"]; !ok {
		t.Errorf("schema should nest the tagged embedded field under its json name: %v", properties)
	}

	// 与 encoding/json 的实际行为对照：嵌套键真的能回填。
	var filled feedback
	if err := json.Unmarshal([]byte(`{"common":{"comment":"nice"},"score":4}`), &filled); err != nil {
		t.Fatal(err)
	}
	if filled.Comment != "nice" || filled.Score != 4 {
		t.Errorf("filled = %+v", filled)
	}
}
