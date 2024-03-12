package common

import (
	"os"
	"regexp"

	"github.com/qiniu/go-sdk/v7/auth/qbox"
	"github.com/qiniu/go-sdk/v7/storage"
)

func GenerateUploadToken() (string, error) {
	bus := os.Getenv("GOP_SPX_BLOBUS")
	re := regexp.MustCompile(`kodo://(.+):(.+)@(.+)\?`)
	matches := re.FindStringSubmatch(bus)
	if len(matches) < 4 {
		return "", ErrBLOBUSInvalid
	}
	accessKey := matches[1]
	secretKey := matches[2]
	bucket := matches[3]
	putPolicy := storage.PutPolicy{
		Scope:   bucket,
		SaveKey: "$(etag)$(ext)",
	}
	putPolicy.Expires = 1800
	mac := qbox.NewMac(accessKey, secretKey)
	upToken := putPolicy.UploadToken(mac)
	return upToken, nil
}
