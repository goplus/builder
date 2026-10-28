package ai

import (
	"bytes"
	"context"
	"encoding"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"reflect"
	"unicode/utf8"

	"github.com/goplus/spx/v3/pkg/spx"
)

const (
	// maxCommandCount is the maximum number of commands in one interaction request.
	maxCommandCount = 128

	// maxCommandDescriptionLength is the maximum number of characters in a
	// command or parameter description.
	maxCommandDescriptionLength = 1024

	// maxCommandParameterCount is the maximum number of parameters or
	// properties in one collection.
	maxCommandParameterCount = 128

	// maxCommandValueSchemaDepth is the maximum number of value schema
	// levels beneath a command's parameter object.
	maxCommandValueSchemaDepth = 9
)

// CommandSpec describes an available AI command, derived from a command registration.
type CommandSpec struct {
	// Name is the unique identifier for the command (e.g., struct type name).
	Name string `json:"name"`

	// Description explains what the command does.
	Description string `json:"description,omitempty"`

	// Parameters lists the parameters the command accepts.
	Parameters []CommandParamSpec `json:"parameters,omitempty"`
}

// CommandParamSpec describes a parameter or object property accepted by an AI command.
type CommandParamSpec struct {
	// Name is the parameter name (e.g., struct field name).
	Name string `json:"name"`

	// Description explains the purpose of the parameter.
	Description string `json:"description,omitempty"`

	// Schema describes the values accepted by the parameter.
	Schema CommandValueSpec `json:"schema"`
}

// CommandValueSpec describes a value accepted by an AI command.
type CommandValueSpec struct {
	// Type is the JSON data type of the value.
	Type string `json:"type"`

	// Items describes the values accepted as array elements.
	Items *CommandValueSpec `json:"items,omitempty"`

	// MinItems is the minimum number of items accepted by an array.
	MinItems *int `json:"minItems,omitempty"`

	// MaxItems is the maximum number of items accepted by an array.
	MaxItems *int `json:"maxItems,omitempty"`

	// Properties lists all properties of an object value. Every property is required.
	Properties []CommandParamSpec `json:"properties,omitempty"`
}

// CommandResult represents the outcome of executing an AI-requested command.
type CommandResult struct {
	// Success indicates whether the command execution was successful (handler
	// returned nil).
	Success bool `json:"success"`

	// ErrorMessage contains the error details if execution failed (handler
	// returned an error other than the [Break]).
	ErrorMessage string `json:"errorMessage,omitempty"`

	// IsBreak indicates whether the command handler returned [Break] to terminate
	// the current interaction sequence.
	IsBreak bool `json:"isBreak,omitempty"`
}

// commandInfo holds the type, handler, and specification for a registered command.
type commandInfo struct {
	typ     reflect.Type
	handler any // func(cmd T) error
	spec    CommandSpec
}

// extractCommandSpec uses reflection to build a [CommandSpec] from a command
// struct type. It returns an error when the command cannot be represented by
// the public contract. It assumes cmdType is already validated to be a named struct.
func extractCommandSpec(cmdType reflect.Type) (CommandSpec, error) {
	name := cmdType.Name()
	if err := validateCommandName(name); err != nil {
		return CommandSpec{}, fmt.Errorf("invalid AI command name %q: %w", name, err)
	}
	parameters, err := commandStructParameters(cmdType, make(map[reflect.Type]struct{}), 1)
	if err != nil {
		return CommandSpec{}, fmt.Errorf("invalid AI command %q: %w", name, err)
	}
	spec := CommandSpec{
		Name:        name,
		Description: "Command " + name,
		Parameters:  parameters,
	}

	// Extract the command description from a "Desc() string" method if available.
	if describer, ok := reflect.New(cmdType).Interface().(interface{ Desc() string }); ok {
		spec.Description = describer.Desc()
	}
	if err := validateCommandDescription(spec.Description); err != nil {
		return CommandSpec{}, fmt.Errorf("invalid AI command %q description: %w", name, err)
	}

	return spec, nil
}

