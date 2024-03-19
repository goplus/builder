package main

import (
	"encoding/json"
	"errors"
	"io"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/utils"
	"github.com/goplus/builder/spx-backend/internal/utils/user"
	"github.com/goplus/yap"
)

// errorCode defines code in error-payload (response body when error encountered)
type errorCode int

// We make convention that the first 3 digits of one errorCode's value is its corresponding HTTP status code
const (
	errorInvalidArgs  errorCode = 40001
	errorUnauthorized errorCode = 40100
	errorForbidden    errorCode = 40300
	errorNotFound     errorCode = 40400
	errorUnknown      errorCode = 50000
)

var msgs = map[errorCode]string{
	errorInvalidArgs:  "Invalid args",
	errorUnauthorized: "Unauthorized",
	errorForbidden:    "Forbidden",
	errorNotFound:     "Not found",
	errorUnknown:      "Internal error",
}

type errorPayload struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

func replyWithCode(ctx *yap.Context, code errorCode) {
	msg := msgs[errorUnknown]
	if errMsg, ok := msgs[code]; ok {
		msg = errMsg
	}
	replyWithCodeMsg(ctx, code, msg)
}

func replyWithCodeMsg(ctx *yap.Context, code errorCode, msg string) {
	intCode := int(code)
	httpStatus := intCode / 100
	ctx.JSON(httpStatus, &errorPayload{
		Code: intCode,
		Msg:  msg,
	})
}

func replyWithData(ctx *yap.Context, data any) {
	ctx.JSON(200, data)
}

func ensureUser(ctx *yap.Context) (u *user.User, ok bool) {
	u, ok = user.GetUser(utils.GetCtx(ctx))
	if !ok {
		replyWithCode(ctx, errorUnauthorized)
	}
	return
}

func parseJson(ctx *yap.Context, target any) (ok bool) {
	b, err := io.ReadAll(ctx.Request.Body)
	defer ctx.Request.Body.Close()
	if err != nil {
		replyWithCode(ctx, errorUnknown) // TODO: more precise error
		return false
	}
	err = json.Unmarshal(b, target)
	if err != nil {
		replyWithCode(ctx, errorInvalidArgs)
		return false
	}
	return true
}

// handlerInnerError do default logic to handle inner (controller / model) error
func handlerInnerError(ctx *yap.Context, err error) {
	switch {
	case errors.Is(err, controller.ErrNotExist):
		replyWithCode(ctx, errorNotFound)
	case errors.Is(err, controller.ErrUnauthorized):
		replyWithCode(ctx, errorUnauthorized)
	case errors.Is(err, controller.ErrForbidden):
		replyWithCode(ctx, errorForbidden)
	case errors.Is(err, model.ErrExisted):
		replyWithCode(ctx, errorInvalidArgs)
	case errors.Is(err, model.ErrNotExist):
		replyWithCode(ctx, errorNotFound)
	default:
		replyWithCode(ctx, errorUnknown)
	}
}
