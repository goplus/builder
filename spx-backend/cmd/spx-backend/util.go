package main

import (
	"encoding/json"
	"errors"
	"io"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/yap"
	"gorm.io/gorm"
)

// ensureAuthedUser ensures there is an authenticated user in the context.
func ensureAuthedUser(ctx *yap.Context) (mAuthedUser *model.User, isAuthed bool) {
	mAuthedUser, isAuthed = controller.AuthedUserFromContext(ctx.Context())
	if !isAuthed {
		replyWithCode(ctx, errorUnauthorized)
	}
	return
}

// parseJSON parses the JSON from the request body into the target.
func parseJSON(ctx *yap.Context, target any) (ok bool) {
	b, err := io.ReadAll(ctx.Body)
	if err != nil {
		replyWithCode(ctx, errorUnknown)
		return false
	}
	if err := json.Unmarshal(b, target); err != nil {
		replyWithCode(ctx, errorInvalidArgs)
		return false
	}
	return true
}

// replyWithCode replies to the client with the error code.
func replyWithCode(ctx *yap.Context, code errorCode) {
	msg := errorMsgs[errorUnknown]
	if errMsg, ok := errorMsgs[code]; ok {
		msg = errMsg
	}
	replyWithCodeMsg(ctx, code, msg)
}

// replyWithCodeMsg replies to the client with the error code and custom message.
func replyWithCodeMsg(ctx *yap.Context, code errorCode, msg string) {
	statusCode := int(code) / 100
	ctx.JSON(statusCode, &errorPayload{
		Code: code,
		Msg:  msg,
	})
}

// replyWithInnerError replies to the client with the inner error.
func replyWithInnerError(ctx *yap.Context, err error) {
	switch {
	case errors.Is(err, controller.ErrBadRequest), errors.Is(err, gorm.ErrDuplicatedKey):
		replyWithCode(ctx, errorInvalidArgs)
	case errors.Is(err, controller.ErrNotExist), errors.Is(err, gorm.ErrRecordNotFound):
		replyWithCode(ctx, errorNotFound)
	case errors.Is(err, controller.ErrUnauthorized):
		replyWithCode(ctx, errorUnauthorized)
	case errors.Is(err, controller.ErrForbidden):
		replyWithCode(ctx, errorForbidden)
	default:
		logger := log.GetReqLogger(ctx.Context())
		logger.Printf("failed to handle request [%s %s]: %v", ctx.Method, ctx.URL, err)
		replyWithCode(ctx, errorUnknown)
	}
}

// errorPayload is the payload for error response.
type errorPayload struct {
	Code errorCode `json:"code"`
	Msg  string    `json:"msg"`
}

// errorCode defines code for [errorPayload].
type errorCode int

// The error codes.
//
// The first 3 digits of the value are the corresponding HTTP status code.
const (
	errorInvalidArgs  errorCode = 40001
	errorUnauthorized errorCode = 40100
	errorForbidden    errorCode = 40300
	errorNotFound     errorCode = 40400
	errorUnknown      errorCode = 50000
)

// errorMsgs defines messages for error codes.
var errorMsgs = map[errorCode]string{
	errorInvalidArgs:  "Invalid args",
	errorUnauthorized: "Unauthorized",
	errorForbidden:    "Forbidden",
	errorNotFound:     "Not found",
	errorUnknown:      "Internal error",
}
