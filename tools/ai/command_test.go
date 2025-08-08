package ai

import (
	"errors"
	"math"
	"reflect"
	"strings"
	"testing"
)

type SimpleCmd struct {
	Param1 string `desc:"First parameter"`
	Param2 int
	hidden string
}

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

type CmdWithSlice struct {
	Items []string `desc:"List of items"`
	Nums  []int
}

func TestExtractCommandSpec(t *testing.T) {
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
					{Name: "Param1", Type: "string", Description: "First parameter"},
					{Name: "Param2", Type: "int", Description: ""},
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
					{Name: "Value", Type: "float64", Description: "Some value"},
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
					{Name: "Flag", Type: "bool", Description: ""},
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
					{Name: "Items", Type: "[]string", Description: "List of items"},
					{Name: "Nums", Type: "[]int", Description: ""},
				},
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got, want := extractCommandSpec(tt.typ), tt.wantSpec; !reflect.DeepEqual(got, want) {
				t.Errorf("got %#v, want %#v", got, want)
			}
		})
	}
}

func TestCallCommandHandler(t *testing.T) {
	type MoveCmd struct {
		Direction string `desc:"up, down, left, right"`
		Steps     int8
		Speed     float64
		Optional  *string
	}
	moveCmdInfo := commandInfo{
		typ: reflect.TypeOf(MoveCmd{}),
		handler: func(cmd MoveCmd) error {
			if cmd.Direction == "" || cmd.Steps <= 0 {
				return errors.New("invalid move parameters")
			}
			return nil
		},
		spec: extractCommandSpec(reflect.TypeOf(MoveCmd{})),
	}

	type SliceCmd struct {
		Names  []string
		Scores []int8
		Coords []float64
	}
	sliceCmdInfo := commandInfo{
		typ: reflect.TypeOf(SliceCmd{}),
		handler: func(cmd SliceCmd) error {
			if len(cmd.Names) == 0 || len(cmd.Scores) == 0 {
				return errors.New("missing slice data")
			}
			return nil
		},
		spec: extractCommandSpec(reflect.TypeOf(SliceCmd{})),
	}

	for _, tt := range []struct {
		name          string
		info          commandInfo
		args          map[string]any
		handlerFunc   any
		wantResult    *CommandResult
		wantErr       bool
		wantErrSubstr string
	}{
		{
			name:       "Basic",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "up", "Steps": 5, "Speed": 1.5},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:       "FloatToInt",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "down", "Steps": 3.0, "Speed": 2.0},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "HandlerReturnsBreak",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "left", "Steps": 1, "Speed": 1.0},
			handlerFunc: func(cmd MoveCmd) error {
				return Break
			},
			wantResult: &CommandResult{Success: true, IsBreak: true},
		},
		{
			name: "SliceBasic",
			info: sliceCmdInfo,
			args: map[string]any{
				"Names":  []any{"Alice", "Bob"},
				"Scores": []any{100.0, 95.0},
				"Coords": []any{1.1, 2.2, 3.3},
			},
			wantResult: &CommandResult{Success: true},
		},
		{
			name:       "OptionalNil",
			info:       moveCmdInfo,
			args:       map[string]any{"Direction": "stay", "Steps": 1, "Speed": 0.0, "Optional": nil},
			wantResult: &CommandResult{Success: true},
		},
		{
			name: "HandlerReturnsError",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "right", "Steps": 2, "Speed": 1.0},
			handlerFunc: func(cmd MoveCmd) error {
				return errors.New("test handler error")
			},
			wantResult: &CommandResult{Success: false, ErrorMessage: "test handler error"},
		},
		{
			name:          "TypeMismatch",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": 123, "Steps": "1", "Speed": 1.0},
			wantErr:       true,
			wantErrSubstr: "type mismatch: got string, want int",
		},
		{
			name:          "FloatToIntOverflow",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": float64(math.MaxInt64) + 100.0, "Speed": 1.0},
			wantErr:       true,
			wantErrSubstr: "integer overflow",
		},
		{
			name:          "FloatToUintNegative",
			info:          commandInfo{typ: reflect.TypeOf(struct{ Val uint }{}), handler: func(struct{ Val uint }) error { return nil }},
			args:          map[string]any{"Val": -1.0},
			wantErr:       true,
			wantErrSubstr: "cannot assign negative float",
		},
		{
			name:          "SliceTypeMismatch",
			info:          sliceCmdInfo,
			args:          map[string]any{"Names": []any{"Alice", 123}, "Scores": []any{"100"}},
			wantErr:       true,
			wantErrSubstr: "type mismatch: got string, want int",
		},
		{
			name:          "SliceNilElement",
			info:          sliceCmdInfo,
			args:          map[string]any{"Names": []any{"Alice", nil}, "Scores": []any{100}},
			wantErr:       true,
			wantErrSubstr: "nil element at index 1",
		},
		{
			name:          "SliceFloatToIntOverflow",
			info:          sliceCmdInfo,
			args:          map[string]any{"Names": []any{"A"}, "Scores": []any{float64(math.MaxInt64) + 100.0}},
			wantErr:       true,
			wantErrSubstr: "integer overflow",
		},
		{
			name:          "SliceSetNilToNonNillable",
			info:          moveCmdInfo,
			args:          map[string]any{"Direction": "up", "Steps": nil, "Speed": 1.0},
			wantErr:       true,
			wantErrSubstr: "cannot set field Steps to nil",
		},
		{
			name: "HandlerPanics",
			info: moveCmdInfo,
			args: map[string]any{"Direction": "up", "Steps": 1, "Speed": 1.0},
			handlerFunc: func(cmd MoveCmd) error {
				panic("intentional panic in test")
			},
			wantErr:       true,
			wantErrSubstr: "panic in command handler",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			info := tt.info
			if tt.handlerFunc != nil {
				info.handler = tt.handlerFunc
			}
			result, err := callCommandHandler(nil, info, tt.args)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
				return
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
			}
			if got, want := result, tt.wantResult; !reflect.DeepEqual(got, want) {
				t.Errorf("got %#v, want %#v", got, want)
			}
		})
	}
}

