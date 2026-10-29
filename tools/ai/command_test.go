package ai

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
)

type CmdWithDescMethod struct {
	Value float64 `desc:"Some value"`
}

func (c CmdWithDescMethod) Desc() string {
	return "Command with value receiver Desc"
}

type CmdWithPtrDescMethod struct {
	Flag bool
}

func (c *CmdWithPtrDescMethod) Desc() string {
	return "Command with pointer receiver Desc"
}

type commandWithLongDescription struct{}

func (*commandWithLongDescription) Desc() string {
	return strings.Repeat("界", maxCommandDescriptionLength+1)
}

type commandJSONValue string

func (v *commandJSONValue) UnmarshalJSON(_ []byte) error {
	return nil
}

func TestExtractCommandSpec(t *testing.T) {
	type SimpleCmd struct {
		Param1 string `desc:"First parameter"`
		Param2 int
		hidden string
	}
	type CmdWithSlice struct {
		Items []string `desc:"List of items"`
		Nums  []int
	}
	type coordinate struct {
		X int
		Y int
	}
	type compositeCommand struct {
		Path   [2]coordinate
		Groups [][]string
	}
	arrayLength := 2

	for _, tt := range []struct {
		name     string
		typ      reflect.Type
		wantSpec CommandSpec
	}{
		{
			name: "SimpleCommand",
			typ:  reflect.TypeOf(SimpleCmd{}),
			wantSpec: CommandSpec{
				Name:        "SimpleCmd",
				Description: "Command SimpleCmd",
				Parameters: []CommandParamSpec{
					{
						Name:        "Param1",
						Description: "First parameter",
						Schema:      CommandValueSpec{Type: "string"},
					},
					{Name: "Param2", Schema: CommandValueSpec{Type: "integer"}},
				},
			},
		},
		{
			name: "CommandWithValueDescMethod",
			typ:  reflect.TypeOf(CmdWithDescMethod{}),
			wantSpec: CommandSpec{
				Name:        "CmdWithDescMethod",
				Description: "Command with value receiver Desc",
				Parameters: []CommandParamSpec{
					{
						Name:        "Value",
						Description: "Some value",
						Schema:      CommandValueSpec{Type: "number"},
					},
				},
			},
		},
		{
			name: "CommandWithPtrDescMethod",
			typ:  reflect.TypeOf(CmdWithPtrDescMethod{}),
			wantSpec: CommandSpec{
				Name:        "CmdWithPtrDescMethod",
				Description: "Command with pointer receiver Desc",
				Parameters: []CommandParamSpec{
					{Name: "Flag", Schema: CommandValueSpec{Type: "boolean"}},
				},
			},
		},
		{
			name: "CommandWithSlice",
			typ:  reflect.TypeOf(CmdWithSlice{}),
			wantSpec: CommandSpec{
				Name:        "CmdWithSlice",
				Description: "Command CmdWithSlice",
				Parameters: []CommandParamSpec{
					{
						Name:        "Items",
						Description: "List of items",
						Schema: CommandValueSpec{
							Type:  "array",
							Items: &CommandValueSpec{Type: "string"},
						},
					},
					{
						Name: "Nums",
						Schema: CommandValueSpec{
							Type:  "array",
							Items: &CommandValueSpec{Type: "integer"},
						},
					},
				},
			},
		},
		{
			name: "CompositeCommand",
			typ:  reflect.TypeFor[compositeCommand](),
			wantSpec: CommandSpec{
				Name:        "compositeCommand",
				Description: "Command compositeCommand",
				Parameters: []CommandParamSpec{
					{
						Name: "Path",
						Schema: CommandValueSpec{
							Type: "array",
							Items: &CommandValueSpec{
								Type: "object",
								Properties: []CommandParamSpec{
									{Name: "X", Schema: CommandValueSpec{Type: "integer"}},
									{Name: "Y", Schema: CommandValueSpec{Type: "integer"}},
								},
							},
							MinItems: &arrayLength,
							MaxItems: &arrayLength,
						},
					},
					{
						Name: "Groups",
						Schema: CommandValueSpec{
							Type: "array",
							Items: &CommandValueSpec{
								Type:  "array",
								Items: &CommandValueSpec{Type: "string"},
							},
						},
					},
				},
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractCommandSpec(tt.typ)
			if err != nil {
				t.Fatalf("unexpected error %v", err)
			}
			if !reflect.DeepEqual(got, tt.wantSpec) {
				t.Errorf("got %#v, want %#v", got, tt.wantSpec)
			}
		})
	}

	t.Run("RejectsLongDescription", func(t *testing.T) {
		_, err := extractCommandSpec(reflect.TypeFor[commandWithLongDescription]())
		if err == nil || !strings.Contains(err.Error(), "must not exceed 1024 characters") {
			t.Errorf("got error %v, want description length error", err)
		}
	})

	t.Run("RejectsLongParameterDescription", func(t *testing.T) {
		field := reflect.StructField{
			Name: "Value",
			Type: reflect.TypeFor[string](),
			Tag:  reflect.StructTag(`desc:"` + strings.Repeat("界", maxCommandDescriptionLength+1) + `"`),
		}
		_, err := commandParameterSpec(field, make(map[reflect.Type]struct{}), 1)
		if err == nil || !strings.Contains(err.Error(), "must not exceed 1024 characters") {
			t.Errorf("got error %v, want description length error", err)
		}
	})
}

