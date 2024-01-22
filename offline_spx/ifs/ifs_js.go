package ifs

import (
	"fmt"
	"strconv"
	"syscall/js"
	"time"
)

type FileProperties struct {
	Size         int64
	LastModified time.Time
}

// Utility function for interacting with JavaScript
func callJSFunction(funcName string, args ...interface{}) (js.Value, error) {
	jsGlobal := js.Global()
	jsFunc := jsGlobal.Get(funcName)
	if jsFunc.Type() == js.TypeUndefined {
		return js.Undefined(), fmt.Errorf("%s function is not defined", funcName)
	}

	promise := jsFunc.Invoke(args...)
	done := make(chan js.Value)
	errChan := make(chan error)

	onSuccess := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		done <- args[0]
		return nil
	})
	onError := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		errChan <- fmt.Errorf("error calling %s", funcName)
		return nil
	})

	promise.Call("then", onSuccess)
	promise.Call("catch", onError)

	select {
	case result := <-done:
		onSuccess.Release()
		onError.Release()
		return result, nil
	case err := <-errChan:
		onSuccess.Release()
		onError.Release()
		return js.Undefined(), err
	}
}

// getFilesStartingWith gets all files starting with a given directory name using a JavaScript function
func getFilesStartingWith(dirname string) ([]string, error) {
	jsResult, err := callJSFunction("getFilesStartingWith", dirname)
	if err != nil {
		return nil, err
	}

	length := jsResult.Length()
	files := make([]string, length)
	for i := 0; i < length; i++ {
		files[i] = jsResult.Index(i).String()
	}
	return files, nil
}

// readFileFromIndexedDB reads a file from IndexedDB using a JavaScript function
func readFileFromIndexedDB(filename string) ([]byte, error) {
	jsResult, err := callJSFunction("readFileFromIndexedDB", filename)
	if err != nil {
		return nil, err
	}

	// Handling the returned ArrayBuffer
	length := jsResult.Get("byteLength").Int()
	fileContent := make([]byte, length)
	js.CopyBytesToGo(fileContent, jsResult)

	if len(fileContent) == 0 {
		return nil, fmt.Errorf("error reading file from IndexedDB, result is empty")
	}
	return fileContent, nil
}

// getFileProperties gets the properties of a file using a JavaScript function
func getFileProperties(filename string) (FileProperties, error) {
	jsResult, err := callJSFunction("getFileProperties", filename)
	if err != nil {
		return FileProperties{}, err
	}

	// Handling the returned object
	size, _ := strconv.ParseInt(jsResult.Get("size").String(), 10, 64)
	lastModifiedMillis, _ := strconv.ParseInt(jsResult.Get("lastModified").String(), 10, 64)
	lastModified := time.Unix(0, lastModifiedMillis*int64(time.Millisecond))

	fileProperties := FileProperties{
		Size:         size,
		LastModified: lastModified,
	}

	if fileProperties.Size == 0 && fileProperties.LastModified.IsZero() {
		return FileProperties{}, fmt.Errorf("error getting file properties, result is empty")
	}
	return fileProperties, nil
}
