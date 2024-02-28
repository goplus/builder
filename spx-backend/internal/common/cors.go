package common

import (
	"net/http"
)

func CorsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 允许来自任何源的请求
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// 允许前端请求携带的方法
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")

		// 允许携带的头信息
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// 预检请求
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// 调用下一个中间件或最终的处理程序
		h.ServeHTTP(w, r)
	})
}
