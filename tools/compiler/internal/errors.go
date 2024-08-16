package internal

import (
	"errors"
	"github.com/goplus/gogen"
	"github.com/goplus/gop/scanner"
	errors2 "github.com/qiniu/x/errors"
)

func error2List(err error) []string {
	var stringList []string

	if err == nil {
		return stringList
	}

	var scannerErrorList scanner.ErrorList
	if errors.As(err, &scannerErrorList) {
		for _, e := range scannerErrorList {
			stringList = append(stringList, e.Error())
		}
		return stringList
	}

	var codeError *gogen.CodeError
	if errors.As(err, &codeError) {
		return []string{codeError.Error()}
	}

	var codeErrorList errors2.List
	if errors.As(err, &codeErrorList) {
		for _, e := range codeErrorList {
			stringList = append(stringList, e.Error())
		}
		return stringList
	}

	stringList = append(stringList, err.Error())

	return stringList
}