// commandStructParameters returns specifications for the exported fields of a command object.
func commandStructParameters(structType reflect.Type, visiting map[reflect.Type]struct{}, valueDepth int) ([]CommandParamSpec, error) {
	parameters := make([]CommandParamSpec, 0, structType.NumField())
	for i := range structType.NumField() {
		field := structType.Field(i)
		if field.Anonymous {
			return nil, fmt.Errorf("field %q: anonymous fields are unsupported", field.Name)
		}
		if !field.IsExported() {
			continue
		}
		parameter, err := commandParameterSpec(field, visiting, valueDepth)
		if err != nil {
			return nil, fmt.Errorf("field %q: %w", field.Name, err)
		}
		parameters = append(parameters, parameter)
	}
	if len(parameters) > maxCommandParameterCount {
		return nil, fmt.Errorf("has %d exported fields, want at most %d", len(parameters), maxCommandParameterCount)
	}
	return parameters, nil
}

// commandParameterSpec returns the public specification for a command struct field.
func commandParameterSpec(field reflect.StructField, visiting map[reflect.Type]struct{}, valueDepth int) (CommandParamSpec, error) {
	if err := validateCommandName(field.Name); err != nil {
		return CommandParamSpec{}, fmt.Errorf("invalid name %q: %w", field.Name, err)
	}
	if _, ok := field.Tag.Lookup("json"); ok {
		return CommandParamSpec{}, errors.New("json tags are unsupported")
	}
	description := field.Tag.Get("desc")
	if err := validateCommandDescription(description); err != nil {
		return CommandParamSpec{}, fmt.Errorf("invalid description: %w", err)
	}
	schema, err := commandValueSpec(field.Type, visiting, valueDepth)
	if err != nil {
		return CommandParamSpec{}, err
	}
	return CommandParamSpec{
		Name:        field.Name,
		Description: description,
		Schema:      schema,
	}, nil
}

// commandValueSpec returns the public value schema for a supported Go type.
func commandValueSpec(goType reflect.Type, visiting map[reflect.Type]struct{}, depth int) (CommandValueSpec, error) {
	if depth > maxCommandValueSchemaDepth {
		return CommandValueSpec{}, fmt.Errorf("schema exceeds %d levels", maxCommandValueSchemaDepth)
	}
	if hasCustomJSONCodec(goType) {
		return CommandValueSpec{}, fmt.Errorf("type %s has a custom JSON representation", goType)
	}

	switch goType.Kind() {
	case reflect.String:
		return CommandValueSpec{Type: "string"}, nil
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return CommandValueSpec{Type: "integer"}, nil
	case reflect.Float32, reflect.Float64:
		return CommandValueSpec{Type: "number"}, nil
	case reflect.Bool:
		return CommandValueSpec{Type: "boolean"}, nil
	case reflect.Array, reflect.Slice:
		if err := beginCommandValueSpec(goType, visiting); err != nil {
			return CommandValueSpec{}, err
		}
		defer delete(visiting, goType)

		items, err := commandValueSpec(goType.Elem(), visiting, depth+1)
		if err != nil {
			return CommandValueSpec{}, fmt.Errorf("array item: %w", err)
		}
		schema := CommandValueSpec{Type: "array", Items: &items}
		if goType.Kind() == reflect.Array {
			length := goType.Len()
			schema.MinItems = &length
			schema.MaxItems = &length
		}
		return schema, nil
	case reflect.Struct:
		if err := beginCommandValueSpec(goType, visiting); err != nil {
			return CommandValueSpec{}, err
		}
		defer delete(visiting, goType)

		properties, err := commandStructParameters(goType, visiting, depth+1)
		if err != nil {
			return CommandValueSpec{}, err
		}
		return CommandValueSpec{Type: "object", Properties: properties}, nil
	default:
		return CommandValueSpec{}, fmt.Errorf("unsupported type %s", goType)
	}
}

// validateCommandDescription validates a description against the public contract.
func validateCommandDescription(description string) error {
	if utf8.RuneCountInString(description) > maxCommandDescriptionLength {
		return fmt.Errorf("must not exceed %d characters", maxCommandDescriptionLength)
	}
	return nil
}

