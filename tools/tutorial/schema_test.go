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

	// Self-reference and mutual reference: expressing recursion in JSON
	// Schema needs $ref, which we do not generate, so this has to be an
	// error. Letting it through means infinite recursion, which in WASM
	// is the interpreter blowing its stack.
	type node struct {
		Label string
		Next  *node
	}
	type tree struct {
		Children []tree
	}

	// Untagged anonymous embedding: encoding/json promotes the inner
	// fields into the outer object, which contradicts a nested schema —
	// the host would generate nested keys that filling, following the
	// promotion rules, never reads. Reject it explicitly.
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

// left and right reference each other, to check that cycle detection is not
// limited to direct self-reference. Mutually referencing types have to be
// declared at package level: local type declarations in Go are sequential and
// cannot see each other.
type left struct{ Right *right }
type right struct{ Left *left }

// TestDeriveSchemaAcceptsTaggedEmbedding checks that an anonymous field with
// a json tag is treated as an ordinary named field — encoding/json does not
// promote a named anonymous field — and that the schema nests an object for
// it.
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

	// Check against what encoding/json actually does: the nested key really
	// can be filled in.
	var filled feedback
	if err := json.Unmarshal([]byte(`{"common":{"comment":"nice"},"score":4}`), &filled); err != nil {
		t.Fatal(err)
	}
	if filled.Comment != "nice" || filled.Score != 4 {
		t.Errorf("filled = %+v", filled)
	}
}
