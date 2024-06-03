package log

import (
	"context"

	"github.com/qiniu/x/log"
	"github.com/qiniu/x/xlog"
)

// GetLogger gets logger for general purpose.
func GetLogger() *log.Logger {
	return log.Std
}

// GetReqLogger gets logger for request log purpose.
func GetReqLogger(ctx context.Context) *xlog.Logger {
	return xlog.NewWith(ctx)
}

// TODO: audit log
