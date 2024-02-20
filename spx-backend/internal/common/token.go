package common

import (
	"fmt"
	"os"
	"regexp"

	"github.com/qiniu/go-sdk/v7/auth"
	"github.com/qiniu/go-sdk/v7/storage"
)

func GenerateUploadToken() (string, error) {
	bus := os.Getenv("GOP_SPX_BLOBUS")
	// 使用正则表达式来匹配所需的部分
	re := regexp.MustCompile(`kodo://(.+):(.+)@(.+)\?`)
	matches := re.FindStringSubmatch(bus)

	if len(matches) < 4 {
		return "", fmt.Errorf("string format is not valid")
	}

	accessKey := matches[1]
	secretKey := matches[2]
	bucket := matches[3]
	putPolicy := storage.PutPolicy{
		Scope: bucket,
	}
	putPolicy.Expires = 1800
	mac := auth.New(accessKey, secretKey)
	upToken := putPolicy.UploadToken(mac)
	return upToken, nil
}
