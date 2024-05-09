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

// FmtCode Format code
func FmtCode(ctx context.Context, body string, fixImports bool) *FormatResponse {
	logger := log.GetReqLogger(ctx)
	fs, err := splitFiles([]byte(body))
	if err != nil {
		logger.Printf("splitFiles failed: %v", err)
		return newErrorResponse(err)
	}
	for _, f := range fs.files {
		switch {
		case path.Ext(f) == ".go":
			out, err := formatGo(f, fs.Data(f), fixImports)
			if err != nil {
				logger.Printf("formatGo failed: %v", err)
				return newErrorResponse(err)
			}
			fs.AddFile(f, out)
		case path.Base(f) == "go.mod":
			out, err := formatGoMod(f, fs.Data(f))
			if err != nil {
				logger.Printf("formatGoMod failed: %v", err)
				return newErrorResponse(err)
			}
			fs.AddFile(f, out)
		}
	}
	return newSuccessResponse(string(fs.Format()))
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

type FormatResponse struct {
	Body  string       `json:",omitempty"`
	Error *FormatError `json:",omitempty"`
}

type FormatError struct {
	Line   int    `json:",omitempty"`
	Column int    `json:",omitempty"`
	Msg    string `json:",omitempty"`
}

func newSuccessResponse(body string) *FormatResponse { return &FormatResponse{Body: body} }

var formatErrorInfoRE = regexp.MustCompile(`:(\d+):(\d+): ([^(\n]+)`)

func newErrorResponse(err error) *FormatResponse {
	fe := &FormatError{Msg: err.Error()}
	matches := formatErrorInfoRE.FindStringSubmatch(fe.Msg)
	if len(matches) > 3 {
		// The regexp is reliable enough to produce integral line and column numbers.
		fe.Line, _ = strconv.Atoi(matches[1])
		fe.Column, _ = strconv.Atoi(matches[2])
		fe.Msg = matches[3]
	}
	return &FormatResponse{Error: fe}
}
