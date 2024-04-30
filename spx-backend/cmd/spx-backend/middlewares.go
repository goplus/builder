package main

import (
	"net/http"
	"os"

	"github.com/goplus/builder/spx-backend/internal/utils/user"
	"github.com/qiniu/x/reqid"
)

// CorsMiddleware Cors Middleware
func CorsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Requests from any source are allowed
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("ALLOWED_ORIGIN"))

		// Allow the frontend to request a carrying method
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")

		// Header information allowed to be carried
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Invoke the next middleware or final handler
		h.ServeHTTP(w, r)
	})
}

// ReqIDMiddleware Cors Middleware
func ReqIDMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		newContext := reqid.NewContextWith(r.Context(), w, r)
		newRequest := r.WithContext(newContext)
		h.ServeHTTP(w, newRequest)
	})
}

// UserMiddleware parse & save user info to request context
func UserMiddleware(h http.Handler) http.Handler {
	return user.UserMiddleware(h)
}
