package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/yap"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestUser() *model.User {
	return &model.User{
		Model: model.Model{
			ID: 1,
		},
		Username: "testuser",
	}
}

func TestEnsureAuthenticatedUserFunction(t *testing.T) {
	t.Run("WithAuthenticatedUser", func(t *testing.T) {
		user := createTestUser()
		ctx := authn.NewContextWithUser(context.Background(), user)
		recorder := httptest.NewRecorder()

		// Create yap context similar to how it's done in the .yap files
		yapCtx := &yap.Context{}
		yapCtx.Request = httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
		yapCtx.ResponseWriter = recorder

		mUser, ok := ensureAuthenticatedUser(yapCtx)

		assert.True(t, ok, "Should return true for authenticated user")
		assert.Equal(t, user, mUser, "Should return the same user")
		// When user is authenticated, no response should be written by ensureAuthenticatedUser
		// But yap might set a default 200 status, so we check it didn't write an error
		assert.NotEqual(t, http.StatusUnauthorized, recorder.Code, "Should not write unauthorized response")
	})

	t.Run("WithoutAuthenticatedUser", func(t *testing.T) {
		ctx := context.Background()
		recorder := httptest.NewRecorder()

		// Create yap context without user
		yapCtx := &yap.Context{}
		yapCtx.Request = httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
		yapCtx.ResponseWriter = recorder

		mUser, ok := ensureAuthenticatedUser(yapCtx)

		assert.False(t, ok, "Should return false for unauthenticated user")
		assert.Nil(t, mUser, "Should return nil user")

		// Check that unauthorized response was written
		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Equal(t, "Bearer", recorder.Header().Get("WWW-Authenticate"))

		// Check error response body
		var errorResp errorPayload
		err := json.Unmarshal(recorder.Body.Bytes(), &errorResp)
		require.NoError(t, err)
		assert.Equal(t, errorUnauthorized, errorResp.Code)
		assert.Equal(t, "Unauthorized", errorResp.Msg)
	})
}

func TestErrorHandling(t *testing.T) {
	tests := []struct {
		name         string
		code         errorCode
		expectedHTTP int
		expectedMsg  string
		expectWWWAuth bool
	}{
		{
			name:         "Unauthorized",
			code:         errorUnauthorized,
			expectedHTTP: 401,
			expectedMsg:  "Unauthorized",
			expectWWWAuth: true,
		},
		{
			name:         "Forbidden",
			code:         errorForbidden,
			expectedHTTP: 403,
			expectedMsg:  "Forbidden",
			expectWWWAuth: false,
		},
		{
			name:         "NotFound",
			code:         errorNotFound,
			expectedHTTP: 404,
			expectedMsg:  "Not found",
			expectWWWAuth: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			yapCtx := &yap.Context{}
			yapCtx.ResponseWriter = recorder

			replyWithCode(yapCtx, tt.code)

			assert.Equal(t, tt.expectedHTTP, recorder.Code)

			if tt.expectWWWAuth {
				assert.Equal(t, "Bearer", recorder.Header().Get("WWW-Authenticate"))
			} else {
				assert.Empty(t, recorder.Header().Get("WWW-Authenticate"))
			}

			var errorResp errorPayload
			err := json.Unmarshal(recorder.Body.Bytes(), &errorResp)
			require.NoError(t, err)
			assert.Equal(t, tt.code, errorResp.Code)
			assert.Equal(t, tt.expectedMsg, errorResp.Msg)
		})
	}
}

// Test that demonstrates the authentication flow as used in the .yap files
func TestYapFileAuthFlow(t *testing.T) {
	t.Run("SimulatePostImageYapWithAuth", func(t *testing.T) {
		user := createTestUser()
		ctx := authn.NewContextWithUser(context.Background(), user)

		req := httptest.NewRequest("POST", "/image", nil)
		req = req.WithContext(ctx)
		recorder := httptest.NewRecorder()

		// Simulate the exact flow from post_image.yap
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			yapCtx := &yap.Context{}
			yapCtx.Request = r
			yapCtx.ResponseWriter = w

			// This is the exact check from our modified .yap files
			if _, ok := ensureAuthenticatedUser(yapCtx); !ok {
				return
			}

			// If we get here, authentication succeeded
			// Simulate successful image generation response
			response := map[string]interface{}{
				"id":      "test-image-123",
				"svg_url": "https://example.com/image.svg",
				"status":  "success",
			}

			yapCtx.JSON(200, response)
		})

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)

		var response map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "test-image-123", response["id"])
		assert.Equal(t, "success", response["status"])
	})

	t.Run("SimulatePostImageYapWithoutAuth", func(t *testing.T) {
		// No user in context - simulates unauthenticated request
		req := httptest.NewRequest("POST", "/image", nil)
		recorder := httptest.NewRecorder()

		// Simulate the exact flow from post_image.yap
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			yapCtx := &yap.Context{}
			yapCtx.Request = r
			yapCtx.ResponseWriter = w

			// This should fail and return early
			if _, ok := ensureAuthenticatedUser(yapCtx); !ok {
				return
			}

			// This should NOT be reached
			t.Fatal("Handler should not reach this point without authentication")
		})

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Equal(t, "Bearer", recorder.Header().Get("WWW-Authenticate"))

		var errorResp errorPayload
		err := json.Unmarshal(recorder.Body.Bytes(), &errorResp)
		require.NoError(t, err)
		assert.Equal(t, errorUnauthorized, errorResp.Code)
	})
	
}