func TestCommandValueSpec(t *testing.T) {
	type namedString string
	type namedStringSlice []string
	type object struct {
		Value namedString
	}
	type recursiveSlice []recursiveSlice
	type taggedObject struct {
		Value string `json:"value"`
	}
	type embeddedObject struct {
		object
	}
	arrayLength := 3

	for _, tt := range []struct {
		name          string
		goType        reflect.Type
		want          CommandValueSpec
		wantErrSubstr string
	}{
		{name: "String", goType: reflect.TypeFor[string](), want: CommandValueSpec{Type: "string"}},
		{name: "NamedString", goType: reflect.TypeFor[namedString](), want: CommandValueSpec{Type: "string"}},
		{name: "Int", goType: reflect.TypeFor[int](), want: CommandValueSpec{Type: "integer"}},
		{name: "Uint", goType: reflect.TypeFor[uint](), want: CommandValueSpec{Type: "integer"}},
		{name: "Float64", goType: reflect.TypeFor[float64](), want: CommandValueSpec{Type: "number"}},
		{name: "Bool", goType: reflect.TypeFor[bool](), want: CommandValueSpec{Type: "boolean"}},
		{
			name:   "NamedStringSlice",
			goType: reflect.TypeFor[namedStringSlice](),
			want: CommandValueSpec{
				Type:  "array",
				Items: &CommandValueSpec{Type: "string"},
			},
		},
		{
			name:   "Array",
			goType: reflect.TypeFor[[3]int](),
			want: CommandValueSpec{
				Type:     "array",
				Items:    &CommandValueSpec{Type: "integer"},
				MinItems: &arrayLength,
				MaxItems: &arrayLength,
			},
		},
		{
			name:   "Object",
			goType: reflect.TypeFor[object](),
			want: CommandValueSpec{
				Type: "object",
				Properties: []CommandParamSpec{
					{Name: "Value", Schema: CommandValueSpec{Type: "string"}},
				},
			},
		},
		{
			name:   "NestedSlice",
			goType: reflect.TypeFor[[][]bool](),
			want: CommandValueSpec{
				Type: "array",
				Items: &CommandValueSpec{
					Type:  "array",
					Items: &CommandValueSpec{Type: "boolean"},
				},
			},
		},
		{name: "Uintptr", goType: reflect.TypeFor[uintptr](), wantErrSubstr: "unsupported type"},
		{name: "Pointer", goType: reflect.TypeFor[*string](), wantErrSubstr: "unsupported type"},
		{name: "Map", goType: reflect.TypeFor[map[string]string](), wantErrSubstr: "unsupported type"},
		{name: "Interface", goType: reflect.TypeFor[any](), wantErrSubstr: "unsupported type"},
		{name: "Cycle", goType: reflect.TypeFor[recursiveSlice](), wantErrSubstr: "cyclic type"},
		{name: "CustomJSON", goType: reflect.TypeFor[commandJSONValue](), wantErrSubstr: "custom JSON representation"},
		{name: "JSONTag", goType: reflect.TypeFor[taggedObject](), wantErrSubstr: "json tags are unsupported"},
		{name: "EmbeddedField", goType: reflect.TypeFor[embeddedObject](), wantErrSubstr: "anonymous fields"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := commandValueSpec(tt.goType, make(map[reflect.Type]struct{}), 1)
			if tt.wantErrSubstr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErrSubstr) {
					t.Errorf("got error %v, want error containing %q", err, tt.wantErrSubstr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("got %#v, want %#v", got, tt.want)
			}
		})
	}

	t.Run("RejectsExcessiveDepth", func(t *testing.T) {
		goType := reflect.TypeFor[string]()
		for range maxCommandValueSchemaDepth {
			goType = reflect.SliceOf(goType)
		}
		_, err := commandValueSpec(goType, make(map[reflect.Type]struct{}), 1)
		if err == nil || !strings.Contains(err.Error(), "schema exceeds 9 levels") {
			t.Errorf("got error %v, want schema depth error", err)
		}
	})

	t.Run("AcceptsMaximumDepth", func(t *testing.T) {
		goType := reflect.TypeFor[string]()
		for range maxCommandValueSchemaDepth - 1 {
			goType = reflect.SliceOf(goType)
		}
		if _, err := commandValueSpec(goType, make(map[reflect.Type]struct{}), 1); err != nil {
			t.Errorf("unexpected error %v", err)
		}
	})

	t.Run("RejectsTooManyProperties", func(t *testing.T) {
		fields := make([]reflect.StructField, maxCommandParameterCount+1)
		for i := range fields {
			fields[i] = reflect.StructField{
				Name: fmt.Sprintf("Field%d", i),
				Type: reflect.TypeFor[string](),
			}
		}
		_, err := commandStructParameters(reflect.StructOf(fields), make(map[reflect.Type]struct{}), 1)
		if err == nil || !strings.Contains(err.Error(), "want at most 128") {
			t.Errorf("got error %v, want property count error", err)
		}
	})
}

