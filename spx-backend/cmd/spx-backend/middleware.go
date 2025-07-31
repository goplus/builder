package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/getsentry/sentry-go"
	"github.com/qiniu/x/reqid"
)

// NewReqIDMiddleware creates a new request ID middleware.
func NewReqIDMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := reqid.NewContextWith(r.Context(), w, r)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

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

func NewSentryMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			hub := sentry.GetHubFromContext(ctx)
			if hub == nil {
				hub = sentry.CurrentHub().Clone()
				ctx = sentry.SetHubOnContext(ctx, hub)
			}
			options := []sentry.SpanOption{
				sentry.WithOpName("http.server"),
				sentry.ContinueFromRequest(r),
				sentry.WithTransactionSource(sentry.SourceURL),
			}
			transaction := sentry.StartTransaction(ctx,
				fmt.Sprintf("%s %s", r.Method, r.URL.Path),
				options...,
			)
			defer transaction.Finish()

			next.ServeHTTP(w, r)
		})
	}
}
