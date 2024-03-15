package user

import (
	"fmt"
	"os"
	"strings"

	"github.com/goplus/yap"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
)

// TODO: use better error definition
var ErrNotExist = os.ErrNotExist

type UserClaim casdoorsdk.Claims
type UserInfo casdoorsdk.User

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

// parseToken parses given token & returns user info
func parseToken(token string) (userId string, err error) {
	claim, err := casdoorsdk.ParseJwtToken(token)
	if err != nil {
		fmt.Println(err.Error())
		return "", ErrNotExist
	}
	userId = claim.Id
	return
}

func getToken(ctx *yap.Context) string {
	tokenCookie := ctx.Request.Header.Get("Authorization")
	// 删除 token 字符串中的 "Bearer " 前缀
	token := strings.TrimPrefix(tokenCookie, "Bearer ")
	return token
}

func GetUid(ctx *yap.Context) string {
	token := getToken(ctx)
	if token == "" {
		return ""
	}
	userId, err := parseToken(token)
	if err != nil {
		fmt.Printf("get user error:%v", err)
		return ""
	}
	return userId
}