func TestCommandParamSpecJSON(t *testing.T) {
	for _, tt := range []struct {
		name string
		spec CommandParamSpec
		want string
	}{
		{
			name: "Scalar",
			spec: CommandParamSpec{Name: "Direction", Schema: CommandValueSpec{Type: "string"}},
			want: `{"name":"Direction","schema":{"type":"string"}}`,
		},
		{
			name: "Array",
			spec: CommandParamSpec{
				Name:        "Scores",
				Description: "Scores to use.",
				Schema: CommandValueSpec{
					Type:  "array",
					Items: &CommandValueSpec{Type: "integer"},
				},
			},
			want: `{"name":"Scores","description":"Scores to use.","schema":{"type":"array","items":{"type":"integer"}}}`,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.spec)
			if err != nil {
				t.Fatalf("unexpected error %v", err)
			}
			if string(got) != tt.want {
				t.Errorf("got %s, want %s", got, tt.want)
			}
		})
	}
}

func TestCallCommandHandler(t *testing.T) {
	newCommandInfo := func(typ reflect.Type, handler any) commandInfo {
		t.Helper()
		spec, err := extractCommandSpec(typ)
		if err != nil {
			t.Fatalf("unexpected error %v", err)
		}
		return commandInfo{typ: typ, handler: handler, spec: spec}
	}

	type MoveCmd struct {
		Direction string `desc:"up, down, left, right"`
		Steps     int8
		Speed     float64
	}
	moveCmdInfo := newCommandInfo(
		reflect.TypeFor[MoveCmd](),
		func(cmd MoveCmd) error {
			if cmd.Direction == "" || cmd.Steps <= 0 {
				return errors.New("invalid move parameters")
			}
			return nil
		},
	)

	type SliceCmd struct {
		Names  []string
		Scores []int8
		Coords []float64
	}
	sliceCmdInfo := newCommandInfo(
		reflect.TypeFor[SliceCmd](),
		func(cmd SliceCmd) error {
			if !reflect.DeepEqual(cmd.Names, []string{"Alice", "Bob"}) ||
				!reflect.DeepEqual(cmd.Scores, []int8{100, 95}) ||
				!reflect.DeepEqual(cmd.Coords, []float64{1.1, 2.2, 3.3}) {
				return errors.New("unexpected slice values")
			}
			return nil
		},
	)

	type UnsignedCmd struct {
		Value uint64
	}
	unsignedCmdInfo := newCommandInfo(
		reflect.TypeFor[UnsignedCmd](),
		func(cmd UnsignedCmd) error {
			if cmd.Value != 9007199254740993 {
				return errors.New("unexpected unsigned integer value")
			}
			return nil
		},
	)

	type score int8
	type point struct {
		X score
		Y int
	}
	type CompositeCmd struct {
		Waypoints [2]point
		Scores    [][]score
	}
	compositeCmdInfo := newCommandInfo(
		reflect.TypeFor[CompositeCmd](),
		func(cmd CompositeCmd) error {
			if !reflect.DeepEqual(cmd.Waypoints, [2]point{{X: 1, Y: 2}, {X: 3, Y: 4}}) ||
				!reflect.DeepEqual(cmd.Scores, [][]score{{5, 6}, {7}}) {
				return errors.New("unexpected composite values")
			}
			return nil
		},
	)

	for _, tt := range []struct {
		name          string
		info          commandInfo
		args          map[string]any
		handler       any
		wantResult    *CommandResult
		wantResultErr string
		wantCallErr   string
	}{
		{
			name:       "Basic",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "up", "Steps": 5, "Speed": 1.5},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:       "JSONNumbers",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "down", "Steps": json.Number("3"), "Speed": json.Number("2.5")},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:       "IntegralDecimalInteger",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "down", "Steps": json.Number("3.0"), "Speed": 1.0},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:       "IntegralExponentInteger",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "down", "Steps": json.Number("3e0"), "Speed": 1.0},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "HandlerReturnsBreak",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "left", "Steps": 1, "Speed": 1.0},
			handler: func(MoveCmd) error {
				return Break
			},
			wantResult: &CommandResult{Success: true, IsBreak: true},
		},
		{
			name: "SliceBasic",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice", "Bob"},
				"Scores": []any{json.Number("100"), json.Number("95")},
				"Coords": []any{json.Number("1.1"), json.Number("2.2"), json.Number("3.3")},
			},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "IntegralSliceIntegers",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice", "Bob"},
				"Scores": []any{json.Number("1e2"), json.Number("9.5e1")},
				"Coords": []any{json.Number("1.1"), json.Number("2.2"), json.Number("3.3")},
			},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "CompositeValues",
			info: compositeCmdInfo,
			args: map[string]any{
				"Waypoints": []any{
					map[string]any{"X": json.Number("1.0"), "Y": json.Number("2e0")},
					map[string]any{"X": json.Number("3"), "Y": json.Number("4.0")},
				},
				"Scores": []any{
					[]any{json.Number("5.0"), json.Number("6e0")},
					[]any{json.Number("7")},
				},
			},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "HandlerReturnsError",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "right", "Steps": 2, "Speed": 1.0},
			handler: func(MoveCmd) error {
				return errors.New("test handler error")
			},
			wantResult: &CommandResult{ErrorMessage: "test handler error"},
		},
		{
			name:          "TypeMismatch",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": 123, "Steps": 1, "Speed": 1.0},
			wantResultErr: `parameter "Direction": got number, want string`,
		},
		{
			name:          "NonIntegralInteger",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": json.Number("1.5"), "Speed": 1.0},
			wantResultErr: `parameter "Steps": got number, want integer`,
		},
		{
			name:          "IntegerOverflow",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": json.Number("128.0"), "Speed": 1.0},
			wantResultErr: "int8",
		},
		{
			name:       "LargeInteger",
			info:       unsignedCmdInfo,
			args:       map[string]any{"Value": json.Number("9007199254740993.0")},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:          "NegativeUnsignedInteger",
			info:          unsignedCmdInfo,
			args:          map[string]any{"Value": json.Number("-1.0")},
			wantResultErr: "uint64",
		},
		{
			name: "SliceTypeMismatch",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice", 123},
				"Scores": []any{100},
				"Coords": []any{},
			},
			wantResultErr: `parameter "Names"[1]: got number, want string`,
		},
		{
			name: "SliceNonIntegralInteger",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice"},
				"Scores": []any{json.Number("9.5")},
				"Coords": []any{},
			},
			wantResultErr: `parameter "Scores"[0]: got number, want integer`,
		},
		{
			name: "SliceNilElement",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice", nil},
				"Scores": []any{100},
				"Coords": []any{},
			},
			wantResultErr: `parameter "Names"[1]: got null, want string`,
		},
		{
			name: "SliceIntegerOverflow",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice"},
				"Scores": []any{json.Number("128.0")},
				"Coords": []any{},
			},
			wantResultErr: "int8",
		},
		{
			name: "FixedArrayTooShort",
			info: compositeCmdInfo,
			args: map[string]any{
				"Waypoints": []any{map[string]any{"X": 1, "Y": 2}},
				"Scores":    []any{},
			},
			wantResultErr: `parameter "Waypoints": got 1 items, want at least 2`,
		},
		{
			name: "FixedArrayTooLong",
			info: compositeCmdInfo,
			args: map[string]any{
				"Waypoints": []any{
					map[string]any{"X": 1, "Y": 2},
					map[string]any{"X": 3, "Y": 4},
					map[string]any{"X": 5, "Y": 6},
				},
				"Scores": []any{},
			},
			wantResultErr: `parameter "Waypoints": got 3 items, want at most 2`,
		},
		{
			name: "MissingNestedProperty",
			info: compositeCmdInfo,
			args: map[string]any{
				"Waypoints": []any{
					map[string]any{"X": 1, "Y": 2},
					map[string]any{"X": 3},
				},
				"Scores": []any{},
			},
			wantResultErr: `parameter "Waypoints"[1]: missing required property "Y"`,
		},
		{
			name: "UnexpectedNestedProperty",
			info: compositeCmdInfo,
			args: map[string]any{
				"Waypoints": []any{
					map[string]any{"X": 1, "Y": 2},
					map[string]any{"X": 3, "Y": 4, "Z": 5},
				},
				"Scores": []any{},
			},
			wantResultErr: `parameter "Waypoints"[1]: unexpected property "Z"`,
		},
		{
			name:          "NullValue",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": nil, "Speed": 1.0},
			wantResultErr: `parameter "Steps": got null, want integer`,
		},
		{
			name: "HandlerPanics",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "up", "Steps": 1, "Speed": 1.0},
			handler: func(MoveCmd) error {
				panic("intentional panic in test")
			},
			wantCallErr: "panic in command handler",
		},
		{
			name:          "MissingRequiredParameter",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": 1},
			wantResultErr: `missing required parameter "Speed"`,
		},
		{
			name:          "UnexpectedParameter",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": 1, "Speed": 1.0, "Unknown": true},
			wantResultErr: `unexpected parameter "Unknown"`,
		},
		{
			name: "BooleanTypeMismatch",
			info: commandInfo{
				typ:     reflect.TypeOf(CmdWithPtrDescMethod{}),
				handler: func(CmdWithPtrDescMethod) error { return nil },
				spec: CommandSpec{
					Name: "CmdWithPtrDescMethod",
					Parameters: []CommandParamSpec{
						{Name: "Flag", Schema: CommandValueSpec{Type: "boolean"}},
					},
				},
			},
			args:          map[string]any{"Flag": "true"},
			wantResultErr: `parameter "Flag": got string, want boolean`,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			info := tt.info
			if tt.handler != nil {
				info.handler = tt.handler
			}
			result, err := callCommandHandler(nil, info, tt.args)
			if tt.wantCallErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantCallErr) {
					t.Errorf("got error %v, want error containing %q", err, tt.wantCallErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error %v", err)
			}
			if tt.wantResultErr != "" {
				if result == nil || result.Success || !strings.Contains(result.ErrorMessage, tt.wantResultErr) {
					t.Errorf("got %#v, want failed result containing %q", result, tt.wantResultErr)
				}
				return
			}
			if !reflect.DeepEqual(result, tt.wantResult) {
				t.Errorf("got %#v, want %#v", result, tt.wantResult)
			}
		})
	}
}
