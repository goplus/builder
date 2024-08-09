package internal

import (
	"encoding/json"
	"syscall/js"
)

func Struct2JSValue(stru interface{}) (js.Value, error) {
	json, err := json.Marshal(stru)
	if err != nil {
		return js.ValueOf(""), err
	}
	return js.ValueOf(string(json)), nil
}