// beginCommandValueSpec marks a composite type as being visited while its schema is built.
func beginCommandValueSpec(goType reflect.Type, visiting map[reflect.Type]struct{}) error {
	if _, ok := visiting[goType]; ok {
		return fmt.Errorf("cyclic type %s is unsupported", goType)
	}
	visiting[goType] = struct{}{}
	return nil
}

// hasCustomJSONCodec reports whether a type can override its default JSON representation.
func hasCustomJSONCodec(goType reflect.Type) bool {
	return typeOrPointerImplements(goType, reflect.TypeFor[json.Marshaler]()) ||
		typeOrPointerImplements(goType, reflect.TypeFor[json.Unmarshaler]()) ||
		typeOrPointerImplements(goType, reflect.TypeFor[encoding.TextMarshaler]()) ||
		typeOrPointerImplements(goType, reflect.TypeFor[encoding.TextUnmarshaler]())
}

// typeOrPointerImplements reports whether a type or its pointer implements an interface.
func typeOrPointerImplements(goType, interfaceType reflect.Type) bool {
	return goType.Implements(interfaceType) ||
		(goType.Kind() != reflect.Pointer && reflect.PointerTo(goType).Implements(interfaceType))
}

// validateCommandName validates a command or parameter name against the API contract.
func validateCommandName(name string) error {
	const maxLength = 64

	if name == "" {
		return errors.New("must not be empty")
	}
	for _, char := range name {
		switch {
		case char >= 'A' && char <= 'Z',
			char >= 'a' && char <= 'z',
			char >= '0' && char <= '9',
			char == '_', char == '-':
		default:
			return errors.New("must contain only ASCII letters, digits, underscores, and hyphens")
		}
	}
	if len(name) > maxLength {
		return fmt.Errorf("must not exceed %d characters", maxLength)
	}
	return nil
}

// callCommandHandler handles the overall logic for executing a command
// handler. It creates the command struct, populates its fields, calls the
// handler, and processes the result.
func callCommandHandler(owner any, info commandInfo, args map[string]any) (*CommandResult, error) {
	// Create a new zero value of the command struct type (T).
	cmdVal := reflect.New(info.typ).Elem()

	// Decode command arguments into struct fields.
	if err := decodeCommandArgs(cmdVal, info.spec, args); err != nil {
		return &CommandResult{
			ErrorMessage: fmt.Sprintf("invalid command arguments for %s: %v", info.spec.Name, err),
		}, nil
	}

	// Call the actual handler function.
	var (
		results        []reflect.Value
		handlerCallErr error
	)
	spx.Execute(owner, func(ctx context.Context, owner any) {
		func(handlerVal reflect.Value) {
			defer func() {
				if r := recover(); r != nil {
					if !spx.IsAbortThreadError(r) {
						handlerCallErr = fmt.Errorf("panic in command handler: %v", r)
					}
				}
			}()
			results = handlerVal.Call([]reflect.Value{cmdVal})
		}(reflect.ValueOf(info.handler))
	})
	if handlerCallErr != nil {
		return nil, fmt.Errorf("failed to call command handler for %s: %w", info.spec.Name, handlerCallErr)
	}

	// Process handler results.
	var handlerErr error
	if len(results) == 1 && !results[0].IsNil() {
		iface := results[0].Interface()
		if errIface, ok := iface.(error); ok {
			handlerErr = errIface
		} else {
			// This should never happen, but just in case.
			return nil, fmt.Errorf("handler for %s returned non-error type %T", info.spec.Name, iface)
		}
	}

	// Construct [CommandResult] based on handlerErr.
	switch {
	case handlerErr == nil:
		return &CommandResult{Success: true}, nil
	case errors.Is(handlerErr, Break):
		return &CommandResult{Success: true, IsBreak: true}, nil
	default:
		return &CommandResult{ErrorMessage: handlerErr.Error()}, nil
	}
}

