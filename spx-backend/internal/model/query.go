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

	whereClause, whereArgs := buildWhereClause(where, "", nil)
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

// QueryByPage queries a table or custom query by page,mainly use for asset table.
func QueryByPage[T any](
	ctx context.Context,
	db *sql.DB,
	tableOrQuery string,
	pagination Pagination,
	where []FilterCondition,
	orderBy []OrderByCondition,
	isCustomQuery bool, // New parameter to indicate if tableOrQuery is a custom query
	categoryList []any, // use OR to query category
) (*ByPage[T], error) {
	logger := log.GetReqLogger(ctx)

	if categoryList == nil {
		categoryList = []any{}
	}
	orClause, orArgs := buildOrCondition("category", categoryList)
	logger.Printf("orClause: %s, orArgs: %v", orClause, orArgs)
	// Build the WHERE and ORDER BY clauses
	whereClause, whereArgs := buildWhereClause(where, orClause, orArgs)
	orderByClause := buildOrderByClause(orderBy)

	var countQuery, paginatedQuery string

	if isCustomQuery {
		// Use custom query logic
		countQuery = fmt.Sprintf("SELECT COUNT(*) FROM (%s %s) AS subquery", tableOrQuery, whereClause)
		paginatedQuery = fmt.Sprintf("%s %s %s LIMIT ?, ?", tableOrQuery, whereClause, orderByClause)
	} else {
		// Use simple table logic
		countQuery = fmt.Sprintf("SELECT COUNT(*) FROM %s %s", tableOrQuery, whereClause)
		paginatedQuery = fmt.Sprintf("SELECT * FROM %s %s %s LIMIT ?, ?", tableOrQuery, whereClause, orderByClause)
	}

	// Execute count query
	var total int
	if err := db.QueryRowContext(ctx, countQuery, whereArgs...).Scan(&total); err != nil {
		logger.Printf("db.QueryRowContext failed: %v", err)
		return nil, err
	}

	// Calculate offset for pagination
	offset := (pagination.Index - 1) * pagination.Size
	args := append(whereArgs, offset, pagination.Size)
	logger.Printf("paginatedQuery: %s, args: %v", paginatedQuery, args)
	// Execute paginated query
	rows, err := db.QueryContext(ctx, paginatedQuery, args...)
	if err != nil {
		logger.Printf("db.QueryContext failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	// Scan the rows into the data slice
	data := make([]T, 0, pagination.Size)
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

	whereClause, whereArgs := buildWhereClause(where, "", nil)
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

// UpdateByID updates an item by ID.
func UpdateByID[T any](ctx context.Context, db *sql.DB, table string, id string, item *T, columns ...string) error {
	logger := log.GetReqLogger(ctx)

	itemValue, dbFields, err := reflectModelItem(item)
	if err != nil {
		logger.Printf("failed to reflect model item: %v", err)
		return err
	}

	exprs := make([]string, 1, len(columns)+1)
	exprs[0] = "u_time=?"
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
		exprs = append(exprs, fmt.Sprintf("%s=?", col))
		args = append(args, itemValue.FieldByIndex(dbField.Index).Interface())
	}
	args = append(args, id)

	query := fmt.Sprintf("UPDATE %s SET %s WHERE id=?", table, strings.Join(exprs, ","))
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

// getLikedInfo gets the liked info of assets.
func getLikedInfo(ctx context.Context, db *sql.DB, assetIDs []string) (map[string]struct {
	IsLiked   bool
	LikeCount int
}, error) {
	logger := log.GetReqLogger(ctx)

	// Convert assetIDs to slices of interface type
	args := make([]interface{}, len(assetIDs))
	for i, id := range assetIDs {
		args[i] = id
	}

	// avoid array of length 0
	if len(args) == 0 {
		return nil, nil
	}

	query := fmt.Sprintf(`
        SELECT asset_id, COUNT(*) as count
        FROM user_asset
        WHERE asset_id IN (?%s) AND relation_type = 'liked'
        GROUP BY asset_id
    `, strings.Repeat(",?", len(args)-1))

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		logger.Printf("failed to execute query: %v", err)
		return nil, err
	}
	defer rows.Close()

	likedMap := make(map[string]struct {
		IsLiked   bool
		LikeCount int
	})

	for rows.Next() {
		var assetID string
		var count int
		if err := rows.Scan(&assetID, &count); err != nil {
			logger.Printf("failed to scan row: %v", err)
			return nil, err
		}
		likedMap[assetID] = struct {
			IsLiked   bool
			LikeCount int
		}{
			IsLiked:   true,
			LikeCount: count,
		}
	}

	if err := rows.Err(); err != nil {
		logger.Printf("rows iteration error: %v", err)
		return nil, err
	}

	return likedMap, nil
}
