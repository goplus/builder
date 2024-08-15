package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/goplus/builder/spx-backend/internal/llm"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// max chat length
const maxChatLength = 20

// expire time of chat
const expireTime = time.Hour * 2

// max input length
const maxInputLength = 1000

// ChatActions enum of input actions. Will generate different prompts.
type ChatActions int

const (
	_                       = iota
	ExplainChat ChatActions = iota
	CommentChat ChatActions = iota
	FixCodeChat ChatActions = iota
)

func (action ChatActions) Validate() (bool, string) {
	validActions := []ChatActions{ExplainChat, CommentChat, FixCodeChat}
	for _, validActions := range validActions {
		if action == validActions {
			return true, ""
		}
	}
	return false, "action not found"
}

// TaskActions enum of task actions. Use AI to support.
type TaskActions int

const (
	_                       = iota
	SuggestTask TaskActions = iota
)

func (action TaskActions) Validate() (bool, string) {
	validActions := []TaskActions{SuggestTask}
	for _, validActions := range validActions {
		if action == validActions {
			return true, ""
		}
	}
	return false, "action not found"
}

// Languages enum
type UserLang int

const (
	_  UserLang = iota
	En UserLang = iota
	Zh UserLang = iota
)

// the number of more questions for user to continue the chat
const moreQuestionNumber = 4
const aiSuggestNumber = 3

// template
const (
	// template about actions
	commonTemplate      = "This is a goplus spx project created by user. "
	explainTemplate     = "Explain the code of user input. Your task is only about explain, you have to remember your task is explain. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want to get explain about, the UserEntireProject is the entire project helps you to understand the project. "
	commentTemplate     = "Comment the code of user input. Your task is only about comment code, you have to remember your task is comment code. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want you to comment it, the UserEntireProject is the entire project helps you to understand the project. "
	fixCodeTemplate     = "Fix the code if there is some problem. Your task is only about fix code if there is some problem, you have to remember your task is comment code. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want you to fix, the UserEntireProject is the entire project helps you to understand the project. "
	suggestTaskTemplate = "Generate the suggest of code to complete the code, those suggest will follow behind user's cursor, users code will be inside of the delimiter. Your task is only about generate code suggest to complete the code, you have to remember your task is generate code suggest. This is the user's cursor: line: %d, column: %d. "
	userInputTemplate   = "Please answer me with this question. "
	// template about response
	responseTemplate             = "You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. "
	suggestTaskResponseTemplate  = "You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {suggestions: []{label, insert_text}}. The number of list length is %d. Here is the explain about the response json object: label will shows inside of user's complete menu to tell people some info about the insert code, label will be only one word in most of time. insert_text is the code you have to insert into the user's code after user's cursor. You don't need to explain the json object. JUST JSON"
	generateMoreQuestionTemplate = "Generate %d more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. "
	regenerateQuestionTemplate   = "Please regenerate %d more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. "
	// response language limit template
	userLanguageReplyTemplate = "Reply in the language of %s, the user's language is %s. Keep the response template. "
)

var (
	// user's chat map manager.
	chatMapMgr = newChatMapManager()
)

// AIStartChatParams is the json object for the start chat request.
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

type ChatResp struct {
	ID            string   `json:"id"`
	RespMessage   string   `json:"resp_message"`
	RespQuestions []string `json:"resp_questions"`
}

func newChatResp(resp llm.LlmResponseBody, chat chat) ChatResp {
	responseContent := resp.Choices[0].Message.Content
	var chatResp ChatResp
	err := json.Unmarshal([]byte(responseContent), &chatResp)
	if err != nil {
		fmt.Println(err)
		return ChatResp{}
	}
	chatResp.ID = chat.ID
	return chatResp
}

type TaskResp struct {
	TaskAction   int           `json:"task_action"`
	CodeSuggests []CodeSuggest `json:"suggestions"`
	// ...
}

func newSuggestTaskResp(resp llm.LlmResponseBody) TaskResp {
	responseContent := resp.Choices[0].Message.Content
	var suggestTaskResp TaskResp
	err := json.Unmarshal([]byte(responseContent), &suggestTaskResp)
	if err != nil {
		return TaskResp{}
	}
	suggestTaskResp.TaskAction = int(SuggestTask)
	return suggestTaskResp
}

