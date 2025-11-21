package main

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewReqIDMiddleware(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		middleware := NewReqIDMiddleware()
		require.NotNil(t, middleware)

		req := httptest.NewRequest("", "/", nil)
		rec := httptest.NewRecorder()
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "foobar")
		})
		middleware(next).ServeHTTP(rec, req)
		resp := rec.Result()

		assert.NotEmpty(t, resp.Header.Get("X-Reqid"))
		respBody, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, "foobar", string(respBody))
	})
}
