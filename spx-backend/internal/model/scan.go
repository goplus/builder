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

// reflectModelItem returns the [reflect.Value] and database fields for a model item.
func reflectModelItem(item any) (itemValue reflect.Value, dbFields map[string]reflect.StructField, err error) {
	itemValue = reflect.ValueOf(item).Elem()
	itemType := itemValue.Type()
	if itemType.Kind() != reflect.Struct {
		return reflect.Value{}, nil, errors.New("item must be a struct")
	}
	dbFields, ok := dbFieldsForRegisteredModels[itemType]
	if !ok {
		dbFields = reflectModelDBFields(itemType)
	}
	return
}

// rowsScan scans a single SQL row into a generic struct with automatic field mapping.
func rowsScan[T any](rows *sql.Rows) (T, error) {
	var item T
	itemValue, dbFields, err := reflectModelItem(&item)
	if err != nil {
		return item, err
	}

	columns, err := rows.Columns()
	if err != nil {
		return item, err
	}
	dests := make([]any, len(columns))
	for i, col := range columns {
		dbField, ok := dbFields[col]
		if !ok {
			return item, fmt.Errorf("column %s does not exist in struct", col)
		}
		dests[i] = itemValue.FieldByName(dbField.Name).Addr().Interface()
	}
	return item, rows.Scan(dests...)
}
