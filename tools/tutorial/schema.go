package tutorial

import (
	"fmt"
	"reflect"
	"strings"
)

// deriveSchema 从课程传给 GenerateJSON 的值派生出 JSON Schema。
//
// 前提（做过验证实验确认）：XGo 把课程代码编译成普通的 package main，作者定义的
// struct 就是普通的 main 包类型，因此 reflect 的行为与面对原生类型完全一致——
// 字段枚举、tag 读取、encoding/json 的回填可设置性都正常。
//
// 这里刻意只做一个"足够用"的 schema：课程判定要的是让 LLM 输出固定形状的 JSON，
// 不是完整的 JSON Schema 规范实现。
func deriveSchema(result any) (map[string]any, error) {
	if result == nil {
		return nil, fmt.Errorf("generateJSON: result must be a non-nil pointer to a struct")
	}
	value := reflect.ValueOf(result)
	// 必须是指针：否则解码回填改的是副本，课程读到的还是零值。
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

// schemaOfStruct 把结构体描述成一个 object schema。
// 所有字段都进 required：课程判定通常要读全部字段，让 LLM 少省略一个是一个。
//
// visiting 记录当前展开路径上的结构体类型。JSON Schema 要靠 $ref 才能表达递归结构，
// 我们不生成 $ref，因此自引用类型（如 type Step struct { Next *Step }）只能拒绝——
// 不拦的话这里会无限递归下去，在 WASM 里表现为解释器爆栈，而不是一条能看懂的错误。
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
			// 未带 json 标签的匿名嵌入字段：encoding/json 会把内层导出字段**提升**
			// 到外层对象，而这里若生成一个嵌套属性，宿主按 schema 生成的结果就
			// 填不回去（回填走提升规则，读不到嵌套键）。完整复刻提升与冲突规则
			// 不值得，明确拒绝：作者给字段起个名字或加 json 标签即可。
			return nil, fmt.Errorf(
				"generateJSON: %s embeds %s without a json tag; embedded fields are not supported — use a named field or give it an explicit json name",
				t, field.Type)
		}
		if field.PkgPath != "" {
			// 未导出字段：encoding/json 既读不到也填不进，放进 schema 只会误导 LLM。
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
		// 一个字段都没有可用的——最常见的原因是作者按 XGo 的习惯把字段名写成了小写，
		// 也可能是仅有的导出字段都被 json:"-" 排除了。这种情况下生成的值永远填不回去，
		// 课程会读到全零值却毫无提示，所以必须报错，而不是回一个空 schema 让它悄悄失败。
		return nil, fmt.Errorf("generateJSON: %s has no serializable exported fields to fill", t)
	}
	return map[string]any{
		"type":       "object",
		"properties": properties,
		"required":   required,
	}, nil
}

// schemaOfType 把一个字段类型映射成 schema 片段。
// 支持的范围覆盖课程判定会用到的形状：标量、切片/数组、嵌套结构体、以及指针（透传到元素类型）。
// 其余类型（map、interface、chan 等）直接报错，好过生成一个 LLM 无从遵守的 schema。
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

// hasJSONName 判断字段是否带显式的 json 名字标签。
// 带名字的匿名字段被 encoding/json 当普通命名字段处理（不做提升），可以正常支持。
func hasJSONName(field reflect.StructField) bool {
	name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
	return name != "" && name != "-"
}

// jsonFieldName 按 encoding/json 的规则决定字段在 JSON 里的名字。
// 与 encoding/json 保持一致很重要：schema 里的键名必须和实际解码时用的键名相同，
// 否则 LLM 按 schema 输出的字段会填不进去。
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
