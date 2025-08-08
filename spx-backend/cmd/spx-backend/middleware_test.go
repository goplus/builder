package main

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getsentry/sentry-go"
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

func TestNewCORSMiddleware(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		allowedOrigin := "https://example.com"
		t.Setenv("ALLOWED_ORIGIN", allowedOrigin)
		middleware := NewCORSMiddleware()
		require.NotNil(t, middleware)

		req := httptest.NewRequest("", "/", nil)
		rec := httptest.NewRecorder()
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "foobar")
		})
		middleware(next).ServeHTTP(rec, req)
		resp := rec.Result()

		assert.Equal(t, allowedOrigin, resp.Header.Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "OPTIONS, GET, HEAD, POST, PUT, DELETE", resp.Header.Get("Access-Control-Allow-Methods"))
		assert.Equal(t, fmt.Sprintf("Accept, Accept-Encoding, Content-Type, Content-Length, Authorization, X-CSRF-Token, %s, %s", sentry.SentryTraceHeader, sentry.SentryBaggageHeader), resp.Header.Get("Access-Control-Allow-Headers"))
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		respBody, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, "foobar", string(respBody))
	})

	t.Run("NoAllowedOrigin", func(t *testing.T) {
		t.Setenv("ALLOWED_ORIGIN", "")
		middleware := NewCORSMiddleware()
		require.NotNil(t, middleware)

		req := httptest.NewRequest("", "/", nil)
		rec := httptest.NewRecorder()
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
		middleware(next).ServeHTTP(rec, req)
		resp := rec.Result()

		assert.Equal(t, "*", resp.Header.Get("Access-Control-Allow-Origin"))
	})

	t.Run("PreflightRequest", func(t *testing.T) {
		middleware := NewCORSMiddleware()
		require.NotNil(t, middleware)

		req := httptest.NewRequest("OPTIONS", "/", nil)
		rec := httptest.NewRecorder()
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "foobar")
		})
		middleware(next).ServeHTTP(rec, req)
		resp := rec.Result()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		respBody, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Empty(t, respBody)
	})
}
