package authz

import (
	"net/http"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/log"
	"gorm.io/gorm"
)

// Authorizer provides authorization functionality.
type Authorizer struct {
	db           *gorm.DB
	pdp          PolicyDecisionPoint
	quotaTracker QuotaTracker
}

// New creates a new [Authorizer].
func New(db *gorm.DB, pdp PolicyDecisionPoint, quotaTracker QuotaTracker) *Authorizer {
	return &Authorizer{
		db:           db,
		pdp:          pdp,
		quotaTracker: quotaTracker,
	}
}

// Middleware returns a middleware function that computes user capabilities and
// injects them into the request context.
func (a *Authorizer) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := log.GetReqLogger(ctx)

			// Inject the authorizer instance into the context.
			ctx = newContextWithAuthorizer(ctx, a)

			// Compute user capabilities for authenticated users and inject them into
			// the context.
			if mUser, ok := authn.UserFromContext(ctx); ok {
				caps, err := a.pdp.ComputeUserCapabilities(ctx, mUser)
				if err != nil {
					logger.Printf("authorization system error: %v", err)
					http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
					return
				}
				ctx = NewContextWithUserCapabilities(ctx, caps)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
