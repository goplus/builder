// Package qnaigc provides a Go client for the Qiniu API
package qnaigc

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Constants for API configuration
const (
	defaultBaseURL  = "https://api.qnaigc.com/v1"
	defaultTimeout  = 15 * time.Second
	defaultModel    = "deepseek-v3-0324"
	maxRetries      = 3
	retryDelay      = 500 * time.Millisecond
	userAgent       = "XBuilder Copilot/1.0"
	contentTypeJSON = "application/json"
)

type (
	// Client represents the main structure for interacting with the Qiniu API
	Client struct {
		apiKey     string       // API authentication key
		baseURL    string       // Base URL for API endpoints
		httpClient *http.Client // HTTP client for making requests
		userAgent  string       // User agent string for API requests
	}

	// ChatCompletionRequest represents the parameters for a chat completion request
	ChatCompletionRequest struct {
		Model       string    `json:"model"`                // Name of the model to use
		Messages    []Message `json:"messages"`             // Conversation history
		Temperature float64   `json:"temperature"`          // Sampling temperature
		TopP        float64   `json:"top_p,omitempty"`      // Top-p sampling cutoff
		MaxTokens   int       `json:"max_tokens,omitempty"` // Maximum number of tokens to generate
		Stream      bool      `json:"stream,omitempty"`     // Whether to stream the response
	}

	// Message represents a single message in the conversation
	Message struct {
		Role    string `json:"role"`    // Role of the message sender (system/user/assistant)
		Content string `json:"content"` // Content of the message
	}

	// ChatCompletionResponse represents the API response structure
	ChatCompletionResponse struct {
		ID      string `json:"id"`      // Unique identifier for the response
		Created int64  `json:"created"` // Timestamp of when the response was created
		Choices []struct {
			Message      Message `json:"message"`       // Generated message
			FinishReason string  `json:"finish_reason"` // Reason why the generation stopped
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`     // Number of tokens in the prompt
			CompletionTokens int `json:"completion_tokens"` // Number of tokens in the completion
			TotalTokens      int `json:"total_tokens"`      // Total number of tokens used
		} `json:"usage"`
		Error *APIError `json:"error,omitempty"` // Error information if request failed
	}

	// ChatCompletionStream represents the API stream response structure
	ChatCompletionStream struct {
		Choices []struct {
			Delta struct {
				Content string `json:"content"`
			} `json:"delta"`
		} `json:"choices"`
	}

	// APIError represents the error response from the API
	APIError struct {
		Code    int    `json:"code"`    // Error code
		Message string `json:"message"` // Error message
		Type    string `json:"type"`    // Error type
	}
)

// Error implements the error interface for APIError
func (e *APIError) Error() string {
	return fmt.Sprintf("Qiniu API Error %d (%s): %s", e.Code, e.Type, e.Message)
}

// NewClient creates a new instance of the Qiniu API client
// apiKey: The API key for authentication
// opts: Optional configuration options
func NewClient(apiKey string, opts ...ClientOption) *Client {
	transport := &http.Transport{
		ResponseHeaderTimeout: defaultTimeout,
	}

	c := &Client{
		apiKey:     apiKey,
		baseURL:    defaultBaseURL,
		httpClient: &http.Client{Transport: transport},
		userAgent:  userAgent,
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

// ClientOption defines a function type for client configuration
type ClientOption func(*Client)

// WithHTTPClient sets a custom HTTP client for the API client
func WithHTTPClient(client *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = client
	}
}

// WithClientBaseURL sets a custom base URL for the API client
func WithClientBaseURL(url string) ClientOption {
	return func(c *Client) {
		c.baseURL = url
	}
}

// CreateChatCompletion sends a chat completion request to the API
// ctx: Context for the request
// req: The chat completion request parameters
// Returns the API response or an error
func (c *Client) CreateChatCompletion(
	ctx context.Context,
	req *ChatCompletionRequest,
) (*ChatCompletionResponse, error) {
	var resp *ChatCompletionResponse
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err = c.sendRequest(ctx, req)
		if shouldRetry(err) {
			time.Sleep(retryDelay)
			continue
		}
		break
	}

	return resp, err
}

// StreamChatCompletion sends a chat completion request to the API
// ctx: Context for the request
// req: The chat completion request parameters
// Returns the API response or an error
func (c *Client) StreamChatCompletion(
	ctx context.Context,
	req *ChatCompletionRequest,
) (io.ReadCloser, error) {

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	err := encoder.Encode(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request failed: %w", err)
	}

	endpoint := c.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	httpReq.Header.Set("Content-Type", contentTypeJSON)
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Accept", "text/event-stream")
	httpReq.Header.Set("User-Agent", c.userAgent)

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}

	if httpResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(httpResp.Body)
		httpResp.Body.Close()
		return nil, fmt.Errorf("API error: %s | %s", httpResp.Status, body)
	}

	return &StreamReader{
		body:    httpResp.Body,
		scanner: bufio.NewScanner(httpResp.Body),
		buffer:  bytes.NewBuffer(nil),
	}, nil
}

// sendRequest handles the actual HTTP request to the API
// ctx: Context for the request
// req: The request parameters
// Returns the API response or an error
func (c *Client) sendRequest(
	ctx context.Context,
	req *ChatCompletionRequest,
) (*ChatCompletionResponse, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request failed: %w", err)
	}

	endpoint := c.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	httpReq.Header.Set("Content-Type", contentTypeJSON)
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("User-Agent", c.userAgent)

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body failed: %w", err)
	}

	if httpResp.StatusCode >= 400 {
		var apiErr ChatCompletionResponse
		if err := json.Unmarshal(respBody, &apiErr); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", httpResp.StatusCode, string(respBody))
		}
		return nil, apiErr.Error
	}

	var response ChatCompletionResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("unmarshal response failed: %w", err)
	}

	if response.Error != nil {
		return nil, response.Error
	}

	return &response, nil
}

// shouldRetry determines if a request should be retried based on the error
// Returns true if the request should be retried
func shouldRetry(err error) bool {
	if err == nil {
		return false
	}

	if apiErr, ok := err.(*APIError); ok {
		switch apiErr.Code {
		case 429, 500, 503:
			return true
		}
	}
	return false
}

// Helper functions for creating different types of messages

// NewSystemMessage creates a new system message
func NewSystemMessage(content string) Message {
	return Message{Role: "system", Content: content}
}

// NewUserMessage creates a new user message
func NewUserMessage(content string) Message {
	return Message{Role: "user", Content: content}
}

// NewAssistantMessage creates a new assistant message
func NewAssistantMessage(content string) Message {
	return Message{Role: "assistant", Content: content}
}
