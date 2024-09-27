package modeltest

import (
	"context"
	"database/sql/driver"
	"reflect"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewMockDB creates a new [gorm.DB] instance with a mocked database connection.
func NewMockDB() (db *gorm.DB, dbMock sqlmock.Sqlmock, closeDB func() error, err error) {
	mockDB, dbMock, err := sqlmock.New()
	if err != nil {
		return nil, nil, nil, err
	}
	defer func() {
		if err != nil {
			mockDB.Close()
		}
	}()
	dialector := mysql.New(mysql.Config{Conn: mockDB, SkipInitializeWithVersion: true})
	db, err = gorm.Open(dialector, &gorm.Config{
		Logger:  logger.Discard,
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, nil, nil, err
	}
	return db, dbMock, mockDB.Close, nil
}

// ExtractDBColumns returns the database column names for a given GORM model.
func ExtractDBColumns(db *gorm.DB, model any) ([]string, error) {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		return nil, err
	}
	var columns []string
	for _, field := range stmt.Schema.Fields {
		if field.DBName == "" {
			continue
		}
		columns = append(columns, field.DBName)
	}
	return columns, nil
}

// NewDBRowsGenerator returns a function that generates database rows for given
// GORM model instances.
//
// The returned rows will be in the same order as the columns returned by the
// [ExtractModelColumns].
func NewDBRowsGenerator[T any](db *gorm.DB, model T) (func(modelInstances ...T) [][]driver.Value, error) {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		return nil, err
	}
	return func(modelInstances ...T) [][]driver.Value {
		var rows [][]driver.Value
		for _, mi := range modelInstances {
			var row []driver.Value
			reflectValue := reflect.ValueOf(mi)
			if reflectValue.Kind() == reflect.Ptr {
				reflectValue = reflectValue.Elem()
			}
			for _, field := range stmt.Schema.Fields {
				if field.DBName == "" {
					continue
				}
				value, _ := field.ValueOf(context.Background(), reflectValue)
				row = append(row, value)
			}
			rows = append(rows, row)
		}
		return rows
	}, nil
}

// ToDriverValueSlice converts a list of values to a list of driver values.
func ToDriverValueSlice(values ...any) []driver.Value {
	driverValues := make([]driver.Value, len(values))
	for i, v := range values {
		driverValues[i] = v
	}
	return driverValues
}
