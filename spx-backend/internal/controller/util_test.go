package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestControllerGetUpInfo(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		upInfo, err := ctrl.GetUpInfo(context.Background())
		require.NoError(t, err)
		require.NotNil(t, upInfo)
		assert.NotEmpty(t, upInfo.Token)
		assert.NotZero(t, upInfo.Expires)
		assert.NotZero(t, upInfo.MaxSize)
		assert.Equal(t, ctrl.kodo.bucket, upInfo.Bucket)
		assert.Equal(t, ctrl.kodo.bucketRegion, upInfo.Region)
	})
}

func TestMakeFileURLsParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &MakeFileURLsParams{
			Objects: []string{"kodo://builder/foo/bar"},
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}

func TestControllerMakeFileURLs(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		fileURLs, err := ctrl.MakeFileURLs(context.Background(), &MakeFileURLsParams{
			Objects: []string{"kodo://builder/foo/bar"},
		})
		require.NoError(t, err)
		require.NotNil(t, fileURLs)
		assert.Len(t, fileURLs.ObjectURLs, 1)
	})

	t.Run("EmptyObjects", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		fileURLs, err := ctrl.MakeFileURLs(context.Background(), &MakeFileURLsParams{})
		require.NoError(t, err)
		require.NotNil(t, fileURLs)
		assert.Empty(t, fileURLs.ObjectURLs)
	})

	t.Run("InvalidObject", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		_, err := ctrl.MakeFileURLs(context.Background(), &MakeFileURLsParams{
			Objects: []string{"://invalid"},
		})
		require.Error(t, err)
		assert.EqualError(t, err, `parse "://invalid": missing protocol scheme`)
	})

	t.Run("UnrecognizedObject", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		_, err := ctrl.MakeFileURLs(context.Background(), &MakeFileURLsParams{
			Objects: []string{"not-kodo://builder/foo/bar"},
		})
		require.Error(t, err)
		assert.EqualError(t, err, "unrecognized object: not-kodo://builder/foo/bar")
	})

	t.Run("URLJoinPathError", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()
		ctrl.kodo.baseUrl = "://invalid"

		_, err := ctrl.MakeFileURLs(context.Background(), &MakeFileURLsParams{
			Objects: []string{"kodo://builder/foo/bar"},
		})
		require.Error(t, err)
		assert.EqualError(t, err, `parse "://invalid": missing protocol scheme`)
	})
}
