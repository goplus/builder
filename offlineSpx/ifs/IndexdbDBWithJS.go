package ifs

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"syscall/js"
	"time"
)

func getFilesStartingWith(dirname string) ([]string, error) {
	log.Println("getFilesStartingWith dirname:", dirname)
	defer func() {
		if r := recover(); r != nil {
			log.Println("getFilesStartingWith panic:", r)
		}
	}()

	// Get JavaScript global object
	jsGlobal := js.Global()

	// Get the JavaScript function we want to call
	jsFunc := jsGlobal.Get("getFilesStartingWith")
	// Check if function is defined
	if jsFunc.Type() == js.TypeUndefined {
		log.Panicln("getFilesStartingWith function is not defined.")
	}
	// Call a JavaScript function, passing dirname as argument
	promise := jsFunc.Invoke(dirname)
	// Prepare a channel for receiving results
	done := make(chan []string)
	var files []string

	// Define success callback function
	onSuccess := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Get the results returned by JavaScript
		jsResult := args[0]
		length := jsResult.Length()
		files = make([]string, length)
		for i := 0; i < length; i++ {
			files[i] = jsResult.Index(i).String()
		}

		// Send results through channel
		done <- files
		return nil
	})

	// Define failure callback function
	onError := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		log.Println("Error calling getFilesStartingWith:", args[0])
		done <- nil
		return nil
	})

	// Bind callback function to Promise
	promise.Call("then", onSuccess)
	promise.Call("catch", onError)
	// Wait for Promise to resolve
	result := <-done

	// Clean up callbacks
	onSuccess.Release()
	onError.Release()
	if result == nil {
		return nil, fmt.Errorf("error reading directory from IndexedDB")
	}
	return result, nil
}

func ReadFileFromIndexedDB(filename string) ([]byte, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("ReadFileFromIndexedDB panic", r)
		}
	}()

	// Get JavaScript global object
	jsGlobal := js.Global()

	// Get the JavaScript function we want to call
	jsFunc := jsGlobal.Get("readFileFromIndexedDB")

	// Call a JavaScript function, passing filename as argument
	promise := jsFunc.Invoke(filename)

	// Prepare a channel for receiving results
	done := make(chan []byte)

	// Define success callback function
	onSuccess := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Handle the returned ArrayBuffer
		jsArrayBuffer := args[0]
		length := jsArrayBuffer.Get("byteLength").Int()
		fileContent := make([]byte, length)
		js.CopyBytesToGo(fileContent, jsArrayBuffer)

		done <- fileContent
		return nil
	})

	// Define failure callback function
	onError := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		fmt.Println("Error calling readFileFromIndexedDB:", args[0])
		done <- nil
		return nil
	})

	// Bind callback function to Promise
	promise.Call("then", onSuccess)
	promise.Call("catch", onError)

	// Wait for Promise to resolve
	result := <-done
	// Clean up callbacks
	onSuccess.Release()
	onError.Release()

	if result == nil {
		return nil, errors.New("error reading file from IndexedDB")
	}
	return result, nil
}

type FileProperties struct {
	Size         int64
	LastModified time.Time
}

func GetFileProperties(filename string) (FileProperties, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("GetFileProperties panic:", r)
		}
	}()

	// Get JavaScript global object
	jsGlobal := js.Global()

	// Get the JavaScript function we want to call
	jsFunc := jsGlobal.Get("getFileProperties")

	// Call a JavaScript function, passing filename as argument
	promise := jsFunc.Invoke(filename)

	// Prepare a channel for receiving results
	done := make(chan FileProperties)
	var fileProperties FileProperties

	// Define success callback function
	onSuccess := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Handle the returned object
		jsResult := args[0]
		size, _ := strconv.ParseInt(jsResult.Get("size").String(), 10, 64)
		lastModifiedMillis, _ := strconv.ParseInt(jsResult.Get("lastModified").String(), 10, 64)
		lastModified := time.Unix(0, lastModifiedMillis*int64(time.Millisecond))

		fileProperties = FileProperties{
			Size:         size,
			LastModified: lastModified,
		}

		done <- fileProperties
		return nil
	})

	// Define failure callback function
	onError := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		fmt.Println("Error calling getFileProperties:", args[0])
		done <- FileProperties{}
		return nil
	})

	// Bind callback function to Promise
	promise.Call("then", onSuccess)
	promise.Call("catch", onError)

	// Wait for Promise to resolve
	result := <-done

	// Clean up callbacks
	onSuccess.Release()
	onError.Release()

	if result.Size == 0 && result.LastModified.IsZero() {
		return FileProperties{}, errors.New("error getting file properties")
	}
	return result, nil
}