func TestPopulateCommandFields(t *testing.T) {
	type PopulateTarget struct {
		StringField string
		IntField    int
		FloatField  float64
		BoolField   bool
		PtrField    *int
		SliceField  []string
		IntSlice    []int
		UintField   uint
		hiddenField string
	}

	target := PopulateTarget{}
	cmdVal := reflect.ValueOf(&target).Elem()
	if err := populateCommandFields(cmdVal, map[string]any{
		"StringField": "hello",
		"IntField":    123.0,
		"FloatField":  45.6,
		"BoolField":   true,
		"PtrField":    nil,
		"SliceField":  []any{"a", "b"},
		"IntSlice":    []any{1.0, 2.0, 3.0},
		"UintField":   100.0,
		"hiddenField": "should not be set",
		"NonExistent": "ignore me",
	}); err != nil {
		t.Fatalf("unexpected error %v", err)
	}

	// Verify fields.
	if got, want := target.StringField, "hello"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
	if got, want := target.IntField, 123; got != want {
		t.Errorf("got %d, want %d", got, want)
	}
	if got, want := target.FloatField, 45.6; got != want {
		t.Errorf("got %f, want %f", got, want)
	}
	if got, want := target.BoolField, true; got != want {
		t.Errorf("got %t, want %t", got, want)
	}
	if got := target.PtrField; got != nil {
		t.Errorf("got %#v, want nil", got)
	}
	if got, want := target.SliceField, []string{"a", "b"}; !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}
	if got, want := target.IntSlice, []int{1, 2, 3}; !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}
	if got, want := target.UintField, uint(100); got != want {
		t.Errorf("got %d, want %d", got, want)
	}
	if got, want := target.hiddenField, ""; got != want {
		t.Errorf("got %q, want %q", got, want)
	}

	// Test nil args.
	target = PopulateTarget{}
	cmdVal = reflect.ValueOf(&target).Elem()
	if err := populateCommandFields(cmdVal, nil); err != nil {
		t.Fatalf("unexpected error %v", err)
	}
	if got, want := target, (PopulateTarget{}); !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}

	// Test error case (type mismatch).
	target = PopulateTarget{}
	cmdVal = reflect.ValueOf(&target).Elem()
	argsWithError := map[string]any{"IntField": "not a number"}
	if err := populateCommandFields(cmdVal, argsWithError); err == nil {
		t.Fatal("expected error")
	} else if got, wantSubstr := err.Error(), "type mismatch"; !strings.Contains(got, wantSubstr) {
		t.Errorf(`got %q, want substring %q`, got, wantSubstr)
	}
}

