package authn

import (
	"net/http"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Middleware implements [Authenticator] that follows soft fail strategy.
func Middleware(a Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := log.GetReqLogger(ctx)

			authorization := r.Header.Get("Authorization")
			if authorization != "" {
				token := strings.TrimPrefix(authorization, "Bearer ")
				mUser, err := a.Authenticate(ctx, token)
				if err != nil {
					logger.Printf("failed to get user from token: %v", err)
				} else if mUser == nil {
					logger.Printf("no user info")
				} else {
					r = r.WithContext(NewContextWithUser(ctx, mUser))
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
