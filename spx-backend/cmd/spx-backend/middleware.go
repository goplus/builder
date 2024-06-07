package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/qiniu/x/reqid"
)

// NewCORSMiddleware creates a new CORS middleware.
func NewCORSMiddleware() func(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*" // Default to allow all origins.
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET, HEAD, POST, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Accept-Encoding, Content-Type, Content-Length, Authorization, X-CSRF-Token")

			// Handle preflight requests.
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// NewReqIDMiddleware creates a new request ID middleware.
func NewReqIDMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := reqid.NewContextWith(r.Context(), w, r)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// NewUserMiddleware creates a new user middleware.
func NewUserMiddleware(ctrl *controller.Controller) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := log.GetReqLogger(ctx)

			authorization := r.Header.Get("Authorization")
			if authorization != "" {
				token := strings.TrimPrefix(authorization, "Bearer ")
				user, err := ctrl.UserFromToken(token)
				if err != nil {
					logger.Printf("failed to get user from token: %v", err)
				} else if user == nil {
					logger.Printf("no user info")
				} else {
					r = r.WithContext(controller.NewContextWithUser(ctx, user))
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
