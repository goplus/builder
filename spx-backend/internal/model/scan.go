package model

import (
	"database/sql"
	"errors"
	"fmt"
	"reflect"
)

// dbFieldsForRegisteredModels is a map of registered models to their database fields.
var dbFieldsForRegisteredModels = map[reflect.Type]map[string]reflect.StructField{
	reflect.TypeOf(Project{}): reflectModelDBFields(reflect.TypeOf(Project{})),
	reflect.TypeOf(Asset{}):   reflectModelDBFields(reflect.TypeOf(Asset{})),
}

// reflectModelDBFields returns a map of database columns to struct fields based
// on the "db" tag.
//
// The "db" tag specifies the column name in the database and is required for
// each field that should be scanned. Fields without the "db" tag or unexported
// fields are ignored.
func reflectModelDBFields(t reflect.Type) map[string]reflect.StructField {
	fields := reflect.VisibleFields(t)
	m := make(map[string]reflect.StructField, len(fields))
	for _, field := range fields {
		if !field.IsExported() {
			continue
		}
		dbTag, ok := field.Tag.Lookup("db")
		if !ok {
			continue
		}
		m[dbTag] = field
	}
	return m
}

// rowsScan scans a single SQL row into a generic struct with automatic field mapping.
func rowsScan[T any](rows *sql.Rows) (T, error) {
	var item T
	itemValue := reflect.ValueOf(&item).Elem()
	itemType := itemValue.Type()
	if itemType.Kind() != reflect.Struct {
		return item, errors.New("item must be a struct")
	}
	fields, ok := dbFieldsForRegisteredModels[itemType]
	if !ok {
		// This occurs when the model is not registered, such as with an
		// anonymous struct used in a complex query.
		fields = reflectModelDBFields(itemType)
	}

	columns, err := rows.Columns()
	if err != nil {
		return item, err
	}
	dests := make([]any, len(columns))
	for i, col := range columns {
		field, ok := fields[col]
		if !ok {
			return item, fmt.Errorf("column %s does not exist in struct", col)
		}
		dests[i] = itemValue.FieldByName(field.Name).Addr().Interface()
	}
	return item, rows.Scan(dests...)
}
