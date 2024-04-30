package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
)

func TestAddProjectParamsValidate(t *testing.T) {

	t.Run("validate name", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "bar",
			Owner:    "foo",
			IsPublic: model.Personal,
			Files:    model.FileCollection{},
		}

		var (
			ok  bool
			msg string
		)
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Name = ""
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)

		params.Name = " foo"
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)

		params.Name = "foo-bar"
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Name = "foo_bar"
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Name = "foo-1"
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Name = "foo 1"
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)

		params.Name = "中文"
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)

		params.Name = "123"
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Name = ""
		for i := 0; i < 100; i++ {
			params.Name = params.Name + "0"
		}
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)
		params.Name = params.Name + "0"
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)
	})

	t.Run("validate owner", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "bar",
			Owner:    "foo",
			IsPublic: model.Personal,
			Files:    model.FileCollection{},
		}

		var (
			ok  bool
			msg string
		)
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.Owner = ""
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)
	})

	t.Run("validate isPublic", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "bar",
			Owner:    "foo",
			IsPublic: model.Personal,
			Files:    model.FileCollection{},
		}

		var (
			ok  bool
			msg string
		)
		ok, msg = params.Validate()
		assert.Equal(t, true, ok)
		assert.Equal(t, "", msg)

		params.IsPublic = model.IsPublic(2)
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)

		params.IsPublic = model.IsPublic(3)
		ok, msg = params.Validate()
		assert.Equal(t, false, ok)
		assert.NotEqual(t, "", msg)
	})
}