type CodeSuggest struct {
	Label      string `json:"label"`
	InsertText string `json:"insert_text"`
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

func (cursor *Cursor) Validate() (bool, string) {
	if cursor.Line <= 0 || cursor.Column <= 0 {
		return false, "cursor check failed"
	}
	return true, ""
}

func (params *AIStartChatParams) Validate() (bool, string) {
	if params.UserInput == "" {
		return false, "no input"
	}
	if params.ProjectContext.ProjectName == "" || len(params.ProjectContext.ProjectCode) == 0 || len(params.ProjectContext.ProjectVariable) == 0 {
		return false, "project check failed"
	}
	return ChatActions(params.ChatAction).Validate()
}

func (params *AIChatParams) Validate() (bool, string) {
	if params.UserInput == "" {
		return false, "no input"
	}
	return true, ""
}

func (params *AITaskParams) Validate() (bool, string) {
	if params.ProjectContext.ProjectName == "" || len(params.ProjectContext.ProjectCode) == 0 || len(params.ProjectContext.ProjectVariable) == 0 {
		return false, "project check failed"
	}
	if ok, msg := TaskActions(params.TaskAction).Validate(); !ok {
		return false, msg
	}
	if ok, msg := params.UserCursor.Validate(); !ok {
		return false, msg
	}
	return true, ""
}

type chatMapManager struct {
	chatMap map[string]*chat
}

func newChatMapManager() *chatMapManager {
	return &chatMapManager{
		chatMap: make(map[string]*chat),
	}
}

func (m *chatMapManager) storeChat(chat *chat) error {
	m.chatMap[chat.ID] = chat
	return nil
}

func (m *chatMapManager) getChat(id string) (*chat, bool) {
	chat, found := m.chatMap[id]
	return chat, found
}

func (m *chatMapManager) deleteChat(id string) {
	delete(m.chatMap, id)
}

func (m *chatMapManager) sync() {
	//TODO(callme-taota): have to support db sync(such as redis), in case of multi instance deploy.
}

func DeleteExpireChat() {
	for _, chat := range chatMapMgr.chatMap {
		if chat.isExpired() {
			chatMapMgr.deleteChat(chat.ID)
		}
	}
}

type chat struct {
	ID                string         `json:"id"`
	ChatAction        ChatActions    `json:"chatAction"`
	ChatLang          string         `json:"chatLang"`
	CurrentChatLength int            `json:"currentChatLength"`
	ProjectContext    ProjectContext `json:"projectContext"`
	CreatAt           time.Time      `json:"creatAt"`
	Messages          llm.Messages   `json:"messages"`
	User              *User          `json:"user"`
}

func newChat(chatAction ChatActions, ctx ProjectContext, lang int) *chat {
	return &chat{
		ID:                "",
		ChatAction:        chatAction,
		ChatLang:          getUserInputLanguage(lang),
		CurrentChatLength: 1,
		ProjectContext:    ctx,
		CreatAt:           time.Now(),
	}
}

func (c *chat) nextInput(ctrl *Controller, userInput string) (ChatResp, error) {
	if c.isExpired() {
		chatMapMgr.deleteChat(c.ID)
		err := fmt.Errorf("chat is expired")
		return ChatResp{}, err
	}
	if checkInputLength(userInput) {
		err := fmt.Errorf("input is too long: %d", len(userInput))
		return ChatResp{}, err
	}
	if c.CurrentChatLength >= maxChatLength {
		err := fmt.Errorf("chat is end")
		return ChatResp{}, err
	}
	c.CurrentChatLength++
	c.Messages.PushMessages(llm.ChatRequestBodyMessagesRoleUser, userInput)
	resp, err := ctrl.llm.CallLLM(c.getMessages())
	if err != nil {
		return ChatResp{}, err
	}
	c.pushMessage(llm.ChatRequestBodyMessagesRoleAssistant, resp.Choices[0].Message.Content)
	return newChatResp(resp, *c), nil
}

func (c *chat) isExpired() bool {
	return time.Since(c.CreatAt) > expireTime
}

func (c *chat) pushMessage(role llm.ChatMessageRole, content string) {
	c.Messages = append(c.Messages, llm.MessageContent{
		Role:    role,
		Content: content,
	})
}

func (c *chat) getMessages() llm.Messages {
	return c.Messages
}

func getUserInputLanguage(userLang int) string {
	switch UserLang(userLang) {
	case En:
		return "english"
	case Zh:
		return "chinese"
	default:
		return "english"
	}
}

func checkInputLength(input string) bool {
	return len(input) > maxInputLength
}

func chatPromptGenerator(chat chat) string {
	s := commonTemplate
	if chat.CurrentChatLength == 1 {
		switch chat.ChatAction {
		case ExplainChat:
			s += fmt.Sprintf(explainTemplate)
		case CommentChat:
			s += fmt.Sprintf(commentTemplate)
		case FixCodeChat:
			s += fmt.Sprintf(fixCodeTemplate)
		default:
			return ""
		}
	} else {
		s += fmt.Sprintf(userInputTemplate)
	}
	s += fmt.Sprintf(generateMoreQuestionTemplate, moreQuestionNumber)
	s += fmt.Sprintf(responseTemplate)
	s += fmt.Sprintf(userLanguageReplyTemplate, chat.ChatLang, chat.ChatLang)
	return s
}

func (params *AITaskParams) taskPromptGenerator() (string, string) {
	switch TaskActions(params.TaskAction) {
	case SuggestTask:
		sysPrompt := fmt.Sprintf(suggestTaskTemplate, params.UserCursor.Line, params.UserCursor.Column)
		sysPrompt += fmt.Sprintf(suggestTaskResponseTemplate, aiSuggestNumber)
		userInput := fmt.Sprintf("Project: %s, Code arround user's cursor: %s", params.ProjectContext.String(), params.UserCode)
		return sysPrompt, userInput
	default:
		return "", ""
	}
}

func createLLMRequestBodyMessages(sysInput, userInput string) llm.Messages {
	msg := llm.CreateMessage()

	msg.PushMessages(llm.ChatRequestBodyMessagesRoleSystem, sysInput)
	msg.PushMessages(llm.ChatRequestBodyMessagesRoleUser, userInput)

	return msg
}

func createLLMRequestBodyMessagesWithProjectCtx(sysInput, userInput string, projectContext ProjectContext) llm.Messages {
	msg := llm.CreateMessage()

	msg.PushMessages(llm.ChatRequestBodyMessagesRoleSystem, sysInput)
	msg.PushMessages(llm.ChatRequestBodyMessagesRoleUser, fmt.Sprintf(`{ "UserInput": "%s", "UserEntireProject": "%s"`, userInput, projectContext.String()))

	return msg
}

func (ctrl *Controller) StartChat(ctx context.Context, p AIStartChatParams) (ChatResp, error) {
	if ok, msg := p.Validate(); !ok {
		return ChatResp{}, errors.New(msg)
	}
	chat := newChat(ChatActions(p.ChatAction), p.ProjectContext, p.UserLang)
	user, ok := UserFromContext(ctx)
	if !ok {
		return ChatResp{}, ErrForbidden
	}
	chat.User = user
	systemPrompt := chatPromptGenerator(*chat)
	chat.Messages = createLLMRequestBodyMessagesWithProjectCtx(systemPrompt, p.UserInput, p.ProjectContext)
	resp, err := ctrl.llm.CallLLM(chat.getMessages())
	if err != nil {
		return ChatResp{}, err
	}
	chat.ID = resp.ID
	chat.pushMessage(llm.ChatRequestBodyMessagesRoleAssistant, resp.Choices[0].Message.Content)
	err = chatMapMgr.storeChat(chat)
	if err != nil {
		return ChatResp{}, err
	}
	return newChatResp(resp, *chat), nil
}

func (ctrl *Controller) NextChat(ctx context.Context, id string, p AIChatParams) (chatResp ChatResp, err error) {
	if ok, msg := p.Validate(); !ok {
		return ChatResp{}, errors.New(msg)
	}
	chat, ok := findChat(ctx, ctrl.db, id)
	if !ok {
		return ChatResp{}, errors.New("can't find chat")
	}
	chatUser := chat.User
	_, err = EnsureUser(ctx, chatUser.Name)
	if err != nil {
		return ChatResp{}, err
	}
	chatResp, err = chat.nextInput(ctrl, p.UserInput)
	err = updateChat(ctx, ctrl.db, chat)
	if err != nil {
		return ChatResp{}, err
	}
	return
}

func (ctrl *Controller) DeleteChat(ctx context.Context, id string) {
	chat, ok := chatMapMgr.getChat(id)
	if !ok {
		return
	}
	chatUser := chat.User
	_, err := EnsureUser(ctx, chatUser.Name)
	if err != nil {
		return
	}
	chatMapMgr.deleteChat(id)
	err = model.DeleteChatByID(ctx, ctrl.db, id)
	if err != nil {
		return
	}
}

func (ctrl *Controller) StartTask(ctx context.Context, p AITaskParams) (TaskResp, error) {
	if ok, msg := p.Validate(); !ok {
		return TaskResp{}, errors.New(msg)
	}
	resp, err := ctrl.llm.CallLLM(createLLMRequestBodyMessages(p.taskPromptGenerator()))
	if err != nil {
		return TaskResp{}, err
	}
	if p.TaskAction == int(SuggestTask) {
		return newSuggestTaskResp(resp), nil
	}
	return TaskResp{}, nil
}

func chat2ModelChat(chat chat) *model.LLMChat {
	return &model.LLMChat{
		ID:                chat.ID,
		CurrentChatLength: chat.CurrentChatLength,
		Messages:          chat.Messages,
		Owner:             chat.User.Name,
		Status:            model.StatusNormal,
	}
}

func saveChat(ctx context.Context, db *sql.DB, chat chat) error {
	return model.CreateChat(ctx, db, chat2ModelChat(chat))
}

func findChat(ctx context.Context, db *sql.DB, id string) (chat, bool) {
	if ok, err := model.CheckChatExistByID(ctx, db, id); !ok || err != nil {
		return chat{}, false
	}
	modelChat, err := model.ChatByID(ctx, db, id)
	if err != nil {
		return chat{}, false
	}
	c := chat{
		ID:                modelChat.ID,
		CurrentChatLength: modelChat.CurrentChatLength,
		CreatAt:           modelChat.CTime,
		Messages:          modelChat.Messages,
		User:              &User{Name: modelChat.Owner},
	}
	chatMapMgr.storeChat(&c)
	return c, true
}

func updateChat(ctx context.Context, db *sql.DB, chat chat) error {
	_, err := model.UpdateChatMessageByID(ctx, db, chat2ModelChat(chat))
	if err != nil {
		return err
	}
	return nil
}
