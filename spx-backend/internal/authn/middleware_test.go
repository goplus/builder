package authn

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestHandler(t *testing.T, expectAuthenticated bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mUser, ok := UserFromContext(r.Context())
		if expectAuthenticated {
			require.True(t, ok)
			require.NotNil(t, mUser)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("authenticated"))
		} else {
			require.False(t, ok)
			require.Nil(t, mUser)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("not authenticated"))
		}
	}
}

func TestMiddleware(t *testing.T) {
	t.Run("NoAuthorizationHeader", func(t *testing.T) {
		auth := &mockAuthenticator{}
		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, false))

		req := httptest.NewRequest("GET", "/test", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "not authenticated", recorder.Body.String())
	})

	t.Run("ValidBearerToken", func(t *testing.T) {
		auth := &mockAuthenticator{}
		wantUser := newTestUser()
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "valid-token", token)
			return wantUser, nil
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, true))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "authenticated", recorder.Body.String())
	})

	t.Run("InvalidToken", func(t *testing.T) {
		auth := &mockAuthenticator{}
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "invalid-token", token)
			return nil, ErrUnauthorized
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, false))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "not authenticated", recorder.Body.String())
	})

	t.Run("NilUserFromAuthenticator", func(t *testing.T) {
		auth := &mockAuthenticator{}
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "token-with-nil-user", token)
			return nil, nil
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, false))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer token-with-nil-user")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "not authenticated", recorder.Body.String())
	})

	t.Run("AuthorizationWithoutBearer", func(t *testing.T) {
		auth := &mockAuthenticator{}
		wantUser := newTestUser()
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "Basic dXNlcjpwYXNz", token)
			return wantUser, nil
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, true))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "authenticated", recorder.Body.String())
	})

	t.Run("EmptyAuthorizationHeader", func(t *testing.T) {
		auth := &mockAuthenticator{}
		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, false))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "not authenticated", recorder.Body.String())
	})

	t.Run("BearerWithoutToken", func(t *testing.T) {
		auth := &mockAuthenticator{}
		wantUser := newTestUser()
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "", token)
			return wantUser, nil
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, true))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer ")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "authenticated", recorder.Body.String())
	})

	t.Run("SystemError", func(t *testing.T) {
		auth := &mockAuthenticator{}
		auth.authenticateFunc = func(ctx context.Context, token string) (*model.User, error) {
			assert.Equal(t, "system-error-token", token)
			return nil, errors.New("database connection failed")
		}

		middleware := Middleware(auth)
		handler := middleware(newTestHandler(t, false))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer system-error-token")
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusInternalServerError, recorder.Code)
		assert.Equal(t, "Internal Server Error\n", recorder.Body.String())
	})
}
