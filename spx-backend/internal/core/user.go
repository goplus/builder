package core

import (
	"fmt"
	"os"
	"strings"

	"github.com/goplus/yap"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
)

// Deprecated: use casdoorsdk instead
type User struct {
	Id       string
	Name     string
	Password string
	Avatar   string
}

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
func (p *Project) GetUser(token string) (user *User, err error) {
	claim, err := casdoorsdk.ParseJwtToken(token)
	if err != nil {
		fmt.Println(err.Error())
		return &User{}, ErrNotExist
	}
	user = &User{
		Name:   claim.Name,
		Avatar: claim.Avatar,
		Id:     claim.Id,
	}
	return
}

// ParseJwtToken return user id by token
func (p *Project) ParseJwtToken(token string) (userId string, err error) {
	claim, err := casdoorsdk.ParseJwtToken(token)
	if err != nil {
		fmt.Println(err.Error())
		return "", ErrNotExist
	}
	return claim.Id, nil
}

// GetUserById get user by uid
func (p *Project) GetUserById(uid string) (user *User, err error) {
	claim, err := casdoorsdk.GetUserByUserId(uid)
	if err != nil {
		fmt.Println(err.Error())
		return &User{}, ErrNotExist
	}
	if claim == nil {
		user = &User{
			Name:   "unknown",
			Avatar: "",
			Id:     "",
		}
	} else {
		user = &User{
			Name:   claim.Name,
			Avatar: claim.Avatar,
			Id:     claim.Id,
		}
	}

	return
}

// UpdateUserById update user by uid
func (p *Project) UpdateUserById(uid string, user *UserInfo) (res bool, err error) {
	res, err = casdoorsdk.UpdateUserById(uid, (*casdoorsdk.User)(user))
	return
}

func GetToken(ctx *yap.Context) string {
	tokenCookie := ctx.Request.Header.Get("Authorization")
	// 删除 token 字符串中的 "Bearer " 前缀
	token := strings.TrimPrefix(tokenCookie, "Bearer ")
	return token
}
