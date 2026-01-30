//go:build js && wasm

package main

import (
	"log/slog"
	"os"

	"github.com/goplus/ixgo"
)

// logger is the JSON logger for ispx.
var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

// logWithCallerInfo logs msg with caller information extracted from frame.
func logWithCallerInfo(msg string, frame *ixgo.Frame) {
	if frs := frame.CallerFrames(); len(frs) > 0 {
		fr := frs[0]
		logger.Info(
			msg,
			"function", fr.Function,
			"file", fr.File,
			"line", fr.Line,
		)
	}
}

// logWithPanicInfo logs panic information including error and position details.
func logWithPanicInfo(info *ixgo.PanicInfo) {
	position := info.Position()
	logger.Error(
		"panic",
		"error", info.Error,
		"function", info.String(),
		"file", position.Filename,
		"line", position.Line,
		"column", position.Column,
	)
}