func TestSetField(t *testing.T) {
	type Target struct {
		StringField string
		IntField    int
		FloatField  float64
		BoolField   bool
		PtrField    *int
		SliceField  []string
		AnyField    any
		UintField   uint
		Int8Field   int8
		Uint16Field uint16
	}
	for _, tt := range []struct {
		name          string
		fieldName     string
		argValue      any
		wantValue     any
		wantErr       bool
		wantErrSubstr string
	}{
		// Basic assignments.
		{name: "StringSet", fieldName: "StringField", argValue: "test", wantValue: "test", wantErr: false, wantErrSubstr: ""},
		{name: "IntSet", fieldName: "IntField", argValue: 123, wantValue: 123, wantErr: false, wantErrSubstr: ""},
		{name: "FloatSet", fieldName: "FloatField", argValue: 1.23, wantValue: 1.23, wantErr: false, wantErrSubstr: ""},
		{name: "BoolSet", fieldName: "BoolField", argValue: true, wantValue: true, wantErr: false, wantErrSubstr: ""},
		{name: "AnySetString", fieldName: "AnyField", argValue: "hello", wantValue: "hello", wantErr: false, wantErrSubstr: ""},
		{name: "AnySetInt", fieldName: "AnyField", argValue: 42, wantValue: 42, wantErr: false, wantErrSubstr: ""},

		// Nil assignments.
		{name: "NilToPtr", fieldName: "PtrField", argValue: nil, wantValue: (*int)(nil), wantErr: false, wantErrSubstr: ""},
		{name: "NilToSlice", fieldName: "SliceField", argValue: nil, wantValue: ([]string)(nil), wantErr: false, wantErrSubstr: ""},
		{name: "NilToAny", fieldName: "AnyField", argValue: nil, wantValue: (any)(nil), wantErr: false, wantErrSubstr: ""},
		{name: "NilToNonNillableError", fieldName: "IntField", argValue: nil, wantValue: 0, wantErr: true, wantErrSubstr: "cannot set field IntField to nil"},

		// Float to int/uint conversions.
		{name: "FloatToInt", fieldName: "IntField", argValue: 456.0, wantValue: 456, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToIntTruncate", fieldName: "IntField", argValue: 456.7, wantValue: 456, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToUint", fieldName: "UintField", argValue: 789.0, wantValue: uint(789), wantErr: false, wantErrSubstr: ""},
		{name: "FloatToIntOverflow", fieldName: "Int8Field", argValue: 200.0, wantValue: int8(0), wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "FloatToUintNegative", fieldName: "UintField", argValue: -1.0, wantValue: uint(0), wantErr: true, wantErrSubstr: "cannot assign negative float"},
		{name: "FloatToUintOverflow", fieldName: "Uint16Field", argValue: 70000.0, wantValue: uint16(0), wantErr: true, wantErrSubstr: "unsigned integer overflow"},

		// Slice assignments.
		{name: "SliceSetBasic", fieldName: "SliceField", argValue: []any{"x", "y"}, wantValue: []string{"x", "y"}, wantErr: false, wantErrSubstr: ""},
		{name: "SliceSetEmpty", fieldName: "SliceField", argValue: []any{}, wantValue: []string{}, wantErr: false, wantErrSubstr: ""},

		// General conversions.
		{name: "IntToFloat", fieldName: "FloatField", argValue: 10, wantValue: 10.0, wantErr: false, wantErrSubstr: ""},
		{name: "Int8ToInt", fieldName: "IntField", argValue: int8(5), wantValue: 5, wantErr: false, wantErrSubstr: ""},

		// Type mismatch errors.
		{name: "MismatchStringToInt", fieldName: "IntField", argValue: "abc", wantValue: 0, wantErr: true, wantErrSubstr: "type mismatch: got string, want int"},
		{name: "MismatchIntToBool", fieldName: "BoolField", argValue: 1, wantValue: false, wantErr: true, wantErrSubstr: "type mismatch: got int, want bool"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			target := Target{}
			fieldVal := reflect.ValueOf(&target).Elem().FieldByName(tt.fieldName)
			if got, want := fieldVal.IsValid(), true; got != want {
				t.Fatalf("got %t, want %t", got, want)
			}
			argVal := reflect.ValueOf(tt.argValue)
			err := setField(tt.fieldName, fieldVal, argVal)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
				gotValue := fieldVal.Interface()
				if fieldVal.Kind() == reflect.Slice || fieldVal.Kind() == reflect.Ptr || fieldVal.Kind() == reflect.Interface {
					if !reflect.DeepEqual(gotValue, tt.wantValue) {
						t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
					}
				} else if !reflect.DeepEqual(gotValue, tt.wantValue) {
					t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
				}
			}
		})
	}
}

