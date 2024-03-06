package core

import (
	"fmt"
	"github.com/goplus/yap"
)

func ParseToken(p *Project, ctx *yap.Context) string {
	userId := ""
	token := GetToken(ctx)
	if token == "" {
		return ""
	}
	user, err := p.GetUser(token)
	if err != nil {
		fmt.Printf("get user error:", err)
		return ""
	} else {
		userId = user.Id
	}
	if userId == "" {
		return ""
	}
	return userId
}
