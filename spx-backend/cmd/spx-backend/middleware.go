package main

import (
	"fmt"
	"net/http"

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

func NewSentryMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			hub := sentry.GetHubFromContext(ctx)
			if hub == nil {
				hub = sentry.CurrentHub().Clone()
				ctx = sentry.SetHubOnContext(ctx, hub)
			}
			sentry.ContinueTrace(hub, r.Header.Get(sentry.SentryTraceHeader), r.Header.Get(sentry.SentryBaggageHeader))
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

			next.ServeHTTP(w, r.WithContext(transaction.Context()))
		})
	}
}
