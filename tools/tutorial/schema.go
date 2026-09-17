package tutorial

import (
	"fmt"
	"reflect"
	"strings"
)

// deriveSchema derives a JSON Schema from the value a Course passed to
// GenerateJSON.
//
// What makes this work, confirmed by a dedicated experiment: XGo compiles
// Course code into an ordinary package main, so a struct the author defines is
// an ordinary type of that main package and reflect behaves exactly as it does
// on native types — enumerating fields, reading tags and the settability
// encoding/json needs to fill values back in all work normally.
//
// The schema produced here is deliberately only good enough: Course judging
// needs the LLM to emit JSON of a fixed shape, not a complete implementation
// of the JSON Schema specification.
func deriveSchema(result any) (map[string]any, error) {
	if result == nil {
		return nil, fmt.Errorf("generateJSON: result must be a non-nil pointer to a struct")
	}
	value := reflect.ValueOf(result)
	// A pointer is required: otherwise decoding fills in a copy and the
	// Course still reads the zero value.
	if value.Kind() != reflect.Pointer {
		return nil, fmt.Errorf("generateJSON: result must be a pointer to a struct, got %s", value.Type())
	}
	if value.IsNil() {
		return nil, fmt.Errorf("generateJSON: result must not be a nil pointer")
	}
	elem := value.Type().Elem()
	if elem.Kind() != reflect.Struct {
		return nil, fmt.Errorf("generateJSON: result must point to a struct, got a pointer to %s", elem.Kind())
	}
	return schemaOfStruct(elem, map[reflect.Type]bool{})
}

// schemaOfStruct describes a struct as an object schema. Every field goes
// into required: Course judging usually reads all of them, and every field the
// LLM might otherwise omit is one problem less.
//
// visiting records the struct types on the current expansion path. Expressing
// a recursive structure in JSON Schema requires $ref, which we do not
// generate, so a self-referencing type such as type Step struct { Next *Step }
// can only be rejected. Letting it through would recurse forever, which in
// WASM surfaces as the interpreter blowing its stack rather than as an error
// anyone can read.
func schemaOfStruct(t reflect.Type, visiting map[reflect.Type]bool) (map[string]any, error) {
	if visiting[t] {
		return nil, fmt.Errorf("generateJSON: %s refers to itself; a generated value cannot be recursive", t)
	}
	visiting[t] = true
	defer delete(visiting, t)

	properties := map[string]any{}
	required := []string{}
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		if field.Anonymous && !hasJSONName(field) {
			// An anonymous embedded field with no json tag: encoding/json
			// promotes the inner exported fields into the outer object, so
			// generating a nested property here would produce a value that
			// cannot be filled back in, because filling follows the promotion
			// rules and never looks at the nested key. Reproducing the
			// promotion and conflict rules in full is not worth it, so this is
			// rejected outright: the author only has to name the field or give
			// it a json tag.
			return nil, fmt.Errorf(
				"generateJSON: %s embeds %s without a json tag; embedded fields are not supported — use a named field or give it an explicit json name",
				t, field.Type)
		}
		if field.PkgPath != "" {
			// An unexported field: encoding/json can neither read nor fill it,
			// so putting it in the schema would only mislead the LLM.
			continue
		}
		name, omitted := jsonFieldName(field)
		if omitted {
			continue
		}
		property, err := schemaOfType(field.Type, visiting)
		if err != nil {
			return nil, fmt.Errorf("field %s: %w", field.Name, err)
		}
		properties[name] = property
		required = append(required, name)
	}
	if len(properties) == 0 {
		// Not one usable field. The most common cause is an author following
		// XGo habits and writing the field names in lower case; the only
		// exported fields being excluded by json:"-" does it too. Either way
		// the generated value could never be filled in, leaving the Course
		// reading an all-zero value with no hint as to why, so this has to be
		// an error rather than an empty schema that fails quietly.
		return nil, fmt.Errorf("generateJSON: %s has no serializable exported fields to fill", t)
	}
	return map[string]any{
		"type":       "object",
		"properties": properties,
		"required":   required,
	}, nil
}

// schemaOfType maps one field type onto a schema fragment. What it supports
// covers the shapes Course judging uses: scalars, slices and arrays, nested
// structs, and pointers, which pass through to the element type. Everything
// else — maps, interfaces, channels — is an error, which beats generating a
// schema the LLM has no way to satisfy.
func schemaOfType(t reflect.Type, visiting map[reflect.Type]bool) (map[string]any, error) {
	switch t.Kind() {
	case reflect.String:
		return map[string]any{"type": "string"}, nil
	case reflect.Bool:
		return map[string]any{"type": "boolean"}, nil
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return map[string]any{"type": "integer"}, nil
	case reflect.Float32, reflect.Float64:
		return map[string]any{"type": "number"}, nil
	case reflect.Pointer:
		return schemaOfType(t.Elem(), visiting)
	case reflect.Slice, reflect.Array:
		items, err := schemaOfType(t.Elem(), visiting)
		if err != nil {
			return nil, err
		}
		return map[string]any{"type": "array", "items": items}, nil
	case reflect.Struct:
		return schemaOfStruct(t, visiting)
	default:
		return nil, fmt.Errorf("unsupported type %s", t)
	}
}

// hasJSONName reports whether a field carries an explicit json name tag.
// encoding/json treats a named anonymous field as an ordinary named field,
// without promotion, so those are supported normally.
func hasJSONName(field reflect.StructField) bool {
	name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
	return name != "" && name != "-"
}

// jsonFieldName decides a field's name in JSON by encoding/json's rules.
// Matching encoding/json matters: a key in the schema must be the key
// decoding actually looks for, or the field the LLM emits per the schema will
// not be filled in.
func jsonFieldName(field reflect.StructField) (name string, omitted bool) {
	tag := field.Tag.Get("json")
	if tag == "-" {
		return "", true
	}
	if tagged, _, _ := strings.Cut(tag, ","); tagged != "" {
		return tagged, false
	}
	return field.Name, false
}
