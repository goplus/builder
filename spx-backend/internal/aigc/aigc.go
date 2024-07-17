package aigc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

type AigcClient struct {
	endpoint string
	client   *http.Client
}

func NewAigcClient(endpoint string) *AigcClient {
	return &AigcClient{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// Call calls AIGC API.
func (c *AigcClient) Call(ctx context.Context, method, path string, body any, responseBody any) error {
	logger := log.GetReqLogger(ctx)
	bodyByte, err := json.Marshal(body)
	if err != nil {
		logger.Printf("failed to marshal request body: %v", err)
		return err
	}
	httpReq, err := http.NewRequest(method, c.endpoint+path, bytes.NewReader(bodyByte))
	if err != nil {
		logger.Printf("failed to new request: %v", err)
		return err
	}
	httpReq = httpReq.WithContext(ctx)
	logger.Printf("request %s %s", httpReq.Method, httpReq.URL.String())
	httpReq.Header.Add("Content-Type", "application/json")
	httpResp, err := c.client.Do(httpReq)
	if err != nil {
		logger.Printf("failed to do request: %v", err)
		return err
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode != http.StatusOK {
		logger.Printf("status not ok: %v", httpResp.StatusCode)
		return fmt.Errorf("failed to request: %s", httpResp.Status)
	}
	if err := json.NewDecoder(httpResp.Body).Decode(responseBody); err != nil {
		logger.Printf("failed to decode response body: %v", err)
		return err
	}
	return nil
}
