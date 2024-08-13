package internal

import (
	"encoding/json"
	"syscall/js"
)

type ResponseType string

const (
	Diagnostics   ResponseType = "diagnostics"
	Definition    ResponseType = "definition"
	InlayHint     ResponseType = "inlayHint"
	CompleteItems ResponseType = "completeItems"
	Types         ResponseType = "types"
)

type Reply struct {
	Type    ResponseType `json:"type"`
	OK      bool         `json:"ok"`
	Content interface{}  `json:"content"`
}

func NewReply(responseType ResponseType, content any) js.Value {
	r := Reply{
		Type:    responseType,
		Content: content,
		OK:      true,
	}
	value, err := Struct2JSValue(r)
	if err != nil {
		return js.ValueOf(`{"type":"","ok":"false","content":{}}`)
	}
	return value
}

func Struct2JSValue(stru interface{}) (js.Value, error) {
	json, err := json.Marshal(stru)
	if err != nil {
		return js.ValueOf(""), err
	}
	return js.ValueOf(string(json)), nil
}
