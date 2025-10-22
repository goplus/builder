package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/yap"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type testQuotaTracker struct{}

func (t *testQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (int64, error) {
	return 0, nil
}

func (t *testQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64) error {
	return nil
}

func (t *testQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	return nil
}

type testPDP struct {
	caps authz.UserCapabilities
	err  error
}

func (p *testPDP) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (authz.UserCapabilities, error) {
	return p.caps, p.err
}

type testRateLimiter struct {
	allow func(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error)
}

func (t *testRateLimiter) Allow(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
	if t.allow != nil {
		return t.allow(ctx, userID, resource, policy)
	}
	return true, 0, nil
}

func newTestYapContext(req *http.Request, w http.ResponseWriter) *yap.Context {
	return &yap.Context{
		Request:        req,
		ResponseWriter: w,
	}
}

func TestEnsureRateLimit(t *testing.T) {
	user := &model.User{Model: model.Model{ID: 42}, Username: "tester"}
	pdp := &testPDP{}
	quotaTracker := &testQuotaTracker{}

	t.Run("Allowed", func(t *testing.T) {
		pdp.caps = authz.UserCapabilities{
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		}
		limiter := &testRateLimiter{}
		authorizer := authz.New(&gorm.DB{}, pdp, quotaTracker, limiter)

		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		ctx := authn.NewContextWithUser(req.Context(), user)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler := authorizer.Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			yapCtx := newTestYapContext(r, w)
			require.True(t, ensureRateLimit(yapCtx, authz.ResourceCopilotMessage))
			w.WriteHeader(http.StatusOK)
		}))

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Empty(t, rec.Header().Get("Retry-After"))
	})

	t.Run("Denied", func(t *testing.T) {
		pdp.caps = authz.UserCapabilities{
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		}
		limiter := &testRateLimiter{
			allow: func(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
				return false, 2 * time.Second, nil
			},
		}
		authorizer := authz.New(&gorm.DB{}, pdp, quotaTracker, limiter)

		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		ctx := authn.NewContextWithUser(req.Context(), user)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler := authorizer.Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			yapCtx := newTestYapContext(r, w)
			require.False(t, ensureRateLimit(yapCtx, authz.ResourceCopilotMessage))
		}))

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusTooManyRequests, rec.Code)
		assert.Equal(t, "2", rec.Header().Get("Retry-After"))
	})

	t.Run("LimiterError", func(t *testing.T) {
		pdp.caps = authz.UserCapabilities{
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		}
		limiter := &testRateLimiter{
			allow: func(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
				return false, 0, assert.AnError
			},
		}
		authorizer := authz.New(&gorm.DB{}, pdp, quotaTracker, limiter)

		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		ctx := authn.NewContextWithUser(req.Context(), user)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler := authorizer.Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			yapCtx := newTestYapContext(r, w)
			require.False(t, ensureRateLimit(yapCtx, authz.ResourceCopilotMessage))
		}))

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.Empty(t, rec.Header().Get("Retry-After"))
	})
}
