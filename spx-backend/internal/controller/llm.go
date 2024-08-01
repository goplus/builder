package controller

import (
	"fmt"
	"time"
)

// max chat length
const maxChatLength = 20

// max input length
const maxInputLength = 1000

// expire time
const expireTime = time.Hour * 2

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

// LLM models
const (
	_ = iota
	OpenAI
)

// use input delimiter to separate user input from template.
const userInputDelimiter = "##%%##"

var (
	chatMapManager = NewChatMapManager()
)

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

type AIResp struct {
	ID          string `json:"id"`
	RespMessage string `json:"respMessage"`
}

func (resp AIResp) ParesAsSuggestTask() SuggestTaskResp {
	//TODO(callum-chan): parse as suggest task
	return SuggestTaskResp{}
}

func (resp AIResp) ParesAsChat() ChatResp {
	//TODO(callum-chan): parse as chat
	return ChatResp{}
}

type ChatResp struct {
	Id            string   `json:"id"`
	RespMessage   string   `json:"respMessage"`
	RespQuestions []string `json:"respQuestions"`
}

type SuggestTaskResp struct {
	TaskAction   int           `json:"taskAction"`
	CodeSuggests []CodeSuggest `json:"codeSuggests"`
}

type CodeSuggest struct {
	Label      string `json:"label"`
	InsertText string `json:"insertText"`
}

func (projCtx ProjectContext) String() string {
	str := "ProjectName:" + projCtx.ProjectName + "\n"

	str += "ProjectVariable:"
	for _, variable := range projCtx.ProjectVariable {
		str += fmt.Sprintf("Variable Type: %s, Name: %s\n", variable.Type, variable.Name)
	}

	str += "ProjectCode:"
	for _, c := range projCtx.ProjectCode {
		str += fmt.Sprintf("Code Type: %s, Name: %s, Src: %s\n", c.Type, c.Name, c.Src)
	}

	return str
}

type Cursor struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type ChatMapManager struct {
	chatMap map[string]*Chat
}

func NewChatMapManager() *ChatMapManager {
	return &ChatMapManager{
		chatMap: make(map[string]*Chat),
	}
}

func (m *ChatMapManager) StoreChat(chat *Chat) error {
	if value, ok := m.chatMap[chat.ID]; ok {
		return fmt.Errorf("chat with id %s already exists", value.ID)
	}
	m.chatMap[chat.ID] = chat
	return nil
}

func (m *ChatMapManager) GetChat(id string) (*Chat, bool) {
	chat, found := m.chatMap[id]
	return chat, found
}

func (m *ChatMapManager) DeleteChat(id string) {
	delete(m.chatMap, id)
}

func DeleteExpireChat() {
	for _, chat := range chatMapManager.chatMap {
		if chat.IsExpired() {
			chatMapManager.DeleteChat(chat.ID)
		}
	}
}

type Chat struct {
	ID                string         `json:"id"`
	ChatAction        int            `json:"chatAction"`
	CurrentChatLength int            `json:"currentChatLength"`
	ProjectContext    ProjectContext `json:"projectContext"`
	CreatAt           time.Time      `json:"creatAt"`
}

func NewChat(chatAction int, ctx ProjectContext) *Chat {
	return &Chat{
		ID:                "",
		ChatAction:        chatAction,
		CurrentChatLength: 1,
		ProjectContext:    ctx,
		CreatAt:           time.Now(),
	}
}

func (c *Chat) NextInput(userInput string) (string, error) {
	if c.IsExpired() {
		chatMapManager.DeleteChat(c.ID)
		return "", fmt.Errorf("chat is expired")
	}
	c.CurrentChatLength++
	//TODO(callum-chan): next call
	return "", nil
}

func (c *Chat) IsExpired() bool {
	return time.Since(c.CreatAt) > expireTime
}

func getUserInputLanguage(userLang int) string {
	switch userLang {
	case En:
		return "english"
	case Zh:
		return "chinese"
	default:
		return "english"
	}
}

func checkInputLength(input string) bool {
	return len(input) < maxInputLength
}

func chatPromptGenerator(chat Chat) string {
	//TODO(callum-chan): prompt template
	return ""
}

func (p AITaskParams) taskPromptGenerator() string {
	//TODO(callum-chan): prompt template
	return ""
}

func CallLLM(input string, id string) (AIResp, error) {
	//TODO(callum-chan): call llm api
	return AIResp{}, nil
}

func StartChat(p AIStartChatParams) (ChatResp, error) {
	chat := NewChat(p.ChatAction, p.ProjectContext)
	err := chatMapManager.StoreChat(chat)
	if err != nil {
		fmt.Println(err)
		return ChatResp{}, err
	}
	prompt := chatPromptGenerator(*chat)
	resp, err := CallLLM(prompt, chat.ID)
	if err != nil {
		fmt.Println(err)
		return ChatResp{}, err
	}
	return resp.ParesAsChat(), nil
}

func StartTask(p AITaskParams) (SuggestTaskResp, error) {
	resp, err := CallLLM(p.taskPromptGenerator(), "")
	if err != nil {
		fmt.Println(err)
		return SuggestTaskResp{}, err
	}
	return resp.ParesAsSuggestTask(), nil
}
