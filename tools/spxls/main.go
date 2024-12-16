package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"syscall/js"

	"github.com/goplus/builder/tools/spxls/internal/jsonrpc2"
	"github.com/goplus/builder/tools/spxls/internal/server"
	"github.com/goplus/builder/tools/spxls/internal/vfs"
)

// Spxls implements a lightweight Go+ language server for spx that runs in the
// browser using WebAssembly.
type Spxls struct {
	messageReplier js.Value
	server         *server.Server
}

// NewSpxls creates a new instance of [Spxls].
func NewSpxls(this js.Value, args []js.Value) any {
	if len(args) != 2 {
		return errors.New("NewSpxls: expected 2 arguments")
	}
	if args[0].Type() != js.TypeFunction {
		return errors.New("NewSpxls: filesProvider argument must be a function")
	}
	if args[1].Type() != js.TypeFunction {
		return errors.New("NewSpxls: messageReplier argument must be a function")
	}
	filesProvider := args[0]
	s := &Spxls{
		messageReplier: args[1],
	}
	s.server = server.New(vfs.NewMapFS(func() map[string][]byte {
		files := filesProvider.Invoke()
		return ConvertJSFilesToMap(files)
	}), s)
	return js.ValueOf(map[string]any{
		"handleMessage": JSFuncOfWithError(s.HandleMessage),
	})
}

// HandleMessage handles incoming LSP messages from the client.
func (s *Spxls) HandleMessage(this js.Value, args []js.Value) any {
	if len(args) != 1 {
		return errors.New("Spxls.HandleMessage: expected 1 argument")
	}
	if args[0].Type() != js.TypeObject {
		return errors.New("Spxls.HandleMessage: message argument must be an object")
	}
	rawMessage := js.Global().Get("JSON").Call("stringify", args[0]).String()
	message, err := jsonrpc2.DecodeMessage([]byte(rawMessage))
	if err != nil {
		return fmt.Errorf("Spxls.HandleMessage: %w", err)
	}
	if err := s.server.HandleMessage(message); err != nil {
		return fmt.Errorf("Spxls.HandleMessage: %w", err)
	}
	return nil
}

// ReplyMessage sends a message back to the client via s.messageReplier.
func (s *Spxls) ReplyMessage(m jsonrpc2.Message) (err error) {
	rawMessage, err := json.Marshal(m)
	if err != nil {
		return err
	}

	// Catch potential panics during JavaScript execution.
	defer func() {
		if r := recover(); r != nil {
			if jsErr, ok := r.(js.Error); ok {
				err = fmt.Errorf("client error: %w", jsErr)
			} else {
				err = fmt.Errorf("client panic: %v", r)
			}
		}
	}()

	message := js.Global().Get("JSON").Call("parse", string(rawMessage))
	s.messageReplier.Invoke(message)
	return nil
}

// JSFuncOfWithError returns a function to be used by JavaScript that can return
// an error.
func JSFuncOfWithError(fn func(this js.Value, args []js.Value) any) js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		result := fn(this, args)
		if err, ok := result.(error); ok {
			return js.Global().Get("Error").New(err.Error())
		}
		return result
	})
}

// JSUint8ArrayToBytes converts a JavaScript Uint8Array to a []byte.
func JSUint8ArrayToBytes(uint8Array js.Value) []byte {
	b := make([]byte, uint8Array.Length())
	js.CopyBytesToGo(b, uint8Array)
	return b
}

// ConvertJSFilesToMap converts a JavaScript object of files to a map.
func ConvertJSFilesToMap(files js.Value) map[string][]byte {
	if files.Type() != js.TypeObject {
		return nil
	}
	result := make(map[string][]byte)
	keys := js.Global().Get("Object").Call("keys", files)
	for i := range keys.Length() {
		key := keys.Index(i).String()
		value := files.Get(key)
		if value.InstanceOf(js.Global().Get("Object")) {
			result[key] = JSUint8ArrayToBytes(value.Get("content"))
		}
	}
	return result
}

func main() {
	js.Global().Set("NewSpxls", JSFuncOfWithError(NewSpxls))
	select {}
}
