package authn

import (
	"errors"
	"net/http"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Middleware returns a middleware function that authenticates requests using
// the provided [Authenticator] and injects user information into the request
// context. It follows a soft fail strategy where authentication failures do not
// prevent the request from proceeding, except for system errors.
func Middleware(a Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := log.GetReqLogger(ctx)

			if authorization := r.Header.Get("Authorization"); authorization != "" {
				token := strings.TrimPrefix(authorization, "Bearer ")
				mUser, err := a.Authenticate(ctx, token)
				if err != nil {
					if !errors.Is(err, ErrUnauthorized) {
						logger.Printf("authentication system error: %v", err)
						http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
						return
					}
					logger.Printf("failed to authenticate user: %v", err)
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
