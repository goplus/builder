package common

import (
	"net/http"

	"github.com/qiniu/x/reqid"
)

// ReqIDMiddleware Cors Middleware
func ReqIDMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		newContext := reqid.NewContextWith(r.Context(), w, r)
		newRequest := r.WithContext(newContext)
		h.ServeHTTP(w, newRequest)
	})
}