func TestSetIntFieldFromFloat(t *testing.T) {
	for _, tt := range []struct {
		name          string
		target        any
		argValue      float64
		wantValue     any
		wantErr       bool
		wantErrSubstr string
	}{
		{name: "ValidInt", target: new(int), argValue: 123.45, wantValue: int(123), wantErr: false, wantErrSubstr: ""},
		{name: "ValidIntNegative", target: new(int), argValue: -123.45, wantValue: int(-123), wantErr: false, wantErrSubstr: ""},
		{name: "ValidInt8", target: new(int8), argValue: 100.0, wantValue: int8(100), wantErr: false, wantErrSubstr: ""},
		{name: "Int8Overflow", target: new(int8), argValue: 200.0, wantValue: int8(0), wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "Int8Underflow", target: new(int8), argValue: -200.0, wantValue: int8(0), wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "ValidUint", target: new(uint), argValue: 456.78, wantValue: uint(456), wantErr: false, wantErrSubstr: ""},
		{name: "ValidUint8", target: new(uint8), argValue: 255.0, wantValue: uint8(255), wantErr: false, wantErrSubstr: ""},
		{name: "UintNegativeError", target: new(uint), argValue: -1.0, wantValue: uint(0), wantErr: true, wantErrSubstr: "cannot assign negative float"},
		{name: "Uint8Overflow", target: new(uint8), argValue: 300.0, wantValue: uint8(0), wantErr: true, wantErrSubstr: "unsigned integer overflow"},
		{name: "ValidInt64Max", target: new(int64), argValue: math.MaxInt64, wantValue: int64(math.MaxInt64), wantErr: false, wantErrSubstr: ""},
		{name: "ValidUint64Max", target: new(uint64), argValue: math.MaxUint64, wantValue: uint64(math.MaxUint64), wantErr: false, wantErrSubstr: ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			fieldVal := reflect.ValueOf(tt.target).Elem()
			argVal := reflect.ValueOf(tt.argValue)
			err := setIntFieldFromFloat(fieldVal, argVal)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
				gotValue := fieldVal.Interface()
				if !reflect.DeepEqual(gotValue, tt.wantValue) {
					if fArg, okF := tt.argValue, true; okF && (fieldVal.Kind() == reflect.Int64 || fieldVal.Kind() == reflect.Uint64) {
						if fieldVal.Kind() == reflect.Int64 && int64(fArg) != gotValue.(int64) {
							t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
						} else if fieldVal.Kind() == reflect.Uint64 && uint64(fArg) != gotValue.(uint64) {
							t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
						}
					} else {
						t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
					}
				}
			}
		})
	}
}

