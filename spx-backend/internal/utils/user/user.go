package user

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/utils/log"
)

// TODO: use better error definition
var ErrNotExist = os.ErrNotExist

type User casdoorsdk.User

// Init casdoor parser
func CasdoorConfigInit() {
	endPoint := os.Getenv("GOP_CASDOOR_ENDPOINT")
	clientID := os.Getenv("GOP_CASDOOR_CLIENTID")
	clientSecret := os.Getenv("GOP_CASDOOR_CLIENTSECRET")
	certificate := os.Getenv("GOP_CASDOOR_CERTIFICATE")
	organizationName := os.Getenv("GOP_CASDOOR_ORGANIZATIONNAME")
	applicationName := os.Getenv("GOP_CASDOOR_APPLICATONNAME")

	casdoorsdk.InitConfig(endPoint, clientID, clientSecret, certificate, organizationName, applicationName)
}

// getUser get user info from request, returns nil if no user info carried
func getUser(req *http.Request) (*User, error) {
	authorization := req.Header.Get("Authorization")
	if authorization == "" {
		return nil, nil
	}
	token := strings.TrimPrefix(authorization, "Bearer ")
	parsed, err := casdoorsdk.ParseJwtToken(token)
	if err != nil {
		return nil, fmt.Errorf("casdoorsdk.ParseJwtToken failed: %w", err)
	}
	user := User(parsed.User)
	return &user, nil
}

type key string

const (
	userKey key = "USER"
)

func GetUser(ctx context.Context) (user *User, ok bool) {
	user, ok = ctx.Value(userKey).(*User)
	return
}

func UserMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		logger := log.GetReqLogger(ctx)
		u, err := getUser(r)
		if err != nil {
			logger.Printf("get user failed: %v", err)
		} else if u == nil {
			logger.Printf("no user info")
		} else {
			newContext := context.WithValue(ctx, userKey, u)
			r = r.WithContext(newContext)
		}
		h.ServeHTTP(w, r)
	})
}
