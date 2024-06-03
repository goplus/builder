package model

import (
	"context"
	"database/sql"
	"fmt"

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
