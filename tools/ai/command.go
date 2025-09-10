package ai

import (
	"errors"
	"fmt"
	"reflect"

	"github.com/goplus/spx/v2/pkg/spx"
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

// CommandParamSpec describes a parameter for an AI command.
type CommandParamSpec struct {
	// Name is the parameter name (e.g., struct field name).
	Name string `json:"name"`

	// Type is the Go type name of the parameter (e.g., "string", "int", "[]float64").
	Type string `json:"type"`

	// Description explains the purpose of the parameter.
	Description string `json:"description,omitempty"`
}

// CommandResult represents the outcome of executing an AI-requested command.
type CommandResult struct {
	// Success indicates whether the command execution was successful (handler
	// returned nil).
	Success bool `json:"success"`

	// ErrorMessage contains the error details if execution failed (handler
	// returned an error other than the [Break]).
	ErrorMessage string `json:"errorMessage,omitempty"`

	// IsBreak indicates if the command handler returned [Break] to terminate
	// interaction.
	IsBreak bool `json:"isBreak,omitempty"`
}

// commandInfo holds the type, handler, and specification for a registered command.
type commandInfo struct {
	typ     reflect.Type
	handler any // func(cmd T) error
	spec    CommandSpec
}

// extractCommandSpec uses reflection to build a [CommandSpec] from a command
// struct type. It assumes cmdType is already validated to be a named struct type.
func extractCommandSpec(cmdType reflect.Type) CommandSpec {
	spec := CommandSpec{
		Name:       cmdType.Name(),
		Parameters: []CommandParamSpec{},
	}

	// Extract parameters from exported struct fields.
	for i := range cmdType.NumField() {
		field := cmdType.Field(i)
		if field.IsExported() {
			paramSpec := CommandParamSpec{
				Name:        field.Name,
				Type:        field.Type.String(),
				Description: field.Tag.Get("desc"),
			}
			spec.Parameters = append(spec.Parameters, paramSpec)
		}
	}

	// Extract command description from "Desc() string" method if available,
	// otherwise fall back to a default one.
	if describer, ok := reflect.New(cmdType).Interface().(interface{ Desc() string }); ok {
		spec.Description = describer.Desc()
	} else {
		spec.Description = "Command " + spec.Name
	}

	return spec
}

// callCommandHandler handles the overall logic for executing a command
// handler. It creates the command struct, populates its fields, calls the
// handler, and processes the result.
func callCommandHandler(owner any, info commandInfo, args map[string]any) (*CommandResult, error) {
	// Create a new zero value of the command struct type (T).
	cmdType := info.typ
	cmdPtrVal := reflect.New(cmdType)
	cmdVal := cmdPtrVal.Elem()

	// Populate struct fields from args.
	if err := populateCommandFields(cmdVal, args); err != nil {
		return nil, fmt.Errorf("failed to populate command fields for %s: %w", info.spec.Name, err)
	}

	// Call the actual handler function.
	var (
		results        []reflect.Value
		handlerCallErr error
	)
	spx.Execute(owner, func(owner any) {
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
	result := &CommandResult{}
	if handlerErr == nil {
		result.Success = true
	} else if errors.Is(handlerErr, Break) {
		result.Success = true // Break is considered a successful termination.
		result.IsBreak = true
	} else {
		result.Success = false
		result.ErrorMessage = handlerErr.Error()
	}
	return result, nil
}

// populateCommandFields iterates through command struct fields and populates
// them from args.
func populateCommandFields(cmdVal reflect.Value, args map[string]any) error {
	if args == nil {
		return nil
	}
	cmdType := cmdVal.Type()
	for i := range cmdType.NumField() {
		fieldStruct := cmdType.Field(i)
		if !fieldStruct.IsExported() {
			continue
		}

		fieldName := fieldStruct.Name
		fieldVal := cmdVal.FieldByName(fieldName)
		if !fieldVal.IsValid() || !fieldVal.CanSet() {
			// This should never happen, but just in case.
			continue
		}

		argValRaw, ok := args[fieldName]
		if !ok {
			continue
		}
		argReflectVal := reflect.ValueOf(argValRaw)

		if err := setField(fieldName, fieldVal, argReflectVal); err != nil {
			return fmt.Errorf("field %s: %w", fieldName, err)
		}
	}
	return nil
}

// setField handles setting a single field value with type checking and
// conversion. It takes the target field value, the argument value (as
// [reflect.Value]), and the field name.
func setField(fieldName string, fieldVal, argVal reflect.Value) error {
	// Handle invalid arg value (e.g., from reflect.ValueOf(nil)).
	if !argVal.IsValid() {
		switch fieldVal.Kind() {
		case reflect.Interface, reflect.Pointer, reflect.Map, reflect.Slice, reflect.Chan, reflect.Func:
			if fieldVal.CanSet() {
				nilValue := reflect.Zero(fieldVal.Type())
				fieldVal.Set(nilValue)
				return nil
			}
		}
		return fmt.Errorf("cannot set field %s to nil", fieldName)
	}

	fieldType := fieldVal.Type()
	argType := argVal.Type()

	// Direct assignment.
	if argType.AssignableTo(fieldType) {
		fieldVal.Set(argVal)
		return nil
	}

	// Float64 to integer conversion.
	if argType.Kind() == reflect.Float64 && isIntKind(fieldType.Kind()) {
		return setIntFieldFromFloat(fieldVal, argVal)
	}

	// Slice assignment.
	if fieldType.Kind() == reflect.Slice && argType.Kind() == reflect.Slice {
		return convertAndSetSlice(fieldVal, argVal, fieldName)
	}

	// General conversion.
	if argType.ConvertibleTo(fieldType) {
		convertedVal := argVal.Convert(fieldType)
		fieldVal.Set(convertedVal)
		return nil
	}

	return fmt.Errorf("type mismatch: got %s, want %s", argType, fieldType)
}

// setIntFieldFromFloat handles the specific case of converting a float64 arg
// to an integer field.
func setIntFieldFromFloat(fieldVal, argVal reflect.Value) error {
	fieldType := fieldVal.Type()
	floatVal := argVal.Float()
	switch fieldType.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		intVal := int64(floatVal)
		if fieldVal.OverflowInt(intVal) {
			return fmt.Errorf("integer overflow converting %f", floatVal)
		}
		fieldVal.SetInt(intVal)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		if floatVal < 0 {
			return fmt.Errorf("cannot assign negative float %f to unsigned integer", floatVal)
		}
		uintVal := uint64(floatVal)
		if fieldVal.OverflowUint(uintVal) {
			return fmt.Errorf("unsigned integer overflow converting %f", floatVal)
		}
		fieldVal.SetUint(uintVal)
	default:
		return fmt.Errorf("unexpected target integer kind %s", fieldType.Kind())
	}
	return nil
}

// convertAndSetSlice handles converting and setting slice types. It iterates
// through the input slice (argSliceVal, likely []any) and converts each
// element to the target slice's element type (elemType).
func convertAndSetSlice(fieldVal, argSliceVal reflect.Value, fieldName string) error {
	elemType := fieldVal.Type().Elem()
	outSlice := reflect.MakeSlice(fieldVal.Type(), 0, argSliceVal.Len())
	for i := range argSliceVal.Len() {
		elemVal := argSliceVal.Index(i)
		if !elemVal.IsValid() {
			return fmt.Errorf("invalid nil element at index %d", i)
		} else if elemVal.Kind() == reflect.Interface {
			if elemVal.IsNil() {
				return fmt.Errorf("nil element at index %d", i)
			}
			elemVal = elemVal.Elem()
		}

		convertedElem, err := convertSliceElement(elemVal, elemType)
		if err != nil {
			return fmt.Errorf("element at index %d: %w", i, err)
		}
		outSlice = reflect.Append(outSlice, convertedElem)
	}
	fieldVal.Set(outSlice)
	return nil
}

// convertSliceElement handles conversion for a single slice element.
func convertSliceElement(elemVal reflect.Value, elemType reflect.Type) (reflect.Value, error) {
	elemConcreteType := elemVal.Type()

	// Direct assignment.
	if elemConcreteType.AssignableTo(elemType) {
		return elemVal, nil
	}

	// Float64 to integer conversion.
	if elemConcreteType.Kind() == reflect.Float64 && isIntKind(elemType.Kind()) {
		return convertFloatToSliceIntElement(elemVal, elemType)
	}

	// General conversion.
	if elemConcreteType.ConvertibleTo(elemType) {
		return elemVal.Convert(elemType), nil
	}

	return reflect.Value{}, fmt.Errorf("type mismatch: got %s, want %s", elemConcreteType, elemType)
}

// convertFloatToSliceIntElement handles float to int conversion for slice elements.
func convertFloatToSliceIntElement(elemVal reflect.Value, elemType reflect.Type) (reflect.Value, error) {
	floatElemVal := elemVal.Float()
	elemZero := reflect.Zero(elemType)
	switch elemType.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		intElemVal := int64(floatElemVal)
		if elemZero.OverflowInt(intElemVal) {
			return reflect.Value{}, fmt.Errorf("integer overflow converting %f", floatElemVal)
		}
		return reflect.ValueOf(intElemVal).Convert(elemType), nil
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		if floatElemVal < 0 {
			return reflect.Value{}, fmt.Errorf("cannot assign negative float %f to unsigned integer", floatElemVal)
		}
		uintElemVal := uint64(floatElemVal)
		if elemZero.OverflowUint(uintElemVal) {
			return reflect.Value{}, fmt.Errorf("unsigned integer overflow converting %f", floatElemVal)
		}
		return reflect.ValueOf(uintElemVal).Convert(elemType), nil
	}
	return reflect.Value{}, fmt.Errorf("unexpected integer kind %s for slice element", elemType.Kind())
}

// isIntKind reports whether the kind is one of the integer types.
func isIntKind(kind reflect.Kind) bool {
	switch kind {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		reflect.Uintptr:
		return true
	}
	return false
}
