package common

import (
	"net/http"
)

// CorsMiddleware Cors Middleware
func CorsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Requests from any source are allowed
		w.Header().Set("Access-Control-Allow-Origin", "*")

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