func TestConvertAndSetSlice(t *testing.T) {
	type Target struct {
		StringSlice []string
		IntSlice    []int
		FloatSlice  []float64
		AnySlice    []any
		UintSlice   []uint
		BoolSlice   []bool
	}
	for _, tt := range []struct {
		name          string
		fieldName     string
		argSliceValue []any
		wantValue     any
		wantErr       bool
		wantErrSubstr string
	}{
		{name: "Strings", fieldName: "StringSlice", argSliceValue: []any{"a", "b", "c"}, wantValue: []string{"a", "b", "c"}, wantErr: false, wantErrSubstr: ""},
		{name: "IntsFromFloats", fieldName: "IntSlice", argSliceValue: []any{1.0, 2.0, -3.0}, wantValue: []int{1, 2, -3}, wantErr: false, wantErrSubstr: ""},
		{name: "Floats", fieldName: "FloatSlice", argSliceValue: []any{1.1, 2.2, 3.3}, wantValue: []float64{1.1, 2.2, 3.3}, wantErr: false, wantErrSubstr: ""},
		{name: "Any", fieldName: "AnySlice", argSliceValue: []any{"a", 1, true}, wantValue: []any{"a", 1, true}, wantErr: false, wantErrSubstr: ""},
		{name: "UintsFromFloats", fieldName: "UintSlice", argSliceValue: []any{10.0, 20.0}, wantValue: []uint{10, 20}, wantErr: false, wantErrSubstr: ""},
		{name: "Bools", fieldName: "BoolSlice", argSliceValue: []any{true, false, true}, wantValue: []bool{true, false, true}, wantErr: false, wantErrSubstr: ""},
		{name: "EmptyInput", fieldName: "StringSlice", argSliceValue: []any{}, wantValue: []string{}, wantErr: false, wantErrSubstr: ""},
		{name: "TypeError", fieldName: "IntSlice", argSliceValue: []any{"a", 123}, wantValue: nil, wantErr: true, wantErrSubstr: "type mismatch: got string, want int"},
		{name: "NilElementError", fieldName: "StringSlice", argSliceValue: []any{"a", nil}, wantValue: nil, wantErr: true, wantErrSubstr: "nil element at index 1"},
		{name: "UintNegativeInSlice", fieldName: "UintSlice", argSliceValue: []any{1.0, -2.0}, wantValue: nil, wantErr: true, wantErrSubstr: "cannot assign negative float"},
		{name: "InterfaceElements", fieldName: "IntSlice", argSliceValue: []any{any(5.0), any(6.0)}, wantValue: []int{5, 6}, wantErr: false, wantErrSubstr: ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			target := Target{}
			fieldVal := reflect.ValueOf(&target).Elem().FieldByName(tt.fieldName)
			if got, want := fieldVal.IsValid(), true; got != want {
				t.Fatalf("got %t, want %t", got, want)
			}
			argSliceVal := reflect.ValueOf(tt.argSliceValue)
			err := convertAndSetSlice(fieldVal, argSliceVal, tt.fieldName)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
				if got, want := fieldVal.Interface(), tt.wantValue; !reflect.DeepEqual(got, want) {
					t.Errorf("got %#v, want %#v", got, want)
				}
			}
		})
	}
}

