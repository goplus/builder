package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/yap"
	"gorm.io/gorm"
)

// ensureAuthenticatedUser ensures there is an authenticated user in the context.
func ensureAuthenticatedUser(ctx *yap.Context) (mUser *model.User, ok bool) {
	mUser, ok = authn.UserFromContext(ctx.Context())
	if !ok {
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

	// According to RFC 9110, section 11.6.1, a 401 response MUST include a WWW-Authenticate header.
	if code == errorUnauthorized {
		ctx.ResponseWriter.Header().Set("WWW-Authenticate", "Bearer")
	}

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
	case errors.Is(err, authn.ErrUnauthorized):
		replyWithCode(ctx, errorUnauthorized)
	case errors.Is(err, authn.ErrForbidden):
		replyWithCode(ctx, errorForbidden)
	default:
		logger := log.GetReqLogger(ctx.Context())
		logger.Printf("failed to handle request [%s %s]: %v", ctx.Method, ctx.URL, err)
		replyWithCode(ctx, errorUnknown)
	}
}

// ensureQuotaRemaining checks the remaining quota for the given amount and
// replies with a 403 error if exceeded.
func ensureQuotaRemaining(ctx *yap.Context, resource authz.Resource, amount int64) bool {
	quotas, ok := authz.UserQuotasFromContext(ctx.Context())
	if !ok {
		return true
	}

	quota, ok := quotas.Limits[resource]
	if !ok {
		return true
	}
	if quota.Remaining() < amount {
		if reset := quota.Reset(); reset > 0 {
			ctx.ResponseWriter.Header().Set("Retry-After", strconv.FormatInt(reset, 10))
		}
		replyWithCodeMsg(ctx, errorQuotaExceeded, fmt.Sprintf("%s quota exceeded", resource))
		return false
	}
	return true
}

// consumeQuota consumes the quota for the given resource and logs failures.
func consumeQuota(ctx *yap.Context, resource authz.Resource, amount int64) {
	if err := authz.ConsumeQuota(ctx.Context(), resource, amount); err != nil {
		logger := log.GetReqLogger(ctx.Context())
		logger.Printf("failed to consume %s quota: %v", resource, err)
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
	errorInvalidArgs     errorCode = 40001
	errorUnauthorized    errorCode = 40100
	errorForbidden       errorCode = 40300
	errorQuotaExceeded   errorCode = 40301
	errorNotFound        errorCode = 40400
	errorTooManyRequests errorCode = 42900
	errorUnknown         errorCode = 50000
)

// errorMsgs defines messages for error codes.
var errorMsgs = map[errorCode]string{
	errorInvalidArgs:     "Invalid args",
	errorUnauthorized:    "Unauthorized",
	errorForbidden:       "Forbidden",
	errorQuotaExceeded:   "Quota exceeded",
	errorNotFound:        "Not found",
	errorTooManyRequests: "Too many requests",
	errorUnknown:         "Internal error",
}
