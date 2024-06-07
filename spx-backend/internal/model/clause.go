package model

import (
	"fmt"
	"strings"
)

// FilterCondition represents a condition to filter rows.
type FilterCondition struct {
	Column    string // column name
	Operation string // "=", "<", "!=" ...
	Value     any    // value
}

// Expr returns the expression of the condition for use in a parameterized query.
func (cond *FilterCondition) Expr() string {
	return fmt.Sprintf("%s %s ?", cond.Column, cond.Operation)
}

// buildWhereClause builds a WHERE clause from the given conditions.
//
// The deleted items are filtered out by default.
func buildWhereClause(conds []FilterCondition) (string, []any) {
	var (
		exprs = make([]string, 0, len(conds)+1)
		args  = make([]any, 0, len(conds)+1)
	)
	for _, cond := range conds {
		exprs = append(exprs, cond.Expr())
		args = append(args, cond.Value)
	}

	// Filter out deleted items.
	exprs = append(exprs, "status != ?")
	args = append(args, StatusDeleted)

	whereClause := "WHERE " + strings.Join(exprs, " AND ")
	return whereClause, args
}

// OrderByCondition represents a condition to order rows.
type OrderByCondition struct {
	Column    string // column name
	Direction string // ASC or DESC
}

// Expr returns the expression of the condition for use in a parameterized query.
func (cond *OrderByCondition) Expr() string {
	return fmt.Sprintf("%s %s", cond.Column, cond.Direction)
}

// buildOrderByClause builds an ORDER BY clause from the given conditions.
//
// If no conditions are given, the default order is by ID in ascending order.
func buildOrderByClause(conds []OrderByCondition) string {
	if len(conds) == 0 {
		return "ORDER BY id ASC"
	}
	exprs := make([]string, 0, len(conds))
	for _, cond := range conds {
		exprs = append(exprs, cond.Expr())
	}
	orderByClause := "ORDER BY " + strings.Join(exprs, ", ")
	return orderByClause
}
