package internal

import (
	"fmt"
	"github.com/goplus/gop/token"
	"regexp"
	"strconv"
)

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
	_, err := spxInfo(initSPXMod(), fset, fileName, fileCode)
	return parseErrorLines(error2List(err))
}

func parseErrorLines(sList []string) (diagList []diagnostics) {
	for _, str := range sList {
		diag, err := parseErrorLine(str)
		if err != nil {
			continue
		}
		diagList = append(diagList, diag)
	}
	return
}

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
