package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFilterConditionExpr(t *testing.T) {
	t.Run("Equal", func(t *testing.T) {
		cond := FilterCondition{"a", "=", 1}
		assert.Equal(t, "a = ?", cond.Expr())
	})

	t.Run("Empty", func(t *testing.T) {
		cond := FilterCondition{}
		assert.Equal(t, "  ?", cond.Expr())
	})
}

func TestBuildWhereClause(t *testing.T) {
	t.Run("Nil", func(t *testing.T) {
		clause, args := buildWhereClause(nil)
		assert.Equal(t, "WHERE status != ?", clause)
		assert.Equal(t, []any{StatusDeleted}, args)
	})

	t.Run("OneCondition", func(t *testing.T) {
		clause, args := buildWhereClause([]FilterCondition{
			{"a", "=", 1},
		})
		assert.Equal(t, "WHERE a = ? AND status != ?", clause)
		assert.Equal(t, []any{1, StatusDeleted}, args)
	})

	t.Run("MultipleConditions", func(t *testing.T) {
		clause, args := buildWhereClause([]FilterCondition{
			{"a", "=", 1},
			{"b", "!=", 2},
		})
		assert.Equal(t, "WHERE a = ? AND b != ? AND status != ?", clause)
		assert.Equal(t, []any{1, 2, StatusDeleted}, args)
	})
}

func TestOrderByConditionExpr(t *testing.T) {
	t.Run("ASC", func(t *testing.T) {
		cond := OrderByCondition{"a", "ASC"}
		assert.Equal(t, "a ASC", cond.Expr())
	})

	t.Run("Empty", func(t *testing.T) {
		cond := OrderByCondition{}
		assert.Equal(t, " ", cond.Expr())
	})
}

func TestBuildOrderByClause(t *testing.T) {
	t.Run("Nil", func(t *testing.T) {
		clause := buildOrderByClause(nil)
		assert.Equal(t, "ORDER BY id ASC", clause)
	})

	t.Run("OneCondition", func(t *testing.T) {
		clause := buildOrderByClause([]OrderByCondition{
			{"a", "ASC"},
		})
		assert.Equal(t, "ORDER BY a ASC", clause)
	})

	t.Run("MultipleConditions", func(t *testing.T) {
		clause := buildOrderByClause([]OrderByCondition{
			{"a", "ASC"},
			{"b", "DESC"},
		})
		assert.Equal(t, "ORDER BY a ASC, b DESC", clause)
	})
}
