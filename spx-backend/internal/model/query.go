package model

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Query queries a table.
func Query[T any](ctx context.Context, db *sql.DB, table string, where []FilterCondition, orderBy []OrderByCondition) ([]T, error) {
	logger := log.GetReqLogger(ctx)

	whereClause, whereArgs := buildWhereClause(where)
	orderByClause := buildOrderByClause(orderBy)

	query := fmt.Sprintf("SELECT * FROM %s %s %s", table, whereClause, orderByClause)
	rows, err := db.QueryContext(ctx, query, whereArgs...)
	if err != nil {
		logger.Printf("db.QueryContext failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var items []T
	for rows.Next() {
		item, err := rowsScan[T](rows)
		if err != nil {
			logger.Printf("rowsScan failed: %v", err)
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

// Pagination is the pagination information.
type Pagination struct {
	Index int
	Size  int
}

// ByPage is a generic struct for paginated data.
type ByPage[T any] struct {
	Total int `json:"total"`
	Data  []T `json:"data"`
}

// QueryByPage queries a table by page.
func QueryByPage[T any](ctx context.Context, db *sql.DB, table string, paginaton Pagination, where []FilterCondition, orderBy []OrderByCondition) (*ByPage[T], error) {
	logger := log.GetReqLogger(ctx)

	whereClause, whereArgs := buildWhereClause(where)
	orderByClause := buildOrderByClause(orderBy)

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s %s", table, whereClause)
	if err := db.QueryRowContext(ctx, countQuery, whereArgs...).Scan(&total); err != nil {
		logger.Printf("db.QueryRowContext failed: %v", err)
		return nil, err
	}

	offset := (paginaton.Index - 1) * paginaton.Size
	query := fmt.Sprintf("SELECT * FROM %s %s %s LIMIT ?, ?", table, whereClause, orderByClause)
	args := append(whereArgs, offset, paginaton.Size)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		logger.Printf("db.QueryContext failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	data := make([]T, 0, paginaton.Size)
	for rows.Next() {
		item, err := rowsScan[T](rows)
		if err != nil {
			logger.Printf("rowsScan failed: %v", err)
			return nil, err
		}
		data = append(data, item)
	}

	return &ByPage[T]{
		Total: total,
		Data:  data,
	}, nil
}

// QueryFirst queries a table and returns the first result. Returns [ErrNotExist] if it does not exist.
func QueryFirst[T any](ctx context.Context, db *sql.DB, table string, where []FilterCondition, orderBy []OrderByCondition) (*T, error) {
	logger := log.GetReqLogger(ctx)

	whereClause, whereArgs := buildWhereClause(where)
	orderByClause := buildOrderByClause(orderBy)

	query := fmt.Sprintf("SELECT * FROM %s %s %s LIMIT 1", table, whereClause, orderByClause)
	rows, err := db.QueryContext(ctx, query, whereArgs...)
	if err != nil {
		logger.Printf("db.QueryContext failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotExist
	}
	item, err := rowsScan[T](rows)
	if err != nil {
		logger.Printf("rowsScan failed: %v", err)
		return nil, err
	}
	return &item, nil
}

// QueryByID queries an item by ID. Returns [ErrNotExist] if it does not exist.
func QueryByID[T any](ctx context.Context, db *sql.DB, table string, id string) (*T, error) {
	where := []FilterCondition{{Column: "id", Operation: "=", Value: id}}
	return QueryFirst[T](ctx, db, table, where, nil)
}

// Create creates an item.
func Create[T any](ctx context.Context, db *sql.DB, table string, item *T) (*T, error) {
	logger := log.GetReqLogger(ctx)

	itemValue, dbFields, err := reflectModelItem(item)
	if err != nil {
		logger.Printf("failed to reflect model item: %v", err)
		return nil, err
	}
	if len(dbFields) == 0 {
		return nil, errors.New("no db fields found")
	}

	now := time.Now().UTC()
	columns := make([]string, 0, len(dbFields))
	values := make([]any, 0, len(dbFields))
	for dbTag, dbField := range dbFields {
		var value any
		switch dbTag {
		case "id":
			// Skip id column since it's supposed to be auto-generated.
			continue
		case "c_time", "u_time":
			value = now
		case "status":
			value = StatusNormal
		default:
			value = itemValue.FieldByIndex(dbField.Index).Interface()
		}
		columns = append(columns, dbTag)
		values = append(values, value)
	}

	joinedColumns := strings.Join(columns, ",")
	joinedPlaceholders := strings.Repeat(",?", len(columns))[1:]
	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, joinedColumns, joinedPlaceholders)

	result, err := db.ExecContext(ctx, query, values...)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		logger.Printf("failed to get last insert id: %v", err)
		return nil, err
	}
	return QueryByID[T](ctx, db, table, strconv.FormatInt(id, 10))
}

// CreateWithoutSkip created item in db without skip id, c_time, u_time, status.
func CreateWithoutSkip[T any](ctx context.Context, db *sql.DB, table string, item *T) error {
	logger := log.GetReqLogger(ctx)

	itemValue, dbFields, err := reflectModelItem(item)
	if err != nil {
		logger.Printf("failed to reflect model item: %v", err)
		return err
	}
	if len(dbFields) == 0 {
		return errors.New("no db fields found")
	}

	columns := make([]string, 0, len(dbFields))
	values := make([]any, 0, len(dbFields))
	for dbTag, dbField := range dbFields {
		var value any
		value = itemValue.FieldByIndex(dbField.Index).Interface()
		columns = append(columns, dbTag)
		values = append(values, value)
	}

	joinedColumns := strings.Join(columns, ",")
	joinedPlaceholders := strings.Repeat(",?", len(columns))[1:]
	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, joinedColumns, joinedPlaceholders)

	_, err = db.ExecContext(ctx, query, values...)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return err
	}

	return nil
}

// UpdateByID updates an item by ID.
func UpdateByID[T any](ctx context.Context, db *sql.DB, table string, id string, item *T, columns ...string) error {
	logger := log.GetReqLogger(ctx)

	itemValue, dbFields, err := reflectModelItem(item)
	if err != nil {
		logger.Printf("failed to reflect model item: %v", err)
		return err
	}

	exprs := make([]string, 1, len(columns)+1)
	exprs[0] = "u_time = ?"
	args := make([]any, 1, len(columns)+1)
	args[0] = time.Now().UTC()
	for _, col := range columns {
		dbField, ok := dbFields[col]
		if !ok {
			return fmt.Errorf("column %s does not exist in struct", col)
		}
		switch col {
		case "id", "c_time", "u_time":
			return fmt.Errorf("column %s is read-only", col)
		}
		exprs = append(exprs, fmt.Sprintf("%s = ?", col))
		args = append(args, itemValue.FieldByIndex(dbField.Index).Interface())
	}
	args = append(args, id)

	query := fmt.Sprintf("UPDATE %s SET %s WHERE id = ?", table, strings.Join(exprs, ", "))
	result, err := db.ExecContext(ctx, query, args...)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Printf("result.RowsAffected failed: %v", err)
		return err
	} else if rowsAffected == 0 {
		return ErrNotExist
	}
	return nil
}

// UpdateByIDWithoutUTime update an item by ID, and skip auto update uTime.
func UpdateByIDWithoutUTime[T any](ctx context.Context, db *sql.DB, table string, id string, item *T, columns ...string) error {
	logger := log.GetReqLogger(ctx)

	itemValue, dbFields, err := reflectModelItem(item)
	if err != nil {
		logger.Printf("failed to reflect model item: %v", err)
		return err
	}

	exprs := make([]string, 0, len(columns))
	args := make([]any, 0, len(columns))
	for _, col := range columns {
		dbField, ok := dbFields[col]
		if !ok {
			return fmt.Errorf("column %s does not exist in struct", col)
		}
		switch col {
		case "id", "c_time":
			return fmt.Errorf("column %s is read-only", col)
		}
		exprs = append(exprs, fmt.Sprintf("%s = ?", col))
		args = append(args, itemValue.FieldByIndex(dbField.Index).Interface())
	}
	args = append(args, id)

	query := fmt.Sprintf("UPDATE %s SET %s WHERE id = ? ", table, strings.Join(exprs, ", "))
	result, err := db.ExecContext(ctx, query, args...)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Printf("result.RowsAffected failed: %v", err)
		return err
	} else if rowsAffected == 0 {
		return ErrNotExist
	}
	return nil
}

// ExistsByID checks if an item with the specified ID exists in the table.
func ExistsByID(ctx context.Context, db *sql.DB, table string, id string) (bool, error) {
	logger := log.GetReqLogger(ctx)

	query := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE id = ? AND status != ?", table)
	var count int
	err := db.QueryRowContext(ctx, query, id, StatusDeleted).Scan(&count)
	if err != nil {
		logger.Printf("db.QueryRowContext failed: %v", err)
		return false, err
	}

	return count > 0, nil
}
