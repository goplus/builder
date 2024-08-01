package controller

// Chat actions
const (
	_           = iota
	ExplainChat = 1 << (iota - 1)
	CommentChat
	FixCodeChat
)

// Task actions
const (
	_           = iota
	SuggestTask = 1 << (iota - 1)
)

// Languages enum
const (
	_ = iota
	En
	Zh
)

// use input delimiter to separate user input from template.
const userInputDelimiter = "##%%##"

type AIStartChatParams struct {
	ChatAction     int            `json:"chatAction"`
	ProjectContext ProjectContext `json:"projectContext"`
	UserInput      string         `json:"userInput"`
	UserLang       int            `json:"userLang"`
}

type AIChatParams struct {
	UserInput string `json:"userInput"`
}

type AITaskParams struct {
	TaskAction     int            `json:"taskAction"`
	ProjectContext ProjectContext `json:"projectContext"`
	UserCode       string         `json:"userCode"`
	UserCursor     Cursor         `json:"userCursor"`
}

type ProjectContext struct {
	ProjectName     string            `json:"projectName"`
	ProjectVariable []ProjectVariable `json:"projectVariable"`
	ProjectCode     []Code            `json:"projectCode"`
}

type ProjectVariable struct {
	Type string `json:"type"` // Sprites, Sounds, Stage, Costumes
	Name string `json:"name"`
}

type Code struct {
	Type string `json:"type"` // Sprites, Stage
	Name string `json:"name"`
	Src  string `json:"src"`
}

type Cursor struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

func getUserInputLanguage(userLang int) string {
	switch userLang {
	case En:
		return "english"
	case Zh:
		return "chinese"
	default:
		return "en"
	}
}

func templateGenerator() string {
	return ""
}