func TestConvertSliceElement(t *testing.T) {
	for _, tt := range []struct {
		name          string
		elemValue     any
		targetType    reflect.Type
		wantValue     any
		wantConcrete  reflect.Value
		wantErr       bool
		wantErrSubstr string
	}{
		{name: "StringToString", elemValue: "hello", targetType: reflect.TypeOf(""), wantValue: "hello", wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "IntToInt", elemValue: 123, targetType: reflect.TypeOf(0), wantValue: 123, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToFloat", elemValue: 1.23, targetType: reflect.TypeOf(0.0), wantValue: 1.23, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToInt", elemValue: 456.0, targetType: reflect.TypeOf(0), wantValue: 456, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToIntTruncate", elemValue: 456.7, targetType: reflect.TypeOf(0), wantValue: 456, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "FloatToUint", elemValue: 789.0, targetType: reflect.TypeOf(uint(0)), wantValue: uint(789), wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "IntToFloat", elemValue: 10, targetType: reflect.TypeOf(0.0), wantValue: 10.0, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "Int8ToInt", elemValue: int8(5), targetType: reflect.TypeOf(0), wantValue: 5, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "InterfaceStringToString", elemValue: any("iface"), targetType: reflect.TypeOf(""), wantValue: "iface", wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "InterfaceIntToInt", elemValue: any(99), targetType: reflect.TypeOf(0), wantValue: 99, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "InterfaceFloatToInt", elemValue: any(11.0), targetType: reflect.TypeOf(0), wantValue: 11, wantConcrete: reflect.Value{}, wantErr: false, wantErrSubstr: ""},
		{name: "TypeErrorStringToInt", elemValue: "abc", targetType: reflect.TypeOf(0), wantValue: nil, wantConcrete: reflect.Value{}, wantErr: true, wantErrSubstr: "type mismatch: got string, want int"},
		{name: "TypeErrorIntToBool", elemValue: 1, targetType: reflect.TypeOf(false), wantValue: nil, wantConcrete: reflect.Value{}, wantErr: true, wantErrSubstr: "type mismatch: got int, want bool"},
		{name: "FloatToIntOverflow", elemValue: 200.0, targetType: reflect.TypeOf(int8(0)), wantValue: nil, wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "FloatToUintNegative", elemValue: -1.0, targetType: reflect.TypeOf(uint(0)), wantValue: nil, wantErr: true, wantErrSubstr: "cannot assign negative float"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			elemVal := reflect.ValueOf(tt.elemValue)
			if elemVal.Kind() == reflect.Interface && !elemVal.IsNil() {
				elemVal = elemVal.Elem()
			}
			gotConvertedVal, err := convertSliceElement(elemVal, tt.targetType)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
				if got, want := gotConvertedVal.IsValid(), true; got != want {
					t.Fatalf("got %t, want %t", got, want)
				}
				if tt.wantConcrete.IsValid() {
					if got, want := gotConvertedVal.Interface(), tt.wantConcrete.Interface(); !reflect.DeepEqual(got, want) {
						t.Errorf("got %v, want %v", got, want)
					}
				} else if got, want := gotConvertedVal.Interface(), tt.wantValue; !reflect.DeepEqual(got, want) {
					t.Errorf("got %#v, want %#v", got, want)
				}
				if got, want := gotConvertedVal.Type(), tt.targetType; got != want {
					t.Errorf("got %#v, want %#v", got, want)
				}
			}
		})
	}
}

