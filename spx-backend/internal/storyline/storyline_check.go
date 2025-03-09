package storyline

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type StorylineCheckClient struct {
	endpoint string
	client   *http.Client
}

const prompt = `Strictly follow the following requirements to analyze whether the functions of the two pieces of code are consistent:
1. Only consider the functional implementation of the code, not considering the differences in code style and format.
2. Ignore naming differences such as variable names and function names.
3. The final conclusion must and can only be answered in a single word: Yes/No.
There may be supplementary information later, but keep in mind that the additional information is only there to introduce additional knowledge to help you identify the code.
`

func NewStorylineCheckClient(endpoint string) *StorylineCheckClient {
	return &StorylineCheckClient{
		endpoint: endpoint,
		client:   &http.Client{},
	}
}

// Escape function
func escape(s string) string {
	return strings.ReplaceAll(s, "`", "\\`")
}

func (c *StorylineCheckClient) Check(ctx context.Context, content, code1, code2 string) (bool, error) {
	chat := prompt
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
