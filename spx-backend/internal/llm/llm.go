package llm

import (
	"bytes"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// llm max token limit
const maxToken = 800

// methods
const (
	GET    = "GET"
	POST   = "POST"
	PUT    = "PUT"
	DELETE = "DELETE"
	PATCH  = "PATCH"
)

type Client struct {
	Config Conf
	Client *http.Client
}

func NewLLMClientWithConfig(config *Conf) *Client {
	return &Client{Config: *config, Client: &http.Client{Timeout: 10 * time.Second}}
}

// LLM config
type Conf struct {
	BaseUrl      string
	ApiKey       string
	Model        string
	BackUpUrl    string
	BackUpAPIKey string
	BackUpModel  string
}

// LLM endpoint map
type apiEndPoint struct {
	endPoint string
	method   string
}

type LLMMethods string

const (
	LLMChatMethod LLMMethods = "chat"
)

var llmMethodMap = map[LLMMethods]apiEndPoint{
	LLMChatMethod: {"/chat/completions", POST},
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

func (msgs *Messages) Scan(value interface{}) error {
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = b
	case string:
		b = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}
	return json.Unmarshal(b, msgs)
}

func (msgs Messages) Value() (driver.Value, error) {
	return json.Marshal(msgs)
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

func (c *Client) createLLMRequestBody(llmChatMessage []MessageContent) llmChatRequestBody {
	return llmChatRequestBody{
		Messages: llmChatMessage,
		Model:    c.Config.Model,
		MaxToken: maxToken,
		ResponseFormat: llmResponseFormat{
			Type: "json_object",
		},
		Stream:       false,
		SteamOptions: llmStreamOptions{},
	}
}

func (c *Client) CallLLM(llmChatMessage Messages) (responseBody LlmResponseBody, err error) {
	body := c.createLLMRequestBody(llmChatMessage)
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return LlmResponseBody{}, fmt.Errorf("failed to marshal request body: %w", err)
	}
	req, err := http.NewRequest(llmMethodMap["chat"].method, c.Config.BaseUrl+llmMethodMap["chat"].endPoint, bytes.NewBuffer(bodyJSON))
	if err != nil {
		return LlmResponseBody{}, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Config.ApiKey)
	client := c.Client
	resp, err := client.Do(req)
	if err != nil {
		return LlmResponseBody{}, fmt.Errorf("failed to send HTTP request: %w", err)
	}
	defer func(Body io.ReadCloser) {
		if cerr := Body.Close(); cerr != nil {
			log.Printf("failed to close response body: %v", cerr)
		}
	}(resp.Body)

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return LlmResponseBody{}, fmt.Errorf("failed to read response body: %w", err)
	}

	err = json.Unmarshal(bodyBytes, &responseBody)
	if err != nil {
		return LlmResponseBody{}, fmt.Errorf("failed to unmarshal response body: %w", err)
	}
	return
}
