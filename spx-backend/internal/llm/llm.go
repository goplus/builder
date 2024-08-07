package llm

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
)

// llm max token limit
const maxToken = 800

// LLM models
const (
	_ = iota
	OpenAI
)

// methods
const (
	GET    = "GET"
	POST   = "POST"
	PUT    = "PUT"
	DELETE = "DELETE"
	PATCH  = "PATCH"
)

// ----------------------------------------------------------------------------

var (
	LLMConf = newLLMConf()
)

func newLLMConf() *llmConf {
	// get config from environment and return
	return &llmConf{
		baseUrl:      os.Getenv("LLM_BASE_URL"),
		apiKey:       os.Getenv("LLM_API_KEY"),
		model:        os.Getenv("LLM_MODEL"),
		backUpUrl:    os.Getenv("LLM_BACKUP_URL"),
		backUpAPIKey: os.Getenv("LLM_BACKUP_APIKEY"),
		backUpModel:  os.Getenv("LLM_BACKUP_MODEL"),
	}
}

// ----------------------------------------------------------------------------

// LLM config
type llmConf struct {
	baseUrl      string
	apiKey       string
	model        string
	backUpUrl    string
	backUpAPIKey string
	backUpModel  string
}

// LLM endpoint map
type apiEndPoint struct {
	endPoint string
	method   string
}

var llmMethodMap = map[string]apiEndPoint{
	"chat": {"/chat/completions", POST},
}

type llmChatRequestBody struct {
	Messages       Messages          `json:"messages"`
	Model          string            `json:"model"`
	MaxToken       int               `json:"max_token"`
	ResponseFormat llmResponseFormat `json:"response_format"`
	Stream         bool              `json:"stream"`
	SteamOptions   llmStreamOptions  `json:"stream_options"`
}

type MessageContent struct {
	Content string          `json:"content"`
	Role    ChatMessageRole `json:"role"`
}

type Messages []MessageContent

func CreateMessage() Messages {
	return Messages{}
}

func (msgs *Messages) PushMessages(role ChatMessageRole, prompt string) {
	msg := &MessageContent{
		Content: prompt,
		Role:    role,
	}
	*msgs = append(*msgs, *msg)
}

type llmResponseFormat struct {
	Type string `json:"type"`
}

type llmStreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}

type LlmResponseBody struct {
	ID      string               `json:"id"`
	Choices []llmResponseChoices `json:"choices"`
	Created int                  `json:"created"`
	Usage   llmUsage             `json:"usage"`
	Object  string               `json:"object"`
	Model   string               `json:"model"`
}

type llmUsage struct {
	CompletionTokens int `json:"completion_tokens"`
	PromptTokens     int `json:"prompt_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type llmResponseChoices struct {
	FinishReason string         `json:"finish_reason"` // "stop" or "length" or "content_filter" or "tool_calls"
	Index        int            `json:"index"`
	Message      MessageContent `json:"message"`
}

func (c *llmResponseChoices) SuccessFinish() bool {
	return c.FinishReason == "stop"
}

type ChatMessageRole string

const (
	ChatRequestBodyMessagesRoleSystem    ChatMessageRole = "system"
	ChatRequestBodyMessagesRoleUser      ChatMessageRole = "user"
	ChatRequestBodyMessagesRoleAssistant ChatMessageRole = "assistant"
)

func createLLMRequestBody(llmChatMessage []MessageContent) llmChatRequestBody {
	return llmChatRequestBody{
		Messages: llmChatMessage,
		Model:    LLMConf.model,
		MaxToken: maxToken,
		ResponseFormat: llmResponseFormat{
			Type: "json_object",
		},
		Stream:       false,
		SteamOptions: llmStreamOptions{},
	}
}

func CallLLM(llmChatMessage Messages) (responseBody LlmResponseBody, err error) {
	body := createLLMRequestBody(llmChatMessage)
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return
	}
	req, err := http.NewRequest(llmMethodMap["chat"].method, LLMConf.baseUrl+llmMethodMap["chat"].endPoint, bytes.NewBuffer(bodyJSON))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+LLMConf.apiKey)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			panic(err)
		}
	}(resp.Body)

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	err = json.Unmarshal(bodyBytes, &responseBody)
	if err != nil {
		return LlmResponseBody{}, err
	}
	return
}
