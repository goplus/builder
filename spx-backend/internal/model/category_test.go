package model

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestGetLeafCategories(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		category := &Categories[0].Children[0] // "cartoon_characters"
		expected := []string{"boy", "girl", "animal_characters", "superhero", "villain", "sci_fi_characters"}
		result := GetLeafCategories(category)
		assert.Equal(t, expected, result)
	})

	t.Run("SingleLeafCategory", func(t *testing.T) {
		category := &Category{Value: "single_leaf"}
		expected := []string{"single_leaf"}
		result := GetLeafCategories(category)
		assert.Equal(t, expected, result)
	})

	t.Run("NilCategory", func(t *testing.T) {
		result := GetLeafCategories(nil)
		assert.Nil(t, result)
	})
}

func TestFindCategoryByValue(t *testing.T) {
	t.Run("FindExistingCategory", func(t *testing.T) {
		value := "cartoon_characters"
		expected := &Categories[0].Children[0]
		result := findCategoryByValue(value, Categories)
		assert.Equal(t, expected, result)
	})

	t.Run("CategoryNotFound", func(t *testing.T) {
		value := "non_existent_category"
		result := findCategoryByValue(value, Categories)
		assert.Nil(t, result)
	})
}

func TestFindLeafCategories(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		value := "realistic_characters"
		expected := []string{"teenager", "adult", "elderly", "student", "teacher", "professional_characters"}
		result := FindLeafCategories(value)
		assert.Equal(t, expected, result)
	})

	t.Run("SingleLeafCategory", func(t *testing.T) {
		value := "boy"
		expected := []string{"boy"}
		result := FindLeafCategories(value)
		assert.Equal(t, expected, result)
	})

	t.Run("CategoryNotFound", func(t *testing.T) {
		value := "non_existent_category"
		result := FindLeafCategories(value)
		assert.Nil(t, result)
	})
}
