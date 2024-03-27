package fmtcode

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/mod/modfile"
	"golang.org/x/tools/imports"
)

type FormatError struct {
	Column int
	Line   int
	Msg    string
}

type FormatResponse struct {
	Body  string
	Error FormatError
}

// extractErrorInfo Format error message
func extractErrorInfo(errorMsg string) FormatError {
	// Now a empty FormatError will always be returned, even if there is no error.
	// TODO: avoid the empty error
	var de FormatError
	re := regexp.MustCompile(`:(\d+):(\d+): ([^(\n]+)`)
	matches := re.FindStringSubmatch(errorMsg)
	if len(matches) < 4 {
		de.Msg = errorMsg
		return de
	}

	lineNumber, err := strconv.Atoi(matches[1])
	if err != nil {
		de.Msg = errorMsg
		return de
	}
	columnNumber, err := strconv.Atoi(matches[2])
	if err != nil {
		de.Msg = errorMsg
		return de
	}
	errorMessage := matches[3]
	de.Column = columnNumber
	de.Line = lineNumber
	de.Msg = errorMessage
	return de
}

func formatGoMod(file string, data []byte) ([]byte, error) {
	f, err := modfile.Parse(file, data, nil)
	if err != nil {
		return nil, err
	}
	return f.Format()
}

// FmtCode Format code
func FmtCode(body string, fixImports bool) (res *FormatResponse) {
	fs, err := splitFiles([]byte(body))
	if err != nil {
		fmtErr := extractErrorInfo(err.Error())
		res = &FormatResponse{
			Body:  "",
			Error: fmtErr,
		}
		return
	}
	for _, f := range fs.files {
		switch {
		case path.Ext(f) == ".go":
			var out []byte
			var err error
			in := fs.Data(f)
			if fixImports {
				// TODO: pass options to imports.Process so it
				// can find symbols in sibling files.
				out, err = imports.Process(f, in, nil)
			} else {
				var tmpDir string
				tmpDir, err = os.MkdirTemp("", "gopformat")
				if err != nil {
					fmtErr := extractErrorInfo(err.Error())
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				defer os.RemoveAll(tmpDir)
				tmpGopFile := filepath.Join(tmpDir, "prog.gop")
				if err = os.WriteFile(tmpGopFile, in, 0644); err != nil {
					fmtErr := extractErrorInfo(err.Error())
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				cmd := exec.Command("gop", "fmt", "-smart", tmpGopFile)
				//gop fmt returns error result in stdout, so we do not need to handle stderr
				//err is to check gop fmt return code
				var fmtErr []byte
				fmtErr, err = cmd.Output()
				if err != nil {
					fmtErr := extractErrorInfo(strings.Replace(string(fmtErr), tmpGopFile, "prog.gop", -1))
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				out, err = os.ReadFile(tmpGopFile)
				if err != nil {
					err = errors.New("interval error when formatting gop code")
				}
			}
			if err != nil {
				errMsg := err.Error()
				if !fixImports {
					// Unlike imports.Process, format.Source does not prefix
					// the error with the file path. So, do it ourselves here.
					errMsg = fmt.Sprintf("%v:%v", f, errMsg)
				}
				fmtErr := extractErrorInfo(errMsg)
				res = &FormatResponse{
					Body:  "",
					Error: fmtErr,
				}
				return
			}
			fs.AddFile(f, out)
		case path.Base(f) == "go.mod":
			out, err := formatGoMod(f, fs.Data(f))
			if err != nil {
				fmtErr := extractErrorInfo(err.Error())
				res = &FormatResponse{
					Body:  "",
					Error: fmtErr,
				}
				return
			}
			fs.AddFile(f, out)
		}
	}
	res = &FormatResponse{
		Body:  string(fs.Format()),
		Error: FormatError{},
	}
	return
}
