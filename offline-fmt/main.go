/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-17 10:26:59
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 15:12:44
 * @FilePath: /offlineFmt/main.go
 * @Description:
 */
package main

import (
	"fmt"
	"regexp"
	"strconv"
	"syscall/js"

	gopfmt "github.com/goplus/gop/format"
)

type FormatError struct {
	Column int
	Line   int
	Msg    string
}
type FormatResponse struct {
	Body  string
	Error *FormatError
}

// format function
func formatSPX(code string) interface{} {
	// 创建临时文件或对象 URL
	tmpFileURL, origin := createTemporaryFile("test.spx", code)
	response := processFile(tmpFileURL, origin)
	if response.Error != nil {
		return map[string]interface{}{
			"Body": response.Body,
			"Error": map[string]interface{}{
				"Column": response.Error.Column,
				"Line":   response.Error.Line,
				"Msg":    response.Error.Msg,
			},
		}
	} else {
		return map[string]interface{}{
			"Body":  response.Body,
			"Error": nil,
		}
	}

}

// register function
func formatSPXFunc(this js.Value, args []js.Value) interface{} {
	return js.ValueOf(formatSPX(args[0].String()))
}

// register file select callback
func selectFile(this js.Value, args []js.Value) interface{} {
	file := args[0].Get("target").Get("files").Index(0)
	fileName := file.Get("name").String()
	reader := js.Global().Get("FileReader").New()
	reader.Call("readAsText", file)
	loadCallback := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		fileContent := reader.Get("result").String()
		tmpFileURL, origin := createTemporaryFile(fileName, fileContent)
		res := processFile(tmpFileURL, origin)
		document := js.Global().Get("document")
		pre := document.Call("getElementById", "fileOutput")
		pre.Set("innerHTML", res.Body)
		return nil
	})
	reader.Set("onload", loadCallback)

	return nil
}

func parseError(tmpFile string, errorMessage string) (int, int, string) {
	// Use regular expressions to match the format of error messages
	reg := regexp.MustCompile(tmpFile + `:(\d+):(\d+):(.+)`)
	// Extract line numbers, column numbers, and error messages from error messages
	matches := reg.FindStringSubmatch(errorMessage)
	if len(matches) != 4 {
		panic("Error message format mismatch")
	}
	columnNumberStr := matches[1]
	lineNumberStr := matches[2]
	errorInfo := matches[3]

	lineNumber, _ := strconv.Atoi(lineNumberStr)
	columnNumber, _ := strconv.Atoi(columnNumberStr)

	return lineNumber, columnNumber, errorInfo
}

func main() {
	js.Global().Set("formatSPX", js.FuncOf(formatSPXFunc))
	js.Global().Set("selectFile", js.FuncOf(selectFile))
	<-make(chan bool)
}

// createTemporaryFile In browser
func createTemporaryFile(fileName, fileContent string) (string, []byte) {
	fileData := []byte(fileContent)
	array := js.Global().Get("Uint8Array").New(len(fileData))
	js.CopyBytesToJS(array, fileData)
	blob := js.Global().Get("Blob").New([]interface{}{array}, map[string]interface{}{"type": "text/plain"})
	tmpFile := js.Global().Get("URL").Call("createObjectURL", blob).String()
	return tmpFile, fileData
}

func processFile(tmpFile string, origin []byte) FormatResponse {
	fmt.Println("Temporary file path:", tmpFile)
	fmtcode, err := gopfmt.Source(origin, false, tmpFile)
	res := &FormatResponse{}
	if err != nil {
		columnNumber, lineNumber, errorInfo := parseError(tmpFile, err.Error())
		res.Error = &FormatError{
			Column: columnNumber,
			Line:   lineNumber,
			Msg:    errorInfo,
		}
	} else {
		res.Body = string(fmtcode)
	}
	return *res
}