func TestConvertFloatToSliceIntElement(t *testing.T) {
	for _, tt := range []struct {
		name          string
		elemValue     float64
		targetType    reflect.Type
		wantValue     any
		wantErr       bool
		wantErrSubstr string
	}{
		{name: "ValidInt", elemValue: 123.45, targetType: reflect.TypeOf(int(0)), wantValue: int(123), wantErr: false, wantErrSubstr: ""},
		{name: "ValidIntNegative", elemValue: -123.45, targetType: reflect.TypeOf(int(0)), wantValue: int(-123), wantErr: false, wantErrSubstr: ""},
		{name: "ValidInt8", elemValue: 100.0, targetType: reflect.TypeOf(int8(0)), wantValue: int8(100), wantErr: false, wantErrSubstr: ""},
		{name: "Int8Overflow", elemValue: 200.0, targetType: reflect.TypeOf(int8(0)), wantValue: nil, wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "Int8Underflow", elemValue: -200.0, targetType: reflect.TypeOf(int8(0)), wantValue: nil, wantErr: true, wantErrSubstr: "integer overflow"},
		{name: "ValidUint", elemValue: 456.78, targetType: reflect.TypeOf(uint(0)), wantValue: uint(456), wantErr: false, wantErrSubstr: ""},
		{name: "ValidUint8", elemValue: 255.0, targetType: reflect.TypeOf(uint8(0)), wantValue: uint8(255), wantErr: false, wantErrSubstr: ""},
		{name: "UintNegativeError", elemValue: -1.0, targetType: reflect.TypeOf(uint(0)), wantValue: nil, wantErr: true, wantErrSubstr: "cannot assign negative float"},
		{name: "Uint8Overflow", elemValue: 300.0, targetType: reflect.TypeOf(uint8(0)), wantValue: nil, wantErr: true, wantErrSubstr: "unsigned integer overflow"},
		{name: "ValidInt64Max", elemValue: math.MaxInt64, targetType: reflect.TypeOf(int64(0)), wantValue: int64(math.MaxInt64), wantErr: false, wantErrSubstr: ""},
		{name: "ValidUint64Max", elemValue: math.MaxUint64, targetType: reflect.TypeOf(uint64(0)), wantValue: uint64(math.MaxUint64), wantErr: false, wantErrSubstr: ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			elemVal := reflect.ValueOf(tt.elemValue)
			gotConvertedVal, err := convertFloatToSliceIntElement(elemVal, tt.targetType)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.wantErrSubstr != "" {
					if got, wantSubstr := err.Error(), tt.wantErrSubstr; !strings.Contains(got, wantSubstr) {
						t.Errorf("got %q, want substring %q", got, wantSubstr)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error %v", err)
				}
				if got, want := gotConvertedVal.IsValid(), true; got != want {
					t.Fatalf("got %t, want %t", got, want)
				}
				gotValue := gotConvertedVal.Interface()
				if !reflect.DeepEqual(gotValue, tt.wantValue) {
					if fArg, okF := tt.elemValue, true; okF && (tt.targetType.Kind() == reflect.Int64 || tt.targetType.Kind() == reflect.Uint64) {
						if tt.targetType.Kind() == reflect.Int64 && int64(fArg) != gotValue.(int64) {
							t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
						} else if tt.targetType.Kind() == reflect.Uint64 && uint64(fArg) != gotValue.(uint64) {
							t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
						}
					} else {
						t.Errorf("got %#v, want %#v", gotValue, tt.wantValue)
					}
				}
				if got, want := gotConvertedVal.Type(), tt.targetType; got != want {
					t.Errorf("got %#v, want %#v", got, want)
				}
			}
		})
	}
}

func TestIsIntKind(t *testing.T) {
	for _, tt := range []struct {
		kind reflect.Kind
		want bool
	}{
		{reflect.Int, true}, {reflect.Int8, true}, {reflect.Int16, true}, {reflect.Int32, true}, {reflect.Int64, true},
		{reflect.Uint, true}, {reflect.Uint8, true}, {reflect.Uint16, true}, {reflect.Uint32, true}, {reflect.Uint64, true}, {reflect.Uintptr, true},
		{reflect.Float32, false}, {reflect.Float64, false}, {reflect.String, false}, {reflect.Bool, false}, {reflect.Struct, false}, {reflect.Slice, false},
	} {
		t.Run(tt.kind.String(), func(t *testing.T) {
			if got := isIntKind(tt.kind); got != tt.want {
				t.Errorf("got %t, want %t", got, tt.want)
			}
		})
	}
}
