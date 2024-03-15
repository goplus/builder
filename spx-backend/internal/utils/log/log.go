package log

import (
	"context"

	"github.com/qiniu/x/log"
	"github.com/qiniu/x/xlog"
)

// TODO: audit log

// GetReqLogger gets logger for request with given request context
func GetReqLogger(ctx context.Context) *xlog.Logger {
	return xlog.NewWith(ctx)
}

// GetLogger gets logger for non-request log purpose
func GetLogger() *log.Logger {
	return log.Std
}
