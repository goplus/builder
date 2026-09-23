//go:build js && wasm

package main

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/goplus/ixgo"
)

// logger is the JSON logger for ispx.
var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

var executionLocation = newLocationReporter(33*time.Millisecond, func(file string, line int) {
	logger.Info("__spx_loc__", "file", file, "line", line)
})

func logExecutionLocation(info *ixgo.DebugInfo) {
	position := info.Position()
	if position.Line < 1 || !strings.HasSuffix(position.Filename, ".spx") {
		return
	}
	executionLocation.report(filepath.Base(position.Filename), position.Line, time.Now())
}

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
