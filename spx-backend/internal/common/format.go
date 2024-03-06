package common

import (
	"golang.org/x/mod/modfile"
	"os"
)

func FormatGoMod(file string, data []byte) ([]byte, error) {
	f, err := modfile.Parse(file, data, nil)
	if err != nil {
		return nil, err
	}
	return f.Format()
}

func ExtractURLPart(url string) string {
	part := url[len(os.Getenv("QINIU_PATH")):]
	return part
}
