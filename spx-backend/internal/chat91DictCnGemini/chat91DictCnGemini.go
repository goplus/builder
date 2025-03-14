package chat91DictCnGemini

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/llmprompt"
)

type Chat91DictCnGeminiClient struct {
	endpoint string
	client   *http.Client
}

func NewChat91DictCnGeminiClient(endpoint string) *Chat91DictCnGeminiClient {
	return &Chat91DictCnGeminiClient{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// Escape function, whose purpose is to prevent prompt injection.
func escape(s string) string {
	return strings.ReplaceAll(s, "`", "\\`")
}

func (c *Chat91DictCnGeminiClient) ContrastCode(ctx context.Context, content, code1, code2 string) (bool, error) {
	chat := llmprompt.CheckCodePrompt
	escapedContent := escape(content)
	escapedCode1 := escape(code1)
	escapedCode2 := escape(code2)
	// Prevents prompt word injection
	chat += fmt.Sprintf("The following text surrounded by ``` is the content that you need to judge.\n\n```\nSupplementary Information:\n%s\n\nCode 1:\n%s\n\nCode 2:\n%s\n```", escapedContent, escapedCode1, escapedCode2)

	data := url.Values{}
	data.Set("q", chat)

	req, err := http.NewRequestWithContext(
		ctx,
		"POST",
		c.endpoint,
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return false, fmt.Errorf("create request failed: %v", err)
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.client.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return false, fmt.Errorf("request timeout")
		}
		return false, fmt.Errorf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("the API returns an exception status code: %d, Response content: %s", resp.StatusCode, string(body))
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("read response failure: %v", err)
	}

	response := strings.ToLower(strings.TrimSpace(string(body)))
	switch response {
	case "yes":
		return true, nil
	case "no":
		return false, nil
	default:
		return false, fmt.Errorf("unexpected response: %s", response)
	}
}
