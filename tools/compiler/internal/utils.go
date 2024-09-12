package internal

import (
	"encoding/json"
	"syscall/js"
)

type Reply struct {
	OK      bool        `json:"ok"`
	Content interface{} `json:"content"`
}

func NewReply(content any, err error) js.Value {
	if err != nil {
		return js.ValueOf(`{"ok":false,"content":null}`)
	}
	r := Reply{
		Content: content,
		OK:      true,
	}
	value, err := Struct2JSValue(r)
	if err != nil {
		return js.ValueOf(`{"ok":false,"content":null}`)
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
