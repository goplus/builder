package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFmtCodeParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &FmtCodeParams{
			Body: "package main\n\nfunc main() {}\n",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyBody", func(t *testing.T) {
		params := &FmtCodeParams{}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing body", msg)
	})
}

func TestControllerFmtCode(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		formattedCode, err := ctrl.FmtCode(context.Background(), &FmtCodeParams{
			Body: "package main\n\nfunc main() {}\n",
		})
		require.NoError(t, err)
		require.NotNil(t, formattedCode)
		require.NotEmpty(t, formattedCode.Body)
		require.Nil(t, formattedCode.Error)
		assert.Equal(t, "\n", formattedCode.Body)
	})

	t.Run("FormatError", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		formattedCode, err := ctrl.FmtCode(context.Background(), &FmtCodeParams{
			Body: "package main\n\nfunc main() {",
		})
		require.NoError(t, err)
		require.NotNil(t, formattedCode)
		require.Empty(t, formattedCode.Body)
		require.NotNil(t, formattedCode.Error)
		assert.Equal(t, 3, formattedCode.Error.Line)
		assert.Equal(t, 15, formattedCode.Error.Column)
		assert.Equal(t, "expected '}', found 'EOF'", formattedCode.Error.Msg)
	})

	t.Run("InvalidBody", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		closeDB()

		_, err := ctrl.FmtCode(context.Background(), &FmtCodeParams{
			Body: "-- prog.go --\n-- prog.go --",
		})
		require.Error(t, err)
		assert.EqualError(t, err, `duplicate file name "prog.go"`)
	})
}

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
