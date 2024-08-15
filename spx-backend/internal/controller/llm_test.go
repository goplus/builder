package controller

import (
	"context"
	"github.com/goplus/builder/spx-backend/internal/llm"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"os"
	"testing"
	"time"
)

func createFullProjectContext() ProjectContext {
	return ProjectContext{
		ProjectName: "spxProject",
		ProjectVariable: []ProjectVariable{
			{
				Type: "Sprites",
				Name: "Sprites1",
			},
		},
		ProjectCode: []Code{
			{
				Type: "Sprites",
				Name: "Sprites1",
				Src:  "onStart => { \n  \n }",
			},
		},
	}

}

func createFullStartChatParams() AIStartChatParams {
	return AIStartChatParams{
		ChatAction:     1,
		ProjectContext: createFullProjectContext(),
		UserInput:      "onStart => { \n  \n }",
		UserLang:       1,
	}
}

func createFullTaskParams() AITaskParams {
	return AITaskParams{
		TaskAction:     1,
		ProjectContext: createFullProjectContext(),
		UserCode:       "onStart => { \n  \n }",
		UserCursor: Cursor{
			Line:   1,
			Column: 10,
		},
	}
}

func createFullChat(chatAction ChatActions, ctx ProjectContext, lang int, uid string) *chat {
	c := newChat(chatAction, ctx, lang)
	c.ID = uid
	systemPrompt := chatPromptGenerator(*c)
	c.Messages = createLLMRequestBodyMessagesWithProjectCtx(systemPrompt, "user say hello test", ctx)
	return c
}

func createStartChatParams(chatAction int, userInput string, userLang int) AIStartChatParams {
	return AIStartChatParams{
		ChatAction:     chatAction,
		ProjectContext: createFullProjectContext(),
		UserInput:      userInput,
		UserLang:       userLang,
	}
}

func createChatParams(userInput string) AIChatParams {
	return AIChatParams{UserInput: userInput}
}

func createTaskParams(taskAction int, userCode string, userCursor Cursor) AITaskParams {
	return AITaskParams{
		TaskAction:     taskAction,
		ProjectContext: createFullProjectContext(),
		UserCode:       userCode,
		UserCursor:     userCursor,
	}
}

