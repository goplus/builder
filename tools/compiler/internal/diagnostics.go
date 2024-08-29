package internal

import (
	"fmt"
	"strconv"
	"strings"
)

// diagnostics contains error after analyse the code.
type diagnostics struct {
	FileName string `json:"fileName"`
	Column   int    `json:"column"`
	Line     int    `json:"line"`
	Message  string `json:"message"`
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
	strList := strings.Split(str, ":")

	if strList == nil || len(strList) < 4 {
		return diagnostics{}, fmt.Errorf("invalid format: %s", str)
	}

	line, err := strconv.Atoi(strList[1])
	if err != nil {
		return diagnostics{}, fmt.Errorf("invalid line number: %s", strList[1])
	}
	column, err := strconv.Atoi(strList[2])
	if err != nil {
		return diagnostics{}, fmt.Errorf("invalid column number: %s", strList[2])
	}

	entry := diagnostics{
		FileName: strList[0],
		Line:     line,
		Column:   column,
		Message:  strings.TrimSpace(strings.Join(strList[3:], "")),
	}

	return entry, nil
}
