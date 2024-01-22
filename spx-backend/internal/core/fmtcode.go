package core

import (
	"regexp"
	"strconv"
)

// ExtractErrorInfo Format error message
func ExtractErrorInfo(errorMsg string) FormatError {
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