func TestLLM(t *testing.T) {

	t.Run("ValidateChatParams", func(t *testing.T) {
		params := createFullStartChatParams()
		ok, msg := params.Validate()
		assert.True(t, ok, "Expected validation to pass with full valid parameters, but it failed: %s", msg)
	})

	t.Run("ValidateChatParamsWithUserInputCheckFailed", func(t *testing.T) {
		params := createFullStartChatParams()
		params.UserInput = ""
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "no input", msg, "Unexpected validation message")
	})

	t.Run("ValidateChatParamsWithUserLangCheckFailed", func(t *testing.T) {
		params := createFullStartChatParams()
		params.ChatAction = -1
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "action not found", msg, "Unexpected validation message")
	})

	t.Run("ValidateChatParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullStartChatParams()
		params.ProjectContext.ProjectName = ""
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateChatParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullStartChatParams()
		params.ProjectContext.ProjectCode = nil
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateChatParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullStartChatParams()
		params.ProjectContext.ProjectVariable = nil
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateNextChat", func(t *testing.T) {
		params := AIChatParams{UserInput: "test..."}
		ok, msg := params.Validate()
		assert.True(t, ok, "Expected validation to pass with full valid parameters, but it failed: %s", msg)
	})

	t.Run("ValidateTaskParams", func(t *testing.T) {
		params := createFullTaskParams()
		ok, msg := params.Validate()
		assert.True(t, ok, "Expected validation to pass with full valid parameters, but it failed: %s", msg)
	})

	t.Run("ValidateTaskParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.ProjectContext.ProjectName = ""
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateTaskParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.ProjectContext.ProjectCode = nil
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateTaskParamsWithProjectCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.ProjectContext.ProjectVariable = nil
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "project check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateTaskParamsWithActionCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.TaskAction = -1
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "action not found", msg, "Unexpected validation message")
	})

	t.Run("ValidateTaskParamsWithCursorCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.UserCursor.Line = -1
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "cursor check failed", msg, "Unexpected validation message")
	})

	t.Run("ValidateTaskParamsWithCursorCheckFailed", func(t *testing.T) {
		params := createFullTaskParams()
		params.UserCursor.Column = -1
		ok, msg := params.Validate()
		assert.False(t, ok, "Expected validation to fail when required field is missing, but it passed")
		assert.Equal(t, "cursor check failed", msg, "Unexpected validation message")
	})

	t.Run("CheckTaskPrompt", func(t *testing.T) {
		params := createFullTaskParams()
		sysPrompt, userPrompt := params.taskPromptGenerator()
		assert.Equal(t, "Generate the suggest of code to complete the code, those suggest will follow behind user's cursor, users code will be inside of the delimiter. Your task is only about generate code suggest to complete the code, you have to remember your task is generate code suggest. This is the user's cursor: line: 1, column: 10. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {suggestions: []{label, insert_text}}. The number of list length is 3. Here is the explain about the response json object: label will shows inside of user's complete menu to tell people some info about the insert code, label will be only one word in most of time. insert_text is the code you have to insert into the user's code after user's cursor. You don't need to explain the json object. JUST JSON", sysPrompt, "System prompt generate failed.")
		assert.Equal(t, "Project: ProjectName:spxProject\nProjectVariable:Variable Type: Sprites, Name: Sprites1\nProjectCode:Code Type: Sprites, Name: Sprites1, Src: onStart => { \n  \n }\n, Code arround user's cursor: onStart => { \n  \n }", userPrompt, "User prompt generate failed.")
	})

	t.Run("CheckChatExpired", func(t *testing.T) {
		chat := createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01")
		chat.CreatAt = time.Now().Add(-3 * time.Hour)
		f := chat.isExpired()
		assert.True(t, f, "Expect expired but not")
	})

	t.Run("CheckChatMessages", func(t *testing.T) {
		chat := createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01")
		assert.Equal(t, llm.Messages{
			{
				Content: "This is a goplus spx project created by user. Explain the code of user input. Your task is only about explain, you have to remember your task is explain. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want to get explain about, the UserEntireProject is the entire project helps you to understand the project. Generate 4 more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. Reply in the language of english, the user's language is english. Keep the response template. ",
				Role:    "system",
			},
			{
				Content: `{ "UserInput": "user say hello test", "UserEntireProject": "ProjectName:spxProject
ProjectVariable:Variable Type: Sprites, Name: Sprites1
ProjectCode:Code Type: Sprites, Name: Sprites1, Src: onStart => { 
  
 }
"`,
				Role: "user",
			},
		}, chat.getMessages())
	})

	t.Run("CheckChatMessagePush", func(t *testing.T) {
		chat := createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01")
		chat.pushMessage(llm.ChatRequestBodyMessagesRoleAssistant, "assistant reply")
		assert.Equal(t, llm.Messages{
			{
				Content: "This is a goplus spx project created by user. Explain the code of user input. Your task is only about explain, you have to remember your task is explain. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want to get explain about, the UserEntireProject is the entire project helps you to understand the project. Generate 4 more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. Reply in the language of english, the user's language is english. Keep the response template. ",
				Role:    "system",
			},
			{
				Content: `{ "UserInput": "user say hello test", "UserEntireProject": "ProjectName:spxProject
ProjectVariable:Variable Type: Sprites, Name: Sprites1
ProjectCode:Code Type: Sprites, Name: Sprites1, Src: onStart => { 
  
 }
"`,
				Role: "user",
			},
			{
				Content: "assistant reply",
				Role:    "assistant",
			},
		}, chat.getMessages())
	})

	t.Run("CheckChatPrompt", func(t *testing.T) {
		explainChat := createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01-english")
		explainSystemPrompt := chatPromptGenerator(*explainChat)
		assert.Equal(t, "This is a goplus spx project created by user. Explain the code of user input. Your task is only about explain, you have to remember your task is explain. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want to get explain about, the UserEntireProject is the entire project helps you to understand the project. Generate 4 more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. Reply in the language of english, the user's language is english. Keep the response template. ", explainSystemPrompt, "System prompt generate failed.")
		commentChat := createFullChat(CommentChat, createFullProjectContext(), 2, "llm-02-chinese")
		commentSystemPrompt := chatPromptGenerator(*commentChat)
		assert.Equal(t, "This is a goplus spx project created by user. Comment the code of user input. Your task is only about comment code, you have to remember your task is comment code. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want you to comment it, the UserEntireProject is the entire project helps you to understand the project. Generate 4 more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. Reply in the language of chinese, the user's language is chinese. Keep the response template. ", commentSystemPrompt, "System prompt generate failed.")
		fixcodeChat := createFullChat(FixCodeChat, createFullProjectContext(), 1, "llm-03-english")
		fixcodeSystemPrompt := chatPromptGenerator(*fixcodeChat)
		assert.Equal(t, "This is a goplus spx project created by user. Fix the code if there is some problem. Your task is only about fix code if there is some problem, you have to remember your task is comment code. The user input will be two part as a json { UserInput, UserEntireProject }, the userInput will be a code snippet of where user want you to fix, the UserEntireProject is the entire project helps you to understand the project. Generate 4 more question for this current chat, this question will shows to the user, and the user will choose one of them to continue the chat, so the question you generate have to keep highly close to the previous chat. You have to use the following template to generate the response, do keep remember this template will be your response. Your response will be a json object with following keys: {resp_message, []resp_questions}. Here is the explain about the response json object: response_message is the response message for the user you have to reply as markdown. response_suggests is the suggest question for the user to continue chat, each of it will only be one sentence. And the next user input will be one of those questions. Reply in the language of english, the user's language is english. Keep the response template. ", fixcodeSystemPrompt, "System prompt generate failed.")
	})

	t.Run("CheckChatMapManagerStore", func(t *testing.T) {
		cm := newChatMapManager()
		err := cm.storeChat(createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01"))
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
	})

	t.Run("CheckChatMapManagerGet", func(t *testing.T) {
		cm := newChatMapManager()
		err := cm.storeChat(createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01"))
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		_, ok := cm.getChat("llm-01")
		assert.True(t, ok, "Expected get a 'llm-01' chat, but found nothing.")
	})

	t.Run("CheckChatMapManagerDelete", func(t *testing.T) {
		cm := newChatMapManager()
		err := cm.storeChat(createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01"))
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		err = cm.storeChat(createFullChat(ExplainChat, createFullProjectContext(), 2, "llm-02"))
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		err = cm.storeChat(createFullChat(FixCodeChat, createFullProjectContext(), 1, "llm-03"))
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		cm.deleteChat("llm-01")
		_, ok := cm.getChat("llm-01")
		assert.False(t, ok, "Expected success delete 'llm-01' chat, but still exist.")
		_, ok = cm.getChat("llm-02")
		assert.True(t, ok, "Expected get a 'llm-02' chat, but found nothing.")
	})

	t.Run("CheckChatMapManagerDeleteExpireChat", func(t *testing.T) {
		chat1 := createFullChat(ExplainChat, createFullProjectContext(), 1, "llm-01")
		err := chatMapMgr.storeChat(chat1)
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		chat2 := createFullChat(ExplainChat, createFullProjectContext(), 2, "llm-02")
		chat2.CreatAt = time.Now().Add(-3 * time.Hour)
		err = chatMapMgr.storeChat(chat2)
		if err != nil {
			assert.Errorf(t, err, "error while store a new chat")
		}
		DeleteExpireChat()
		_, ok := chatMapMgr.getChat("llm-02")
		assert.False(t, ok, "Expected 'llm-02' is already delete, but still exist.")
	})
}

func TestCallLLM(t *testing.T) {

	// This test is third-party model test, test for llm clent.

	if os.Getenv("CI") != "" {
		t.Skip("Skipping test in CI environment")
	}

	t.Run("TestStartExplainChat", func(t *testing.T) {
		setTestEnv(t)
		ctx := context.Background()
		ctx = newContextWithTestUser(ctx)
		ctrl, err := New(ctx)
		require.NoError(t, err)
		resp, err := ctrl.StartChat(ctx, createStartChatParams(int(ExplainChat), "onStart => { \n  \n }", 2))
		require.NoError(t, err)
		assert.Equal(t, 4, len(resp.RespQuestions))
		assert.True(t, len(resp.RespMessage) > 0, "llm return message should longer than 1 word. ")
		assert.NotEmpty(t, resp.ID, "response body shouldn't empty with id. ")
	})

	t.Run("TestStartCommentChat", func(t *testing.T) {
		setTestEnv(t)
		ctx := context.Background()
		ctx = newContextWithTestUser(ctx)
		ctrl, err := New(ctx)
		require.NoError(t, err)
		resp, err := ctrl.StartChat(ctx, createStartChatParams(int(CommentChat), "onStart => { \n  \n }", 2))
		require.NoError(t, err)
		assert.Equal(t, 4, len(resp.RespQuestions))
		assert.True(t, len(resp.RespMessage) > 0, "llm return message should longer than 1 word. ")
		assert.NotEmpty(t, resp.ID, "response body shouldn't empty with id. ")
	})

	t.Run("TestStartFixCodeChat", func(t *testing.T) {
		setTestEnv(t)
		ctx := context.Background()
		ctx = newContextWithTestUser(ctx)
		ctrl, err := New(ctx)
		require.NoError(t, err)
		resp, err := ctrl.StartChat(ctx, createStartChatParams(int(FixCodeChat), "onStart => { \n  \n }", 2))
		require.NoError(t, err)
		assert.Equal(t, 4, len(resp.RespQuestions))
		assert.True(t, len(resp.RespMessage) > 0, "llm return message should longer than 1 word. ")
		assert.NotEmpty(t, resp.ID, "response body shouldn't empty with id. ")
	})

	t.Run("TestNextChat", func(t *testing.T) {
		setTestEnv(t)
		ctx := context.Background()
		ctx = newContextWithTestUser(ctx)
		ctrl, err := New(ctx)
		require.NoError(t, err)
		resp, err := ctrl.StartChat(ctx, createStartChatParams(int(FixCodeChat), "onStart => { \n  \n }", 2))
		require.NoError(t, err)
		assert.Equal(t, 4, len(resp.RespQuestions))
		assert.True(t, len(resp.RespMessage) > 0, "llm return message should longer than 1 word. ")
		assert.NotEmpty(t, resp.ID, "response id shouldn't be empty. ")
		chat, ok := chatMapMgr.getChat(resp.ID)
		assert.True(t, ok, "chat should be inside chat map manager")
		nextChatResp, err := ctrl.NextChat(ctx, chat.ID, createChatParams(resp.RespQuestions[0]))
		require.NoError(t, err)
		assert.Equal(t, 4, len(nextChatResp.RespQuestions))
		assert.True(t, len(nextChatResp.RespMessage) > 0, "llm return message should longer than 1 word. ")
		assert.NotEmpty(t, nextChatResp.ID, "response id shouldn't be empty. ")
	})

	t.Run("TestSuggestTask", func(t *testing.T) {
		setTestEnv(t)
		ctx := context.Background()
		ctx = newContextWithTestUser(ctx)
		ctrl, err := New(ctx)
		require.NoError(t, err)
		resp, err := ctrl.StartTask(ctx, createTaskParams(int(SuggestTask), `
onStart => {
   
}
`, Cursor{
			Line:   2,
			Column: 3,
		}))
		require.NoError(t, err)
		assert.True(t, len(resp.CodeSuggests) > 0, "response suggest should not be zero")
	})

}
