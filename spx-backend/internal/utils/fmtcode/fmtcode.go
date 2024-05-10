package fmtcode

import (
	"context"
	"fmt"
	"path"
	"regexp"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/utils/log"
	"github.com/goplus/gop/x/format"
	"golang.org/x/mod/modfile"
	"golang.org/x/tools/imports"
)

type FormatResponse struct {
	Body  string       `json:"body"`
	Error *FormatError `json:"error,omitempty"`
}

type FormatError struct {
	Line   int    `json:"line"`
	Column int    `json:"column"`
	Msg    string `json:"msg"`
}

var formatErrorInfoRE = regexp.MustCompile(`:(\d+):(\d+): ([^(\n]+)`)

// parseFormatError parses a format error message and returns a FormatError.
// It returns nil if the error message is not in the expected format.
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

// FmtCode formats code in the given body.
func FmtCode(ctx context.Context, body string, fixImports bool) (*FormatResponse, error) {
	logger := log.GetReqLogger(ctx)
	fs, err := splitFiles([]byte(body))
	if err != nil {
		logger.Printf("splitFiles failed: %v", err)
		return nil, err
	}
	for _, f := range fs.files {
		var (
			out []byte
			err error
		)
		switch {
		case path.Ext(f) == ".go":
			out, err = formatGo(f, fs.Data(f), fixImports)
		case path.Base(f) == "go.mod":
			out, err = formatGoMod(f, fs.Data(f))
		}
		if err != nil {
			logger.Printf("format failed: %v", err)
			if fe := parseFormatError(err); fe != nil {
				return &FormatResponse{Error: fe}, nil
			}
			return nil, err
		}
		if out != nil {
			fs.AddFile(f, out)
		}
	}
	return &FormatResponse{Body: string(fs.Format())}, nil
}

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

func formatGoMod(file string, data []byte) ([]byte, error) {
	f, err := modfile.Parse(file, data, nil)
	if err != nil {
		return nil, err
	}
	return f.Format()
}
