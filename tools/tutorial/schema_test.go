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
		{name: "no exported fields", result: &lowercase{}, want: "no exported fields"},
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
	host := newFakeHost(t)
	host.responses["copilot_generateJSON"] = `{"praise":"used stepTo","score":5}`

	type answer struct {
		Praise string `json:"praise"`
		Score  int    `json:"score"`
	}
	var filled answer

	runCourse(t, func(course *testCourse) {
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
