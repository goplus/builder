package model

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/utils/log"
)

var (
	// ErrNotExist indicates that resource not found, when trying to get resource with id
	ErrNotExist = errors.New("not found")
)

type FilterCondition struct {
	Column    string      // column name
	Operation string      //  "=", "<", "!=" ...
	Value     interface{} // value
}

type OrderByCondition struct {
	Column    string // column name
	Direction string // ASC or DESC
}

type ByPage[T any] struct {
	Total int `json:"total"`
	Data  []T `json:"data"`
}

type PaginationParams struct {
	Index int
	Size  int
}

// QueryByPage retrieves a paginated list of items from the database according to the provided filters and order conditions,
// excluding deleted items
func QueryByPage[T any](ctx context.Context, db *sql.DB, table string, paginaton PaginationParams, filters []FilterCondition, orderBy []OrderByCondition) (*ByPage[T], error) {
	logger := log.GetReqLogger(ctx)

	scan := tScan[T]()
	whereClause, args := buildWhereClause(filters)
	orderByClause := buildOrderByClause(orderBy)

	// TODO: transaction

	var total int
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s %s`, table, whereClause)
	argsForCount := append([]interface{}{}, args...) // TODO: remove?
	err := db.QueryRowContext(ctx, countQuery, argsForCount...).Scan(&total)
	if err != nil {
		logger.Printf("db.QueryRowContext failed: %v", err)
		return nil, err
	}

	offset := (paginaton.Index - 1) * paginaton.Size
	query := fmt.Sprintf("SELECT * FROM %s %s %s LIMIT ?, ?", table, whereClause, orderByClause)
	argsForQuery := append(args, offset, paginaton.Size)
	rows, err := db.QueryContext(ctx, query, argsForQuery...)
	if err != nil {
		// TODO: ErrNoRows?
		logger.Printf("db.QueryContext failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	data := make([]T, 0, paginaton.Size)
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			logger.Printf("scan failed: %v", err)
			return nil, err
		}
		data = append(data, item)
	}

	return &ByPage[T]{
		Total: total,
		Data:  data,
	}, nil
}

// GetById get resource with given id, returns `models.ErrNotExist` if it does not exist
func GetById[T any](ctx context.Context, db *sql.DB, table string, id string) (*T, error) {
	logger := log.GetReqLogger(ctx)
	wheres := []FilterCondition{{Column: "id", Operation: "=", Value: id}}
	results, err := querySelect[T](ctx, db, table, wheres)
	if err != nil {
		logger.Printf("querySelect failed: %v", err)
		return nil, err
	}
	if len(results) == 0 {
		logger.Printf("not exist")
		return nil, ErrNotExist
	}
	return &results[0], nil
}

// querySelect common select query, can customize the wheres, excluding deleted items
func querySelect[T any](ctx context.Context, db *sql.DB, table string, filters []FilterCondition) ([]T, error) {
	scan := tScan[T]()
	whereClause, args := buildWhereClause(filters)

	query := fmt.Sprintf("SELECT * FROM %s%s", table, whereClause)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []T
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, item)
	}

	return results, nil
}

// buildWhereClause Build a WHERE clause based on FilterCondition
func buildWhereClause(conditions []FilterCondition) (string, []interface{}) {
	var whereClauses []string
	var args []interface{}

	for _, condition := range conditions {
		whereClauses = append(whereClauses, fmt.Sprintf("%s %s ?", condition.Column, condition.Operation))
		args = append(args, condition.Value)
	}

	// select undelete result
	whereClauses = append(whereClauses, "status != ?")
	args = append(args, StatusDeleted)

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ") // TODO support "or"
	}

	return whereClause, args
}

// buildOrderByClause builds an ORDER BY clause based on OrderByCondition
func buildOrderByClause(orders []OrderByCondition) string {
	if len(orders) == 0 {
		return ""
	}

	var orderClauses []string
	for _, order := range orders {
		orderClauses = append(orderClauses, fmt.Sprintf("%s %s", order.Column, order.Direction))
	}

	return " ORDER BY " + strings.Join(orderClauses, ", ")
}

// tScan Creates and returns a scan that applies to any struct
func tScan[T any]() func(rows *sql.Rows) (T, error) {
	return func(rows *sql.Rows) (T, error) {
		var item T
		itemVal := reflect.ValueOf(&item).Elem()
		if itemVal.Kind() != reflect.Struct {
			return item, errors.New("item must be a struct")
		}

		columns, err := rows.Columns()
		if err != nil {
			return item, err
		}

		if len(columns) != itemVal.NumField() {
			return item, errors.New("number of columns does not match struct fields")
		}

		// It assumes that the order of columns same with the order of fields, while it's not relaiable
		// TODO: Get rid of the assumption
		columnPointers := make([]interface{}, len(columns))
		for i := 0; i < len(columns); i++ {
			field := itemVal.Field(i)
			if !field.CanSet() {
				return item, errors.New("cannot set struct field " + columns[i])
			}
			columnPointers[i] = field.Addr().Interface()
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return item, err
		}

		return item, nil
	}
}
