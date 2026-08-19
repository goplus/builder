package tutorial

import (
	"fmt"
	"reflect"
	"strings"
)

// deriveSchema builds the JSON Schema of the value Course code passed to
// GenerateJSON. Course structs are ordinary main-package types once XGo
// compiles the Course program, so reflection describes them the same way it
// describes any Go struct.
func deriveSchema(result any) (map[string]any, error) {
	if result == nil {
		return nil, fmt.Errorf("generateJSON: result must be a non-nil pointer to a struct")
	}
	value := reflect.ValueOf(result)
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
	return schemaOfStruct(elem)
}

func schemaOfStruct(t reflect.Type) (map[string]any, error) {
	properties := map[string]any{}
	required := []string{}
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		if field.PkgPath != "" {
			// Unexported: encoding/json can neither read nor fill it.
			continue
		}
		name, omitted := jsonFieldName(field)
		if omitted {
			continue
		}
		property, err := schemaOfType(field.Type)
		if err != nil {
			return nil, fmt.Errorf("field %s: %w", field.Name, err)
		}
		properties[name] = property
		required = append(required, name)
	}
	if len(properties) == 0 {
		// Every field is unexported or skipped, so the generated value could
		// never be read back. Say so instead of returning an empty result.
		return nil, fmt.Errorf("generateJSON: %s has no exported fields to fill", t)
	}
	return map[string]any{
		"type":       "object",
		"properties": properties,
		"required":   required,
	}, nil
}

func schemaOfType(t reflect.Type) (map[string]any, error) {
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
		return schemaOfType(t.Elem())
	case reflect.Slice, reflect.Array:
		items, err := schemaOfType(t.Elem())
		if err != nil {
			return nil, err
		}
		return map[string]any{"type": "array", "items": items}, nil
	case reflect.Struct:
		return schemaOfStruct(t)
	default:
		return nil, fmt.Errorf("unsupported type %s", t)
	}
}

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
