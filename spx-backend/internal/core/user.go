package core

import (
	"fmt"
	"os"
	"strings"

	"github.com/goplus/yap"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
)

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

// GetUser return author by token
func (ctrl *Controller) GetUser(token string) (userId string, err error) {
	claim, err := casdoorsdk.ParseJwtToken(token)
	if err != nil {
		fmt.Println(err.Error())
		return "", ErrNotExist
	}
	userId = claim.Id
	return
}

func GetToken(ctx *yap.Context) string {
	tokenCookie := ctx.Request.Header.Get("Authorization")
	// 删除 token 字符串中的 "Bearer " 前缀
	token := strings.TrimPrefix(tokenCookie, "Bearer ")
	return token
}

func ParseToken(ctrl *Controller, ctx *yap.Context) string {
	token := GetToken(ctx)
	if token == "" {
		return ""
	}
	userId, err := ctrl.GetUser(token)
	if err != nil {
		fmt.Printf("get user error:%v", err)
		return ""
	}
	return userId
}