// decodeCommandArgs validates and decodes command arguments into their
// corresponding struct fields.
func decodeCommandArgs(cmdVal reflect.Value, spec CommandSpec, args map[string]any) error {
	parameterNames := make(map[string]struct{}, len(spec.Parameters))
	for _, parameter := range spec.Parameters {
		parameterNames[parameter.Name] = struct{}{}
	}
	for name := range args {
		if _, ok := parameterNames[name]; !ok {
			return fmt.Errorf("unexpected parameter %q", name)
		}
	}
	for _, parameter := range spec.Parameters {
		value, ok := args[parameter.Name]
		if !ok {
			return fmt.Errorf("missing required parameter %q", parameter.Name)
		}
		if err := decodeCommandValue(
			cmdVal.FieldByName(parameter.Name),
			parameter.Schema,
			value,
			fmt.Sprintf("parameter %q", parameter.Name),
		); err != nil {
			return err
		}
	}
	return nil
}

// decodeCommandValue validates and decodes a single command value.
func decodeCommandValue(target reflect.Value, schema CommandValueSpec, value any, path string) error {
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("%s: failed to encode value: %w", path, err)
	}
	decoder := json.NewDecoder(bytes.NewReader(valueJSON))
	decoder.UseNumber()
	var canonicalValue any
	if err := decoder.Decode(&canonicalValue); err != nil {
		return fmt.Errorf("%s: failed to decode JSON value: %w", path, err)
	}
	normalizedValue, err := normalizeCommandValue(schema, canonicalValue, path)
	if err != nil {
		return err
	}
	valueJSON, err = json.Marshal(normalizedValue)
	if err != nil {
		return fmt.Errorf("%s: failed to encode normalized value: %w", path, err)
	}
	if err := json.Unmarshal(valueJSON, target.Addr().Interface()); err != nil {
		return fmt.Errorf("%s: failed to decode value: %w", path, err)
	}
	return nil
}

// normalizeCommandValue validates a canonical JSON value and normalizes integer
// representations for Go decoding.
func normalizeCommandValue(schema CommandValueSpec, value any, path string) (any, error) {
	if value == nil {
		return nil, fmt.Errorf("%s: got null, want %s", path, schema.Type)
	}

	switch schema.Type {
	case "string":
		if _, ok := value.(string); !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
	case "integer":
		number, ok := value.(json.Number)
		if !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
		rational, ok := new(big.Rat).SetString(number.String())
		if !ok || !rational.IsInt() {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
		return json.Number(rational.Num().String()), nil
	case "number":
		if _, ok := value.(json.Number); !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
	case "array":
		items, ok := value.([]any)
		if !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
		if schema.MinItems != nil && len(items) < *schema.MinItems {
			return nil, fmt.Errorf("%s: got %d items, want at least %d", path, len(items), *schema.MinItems)
		}
		if schema.MaxItems != nil && len(items) > *schema.MaxItems {
			return nil, fmt.Errorf("%s: got %d items, want at most %d", path, len(items), *schema.MaxItems)
		}
		for i, item := range items {
			normalized, err := normalizeCommandValue(*schema.Items, item, fmt.Sprintf("%s[%d]", path, i))
			if err != nil {
				return nil, err
			}
			items[i] = normalized
		}
	case "object":
		object, ok := value.(map[string]any)
		if !ok {
			return nil, commandValueTypeError(path, value, schema.Type)
		}
		propertyNames := make(map[string]struct{}, len(schema.Properties))
		for _, property := range schema.Properties {
			propertyNames[property.Name] = struct{}{}
			propertyValue, ok := object[property.Name]
			if !ok {
				return nil, fmt.Errorf("%s: missing required property %q", path, property.Name)
			}
			normalized, err := normalizeCommandValue(property.Schema, propertyValue, path+"."+property.Name)
			if err != nil {
				return nil, err
			}
			object[property.Name] = normalized
		}
		for name := range object {
			if _, ok := propertyNames[name]; !ok {
				return nil, fmt.Errorf("%s: unexpected property %q", path, name)
			}
		}
	default:
		return nil, fmt.Errorf("%s: unsupported schema type %q", path, schema.Type)
	}
	return value, nil
}

// commandValueTypeError returns a consistent JSON type mismatch error.
func commandValueTypeError(path string, value any, want string) error {
	return fmt.Errorf("%s: got %s, want %s", path, commandJSONType(value), want)
}

// commandJSONType returns the JSON type of a canonical command value.
func commandJSONType(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case string:
		return "string"
	case json.Number:
		return "number"
	case bool:
		return "boolean"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	default:
		return "unknown"
	}
}
