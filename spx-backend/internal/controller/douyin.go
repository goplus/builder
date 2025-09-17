package controller

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Douyin API documentation references: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/sdk/web-app/h5/share-to-h5

// DouyinTokenCache holds cached Douyin tokens
type DouyinTokenCache struct {
	AccessToken    string
	AccessTokenExp time.Time
	Ticket         string
	TicketExp      time.Time
	mu             sync.RWMutex
}

// DouyinH5ConfigParams holds parameters for H5 share config
type DouyinH5ConfigParams struct {
	// No specific parameters needed for Douyin H5 sharing for now
	// Can be added later if required
}

// DouyinH5ConfigResult holds H5 share config result
type DouyinH5ConfigResult struct {
	ClientKey string `json:"clientKey"`
	NonceStr  string `json:"nonceStr"`
	Timestamp string `json:"timestamp"`
	Signature string `json:"signature"`
}

// DouyinService handles Douyin API operations
type DouyinService struct {
	clientKey    string
	clientSecret string
	cache        *DouyinTokenCache
	client       *http.Client // Reused HTTP client for better performance
}

// NewDouyinService creates a new Douyin service
func NewDouyinService(clientKey, clientSecret string) *DouyinService {
	return &DouyinService{
		clientKey:    clientKey,
		clientSecret: clientSecret,
		cache:        &DouyinTokenCache{},
		client:       &http.Client{Timeout: 10 * time.Second}, // Initialize once for reuse
	}
}

// GetH5Config gets H5 share configuration
func (ctrl *Controller) GetDouyinH5Config(ctx context.Context, params *DouyinH5ConfigParams) (*DouyinH5ConfigResult, error) {
	logger := log.GetReqLogger(ctx)

	// Get ticket
	ticket, err := ctrl.douyin.getTicket(ctx)
	if err != nil {
		logger.Printf("failed to get ticket: %v", err)
		return nil, err
	}

	// Generate signature parameters
	nonceStr := generateDouyinNonceStr()
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	signature := generateDouyinSignature(ticket, nonceStr, timestamp)

	return &DouyinH5ConfigResult{
		ClientKey: ctrl.douyin.clientKey,
		NonceStr:  nonceStr,
		Timestamp: timestamp,
		Signature: signature,
	}, nil
}

// getAccessToken gets Douyin access token (with caching)
func (d *DouyinService) getAccessToken(ctx context.Context) (string, error) {
	d.cache.mu.RLock()
	if d.cache.AccessToken != "" && time.Now().Before(d.cache.AccessTokenExp) {
		token := d.cache.AccessToken
		d.cache.mu.RUnlock()
		return token, nil
	}
	d.cache.mu.RUnlock()

	d.cache.mu.Lock()
	defer d.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if d.cache.AccessToken != "" && time.Now().Before(d.cache.AccessTokenExp) {
		return d.cache.AccessToken, nil
	}

	// Fetch new token from Douyin API
	url := "https://open.douyin.com/oauth/client_token/"

	requestBody := map[string]interface{}{
		"client_key":    d.clientKey,
		"client_secret": d.clientSecret,
		"grant_type":    "client_credential",
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request Douyin API: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Data struct {
			AccessToken string `json:"access_token"`
			ExpiresIn   int64  `json:"expires_in"`
		} `json:"data"`
		Extra struct {
			ErrorCode int    `json:"error_code"`
			LogID     string `json:"logid"`
		} `json:"extra"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Extra.ErrorCode != 0 {
		return "", fmt.Errorf("douyin API error: code=%d, logid=%s", result.Extra.ErrorCode, result.Extra.LogID)
	}

	// Cache the token with 10 minutes buffer
	d.cache.AccessToken = result.Data.AccessToken
	d.cache.AccessTokenExp = time.Now().Add(time.Duration(result.Data.ExpiresIn-600) * time.Second)

	return result.Data.AccessToken, nil
}

// getTicket gets Douyin ticket (with caching)
func (d *DouyinService) getTicket(ctx context.Context) (string, error) {
	d.cache.mu.RLock()
	if d.cache.Ticket != "" && time.Now().Before(d.cache.TicketExp) {
		ticket := d.cache.Ticket
		d.cache.mu.RUnlock()
		return ticket, nil
	}
	d.cache.mu.RUnlock()

	d.cache.mu.Lock()
	defer d.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if d.cache.Ticket != "" && time.Now().Before(d.cache.TicketExp) {
		return d.cache.Ticket, nil
	}

	// Get access token first
	accessToken, err := d.getAccessToken(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get access token: %w", err)
	}

	// Get ticket from Douyin API
	url := "https://open.douyin.com/open/getticket/"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers as per documentation
	req.Header.Set("access-token", accessToken)
	req.Header.Set("content-type", "application/json")

	resp, err := d.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request Douyin API: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Data struct {
			Ticket      string `json:"ticket"`
			ExpiresIn   int64  `json:"expires_in"`
			ErrorCode   int    `json:"error_code"`
			Description string `json:"description"`
		} `json:"data"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Data.ErrorCode != 0 {
		return "", fmt.Errorf("douyin API error: code=%d, description=%s",
			result.Data.ErrorCode, result.Data.Description)
	}

	// Cache the ticket with 10 minutes buffer
	d.cache.Ticket = result.Data.Ticket
	d.cache.TicketExp = time.Now().Add(time.Duration(result.Data.ExpiresIn-600) * time.Second)

	return result.Data.Ticket, nil
}

// generateDouyinNonceStr generates a random nonce string
func generateDouyinNonceStr() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateDouyinSignature generates MD5 signature for Douyin H5 share
func generateDouyinSignature(ticket, nonceStr, timestamp string) string {
	// Prepare parameters for signing
	params := map[string]string{
		"nonce_str": nonceStr,
		"ticket":    ticket,
		"timestamp": timestamp,
	}

	// Sort parameters by key name (ASCII order)
	var keys []string
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build signing string in key1=value1&key2=value2 format
	var signParts []string
	for _, k := range keys {
		signParts = append(signParts, fmt.Sprintf("%s=%s", k, params[k]))
	}
	signString := strings.Join(signParts, "&")

	// Calculate MD5 hash
	hash := md5.Sum([]byte(signString))
	return hex.EncodeToString(hash[:])
}
