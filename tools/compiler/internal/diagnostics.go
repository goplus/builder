package internal

import (
	"fmt"
	"regexp"
	"strconv"

	"github.com/goplus/gop/token"
)

// diagnostics contains error after analyse the code.
type diagnostics struct {
	FileName string `json:"fileName"`
	Column   int    `json:"column"`
	Line     int    `json:"line"`
	Message  string `json:"message"`
}

// GetDiagnostics return a json object with error info.
func GetDiagnostics(fileName, fileCode string) interface{} {
	// new file set
	fset := token.NewFileSet()
	_, err := codeInfo(initSPXMod(), fset, fileName, fileCode)
	list := parseErrorLines(error2List(err))
	return list
}

// parseErrorLines make error info list to diagnostics list.
func parseErrorLines(sList []string) []diagnostics {
	diagList := []diagnostics{}
	for _, str := range sList {
		diag, err := parseErrorLine(str)
		if err != nil {
			continue
		}
		diagList = append(diagList, diag)
	}
	return diagList
}

// parseErrorLine make error info to diagnostics.
func parseErrorLine(str string) (diagnostics, error) {
	regex := regexp.MustCompile(`^(.*\.spx):(\d+):(\d+):\s*(.*)$`)

	matches := regex.FindStringSubmatch(str)
	if matches == nil || len(matches) != 5 {
		return diagnostics{}, fmt.Errorf("invalid format: %s", str)
	}

	line, err := strconv.Atoi(matches[2])
	if err != nil {
		return diagnostics{}, fmt.Errorf("invalid line number: %s", matches[2])
	}
	column, err := strconv.Atoi(matches[3])
	if err != nil {
		return diagnostics{}, fmt.Errorf("invalid column number: %s", matches[3])
	}

	entry := diagnostics{
		FileName: matches[1],
		Column:   column,
		Line:     line,
		Message:  matches[4],
	}

	return entry, nil
}
