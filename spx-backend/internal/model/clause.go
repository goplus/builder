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

// buildWhereClause builds a WHERE clause from the given AND conditions and optional OR conditions.
// buildWhereClause builds a WHERE clause from the given AND conditions and optional OR conditions.
//
// The deleted items are filtered out by default.
func buildWhereClause(andConds []FilterCondition, orClause string, orArgs []any) (string, []any) {
func buildWhereClause(andConds []FilterCondition, orClause string, orArgs []any) (string, []any) {
	var (
		exprs = make([]string, 0, len(andConds)+2) // len + 2 to account for OR condition and status check
		args  = make([]any, 0, len(andConds)+2)
		exprs = make([]string, 0, len(andConds)+2) // len + 2 to account for OR condition and status check
		args  = make([]any, 0, len(andConds)+2)
	)

	// Process AND conditions
	for _, cond := range andConds {

	// Process AND conditions
	for _, cond := range andConds {
		exprs = append(exprs, cond.Expr())
		args = append(args, cond.Value)
	}

	// Add the OR condition
	if orClause != "" {
		exprs = append(exprs, orClause)
		args = append(args, orArgs...)
	}

	// Filter out deleted items
	exprs = append(exprs, "status != ?")
	args = append(args, StatusDeleted)

	whereClause := "WHERE " + strings.Join(exprs, " AND ")
	fmt.Printf("whereClause: %s\n", whereClause)
	return whereClause, args
}

// buildOrCondition builds an OR condition for a list of categories.
func buildOrCondition(column string, values []any) (string, []any) {
	if len(values) == 0 {
		return "", nil
	}

	var (
		exprs = make([]string, 0, len(values))
		args  = make([]any, 0, len(values))
	)

	for _, value := range values {
		exprs = append(exprs, fmt.Sprintf("%s = ?", column))
		args = append(args, value)
	}

	// Combine all expressions with OR
	orClause := "(" + strings.Join(exprs, " OR ") + ")"
	return orClause, args
}

// buildOrCondition builds an OR condition for a list of categories.
func buildOrCondition(column string, values []any) (string, []any) {
	if len(values) == 0 {
		return "", nil
	}

	var (
		exprs = make([]string, 0, len(values))
		args  = make([]any, 0, len(values))
	)

	for _, value := range values {
		exprs = append(exprs, fmt.Sprintf("%s = ?", column))
		args = append(args, value)
	}

	// Combine all expressions with OR
	orClause := "(" + strings.Join(exprs, " OR ") + ")"
	return orClause, args
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
