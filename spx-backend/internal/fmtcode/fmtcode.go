package fmtcode

import (
	"context"
	"fmt"
	"path"
	"regexp"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/gop/x/format"
	"golang.org/x/mod/modfile"
	"golang.org/x/tools/imports"
)

// FmtCode formats code in the given body.
func FmtCode(ctx context.Context, body string, fixImports bool) (formattedBody string, err error) {
	logger := log.GetReqLogger(ctx)
	files, err := splitFiles([]byte(body))
	if err != nil {
		logger.Printf("splitFiles failed: %v", err)
		return "", err
	}
	for _, file := range files.files {
		var (
			out []byte
			err error
		)
		switch {
		case path.Ext(file) == ".go":
			out, err = formatGo(file, files.Data(file), fixImports)
		case path.Base(file) == "go.mod":
			out, err = formatGoMod(file, files.Data(file))
		}
		if err != nil {
			logger.Printf("failed to format code: %v", err)
			if fmtErr := parseFormatError(err); fmtErr != nil {
				return "", fmtErr
			}
			return "", err
		}
		if out != nil {
			files.AddFile(file, out)
		}
	}
	return string(files.Format()), nil
}

// formatGo formats a Go source file.
func formatGo(file string, data []byte, fixImports bool) ([]byte, error) {
	if fixImports {
		// TODO: pass options to imports.Process so it can find symbols in sibling files.
		return imports.Process(file, data, nil)
	}
	out, err := format.GopstyleSource(data, file)
	if err != nil {
		// Unlike imports.Process, format.GopstyleSource does not prefix
		// the error with the file path. So, do it ourselves here.
		return nil, fmt.Errorf("%s:%w", file, err)
	}
	return out, nil
}

// formatGoMod formats a go.mod file.
func formatGoMod(file string, data []byte) ([]byte, error) {
	f, err := modfile.Parse(file, data, nil)
	if err != nil {
		return nil, err
	}
	return f.Format()
}

// FormatError represents a formatting error.
type FormatError struct {
	Line   int    `json:"line"`
	Column int    `json:"column"`
	Msg    string `json:"msg"`
}

// formatErrorInfoRE is the regular expression for extracting line, column and
// message from a format error.
var formatErrorInfoRE = regexp.MustCompile(`:(\d+):(\d+): ([^(\n]+)`)

// parseFormatError parses a format error message and returns a FormatError. It
// returns nil if the error message is not in the expected format.
func parseFormatError(err error) *FormatError {
	matches := formatErrorInfoRE.FindStringSubmatch(err.Error())
	if len(matches) < 4 {
		return nil
	}
	// The regexp is reliable enough to produce integral line and column numbers.
	ln, _ := strconv.Atoi(matches[1])
	col, _ := strconv.Atoi(matches[2])
	msg := matches[3]
	return &FormatError{Line: ln, Column: col, Msg: msg}
}

// Error implements [error].
func (e *FormatError) Error() string {
	return fmt.Sprintf("%d:%d: %s", e.Line, e.Column, e.Msg)
}
