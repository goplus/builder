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
		clause, args := buildWhereClause(nil, "", nil)
		assert.Equal(t, "WHERE status != ?", clause)
		assert.Equal(t, []any{StatusDeleted}, args)
	})

	t.Run("OneCondition", func(t *testing.T) {
		clause, args := buildWhereClause([]FilterCondition{
			{"a", "=", 1},
		}, "", nil)
		assert.Equal(t, "WHERE a = ? AND status != ?", clause)
		assert.Equal(t, []any{1, StatusDeleted}, args)
	})

	t.Run("MultipleConditions", func(t *testing.T) {
		clause, args := buildWhereClause([]FilterCondition{
			{"a", "=", 1},
			{"b", "!=", 2},
		}, "", nil)
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

func TestBuildOrCondition(t *testing.T) {
	t.Run("EmptyValues", func(t *testing.T) {
		// 当输入为空时，应该返回空的条件和nil的参数列表
		column := "status"
		values := []any{}

		expectedClause := ""
		expectedArgs := []any(nil)

		clause, args := buildOrCondition(column, values)

		assert.Equal(t, expectedClause, clause)
		assert.Equal(t, expectedArgs, args)
	})

	t.Run("SingleValue", func(t *testing.T) {
		// 当只有一个值时，应该返回单个条件表达式
		column := "status"
		values := []any{"active"}

		expectedClause := "(status = ?)"
		expectedArgs := []any{"active"}

		clause, args := buildOrCondition(column, values)

		assert.Equal(t, expectedClause, clause)
		assert.Equal(t, expectedArgs, args)
	})

	t.Run("MultipleValues", func(t *testing.T) {
		// 当有多个值时，应该返回多个用 OR 连接的条件表达式
		column := "status"
		values := []any{"active", "inactive", "pending"}

		expectedClause := "(status = ? OR status = ? OR status = ?)"
		expectedArgs := []any{"active", "inactive", "pending"}

		clause, args := buildOrCondition(column, values)

		assert.Equal(t, expectedClause, clause)
		assert.Equal(t, expectedArgs, args)
	})

	t.Run("NumericValues", func(t *testing.T) {
		// 测试处理数字类型的值
		column := "id"
		values := []any{1, 2, 3}

		expectedClause := "(id = ? OR id = ? OR id = ?)"
		expectedArgs := []any{1, 2, 3}

		clause, args := buildOrCondition(column, values)

		assert.Equal(t, expectedClause, clause)
		assert.Equal(t, expectedArgs, args)
	})

	t.Run("MixedValues", func(t *testing.T) {
		// 测试处理混合类型的值
		column := "attribute"
		values := []any{"admin", 42, true}

		expectedClause := "(attribute = ? OR attribute = ? OR attribute = ?)"
		expectedArgs := []any{"admin", 42, true}

		clause, args := buildOrCondition(column, values)

		assert.Equal(t, expectedClause, clause)
		assert.Equal(t, expectedArgs, args)
	})
}
