package internal

var inlayHintFuncList = []string{"play"}

type inlayHintType string

const (
	hintParameter inlayHintType = "parameter"
	hintFunction  inlayHintType = "function"
)

type inlayHint struct {
	*funcParameter
	Type inlayHintType `json:"type"`
}

func checkFuncNameInList(fnName string) bool {
	for _, name := range inlayHintFuncList {
		if fnName == name {
			return true
		}
	}
	return false
}
