package authz

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newTestUser() *model.User {
	return &model.User{
		Model:       model.Model{ID: 123},
		Username:    "test-user",
		DisplayName: "Test User",
		Avatar:      "https://example.com/avatar.png",
		Roles:       model.UserRoles{"user"},
		Plan:        model.UserPlanFree,
	}
}

func newTestHandler(t *testing.T, wantCaps *UserCapabilities) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caps, ok := UserCapabilitiesFromContext(r.Context())
		if wantCaps != nil {
			require.True(t, ok)
			assert.Equal(t, *wantCaps, caps)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("has capabilities"))
		} else {
			require.False(t, ok)
			require.Zero(t, caps)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("no capabilities"))
		}
	}
}

func TestNew(t *testing.T) {
	db := &gorm.DB{}
	pdp := &mockPolicyDecisionPoint{}
	quotaTracker := &mockQuotaTracker{}
	rateLimiter := &mockRateLimiter{}

	authorizer := New(db, pdp, quotaTracker, rateLimiter)

	require.NotNil(t, authorizer)
	assert.Equal(t, db, authorizer.db)
	assert.Equal(t, pdp, authorizer.pdp)
	assert.Equal(t, quotaTracker, authorizer.quotaTracker)
	assert.Equal(t, rateLimiter, authorizer.rateLimiter)
}

func TestAuthorizerMiddleware(t *testing.T) {
	t.Run("NoUser", func(t *testing.T) {
		pdp := &mockPolicyDecisionPoint{}
		quotaTracker := &mockQuotaTracker{}
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		middleware := authorizer.Middleware()
		handler := middleware(newTestHandler(t, nil))

		req := httptest.NewRequest("GET", "/test", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "no capabilities", recorder.Body.String())
	})

	t.Run("ValidUser", func(t *testing.T) {
		caps := newTestUserCapabilities()

		pdp := &mockPolicyDecisionPoint{}
		pdp.computeUserCapabilitiesFunc = func(ctx context.Context, mUser *model.User) (UserCapabilities, error) {
			assert.Equal(t, int64(123), mUser.ID)
			assert.Equal(t, "test-user", mUser.Username)
			return caps, nil
		}

		quotaTracker := &mockQuotaTracker{}
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		middleware := authorizer.Middleware()
		handler := middleware(newTestHandler(t, &caps))

		user := newTestUser()
		ctx := authn.NewContextWithUser(context.Background(), user)
		req := httptest.NewRequest("GET", "/test", nil)
		req = req.WithContext(ctx)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "has capabilities", recorder.Body.String())
	})

	t.Run("PDPError", func(t *testing.T) {
		pdp := &mockPolicyDecisionPoint{}
		pdp.computeUserCapabilitiesFunc = func(ctx context.Context, mUser *model.User) (UserCapabilities, error) {
			return UserCapabilities{}, errors.New("PDP error")
		}

		quotaTracker := &mockQuotaTracker{}
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		middleware := authorizer.Middleware()
		handler := middleware(newTestHandler(t, nil))

		user := newTestUser()
		ctx := authn.NewContextWithUser(context.Background(), user)
		req := httptest.NewRequest("GET", "/test", nil)
		req = req.WithContext(ctx)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusInternalServerError, recorder.Code)
		assert.Equal(t, "Internal Server Error\n", recorder.Body.String())
	})
}
