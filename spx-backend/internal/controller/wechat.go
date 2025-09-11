package controller

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// WeChatTokenCache holds cached WeChat tokens
type WeChatTokenCache struct {
	AccessToken    string
	AccessTokenExp time.Time
	JsapiTicket    string
	JsapiTicketExp time.Time
	mu             sync.RWMutex
}

// WeChatJSSDKConfigParams holds parameters for JS-SDK config
type WeChatJSSDKConfigParams struct {
	URL string `json:"url"`
}

// WeChatJSSDKConfigResult holds JS-SDK config result
type WeChatJSSDKConfigResult struct {
	AppID     string `json:"appId"`
	NonceStr  string `json:"nonceStr"`
	Timestamp int64  `json:"timestamp"`
	Signature string `json:"signature"`
}

// Validate validates the parameters
func (p *WeChatJSSDKConfigParams) Validate() (ok bool, msg string) {
	if p.URL == "" {
		return false, "missing url"
	}
	return true, ""
}

// WeChatService handles WeChat API operations
type WeChatService struct {
	appID  string
	secret string
	cache  *WeChatTokenCache
}

// NewWeChatService creates a new WeChat service
func NewWeChatService(appID, secret string) *WeChatService {
	return &WeChatService{
		appID:  appID,
		secret: secret,
		cache:  &WeChatTokenCache{},
	}
}

// GetJSSDKConfig gets JS-SDK configuration
func (ctrl *Controller) GetWeChatJSSDKConfig(ctx context.Context, params *WeChatJSSDKConfigParams) (*WeChatJSSDKConfigResult, error) {
	logger := log.GetReqLogger(ctx)

	// Get jsapi_ticket
	ticket, err := ctrl.wechat.getJsapiTicket(ctx)
	if err != nil {
		logger.Printf("failed to get jsapi ticket: %v", err)
		return nil, err
	}

	// Generate signature
	nonceStr := generateNonceStr()
	timestamp := time.Now().Unix()
	signature := generateSignature(ticket, nonceStr, timestamp, params.URL)

	return &WeChatJSSDKConfigResult{
		AppID:     ctrl.wechat.appID,
		NonceStr:  nonceStr,
		Timestamp: timestamp,
		Signature: signature,
	}, nil
}

// getAccessToken gets WeChat access token (with caching)
func (w *WeChatService) getAccessToken(ctx context.Context) (string, error) {
	w.cache.mu.RLock()
	if w.cache.AccessToken != "" && time.Now().Before(w.cache.AccessTokenExp) {
		token := w.cache.AccessToken
		w.cache.mu.RUnlock()
		return token, nil
	}
	w.cache.mu.RUnlock()

	w.cache.mu.Lock()
	defer w.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if w.cache.AccessToken != "" && time.Now().Before(w.cache.AccessTokenExp) {
		return w.cache.AccessToken, nil
	}

	// Fetch new token from WeChat API
	url := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
		w.appID, w.secret)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request WeChat API: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode WeChat response: %w", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("WeChat API error: %d %s", result.ErrCode, result.ErrMsg)
	}

	// Cache token (expires 10 minutes early for safety)
	w.cache.AccessToken = result.AccessToken
	w.cache.AccessTokenExp = time.Now().Add(time.Duration(result.ExpiresIn-600) * time.Second)

	return result.AccessToken, nil
}

// getJsapiTicket gets WeChat jsapi ticket (with caching)
func (w *WeChatService) getJsapiTicket(ctx context.Context) (string, error) {
	w.cache.mu.RLock()
	if w.cache.JsapiTicket != "" && time.Now().Before(w.cache.JsapiTicketExp) {
		ticket := w.cache.JsapiTicket
		w.cache.mu.RUnlock()
		return ticket, nil
	}
	w.cache.mu.RUnlock()

	// Get access token first
	accessToken, err := w.getAccessToken(ctx)
	if err != nil {
		return "", err
	}

	w.cache.mu.Lock()
	defer w.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if w.cache.JsapiTicket != "" && time.Now().Before(w.cache.JsapiTicketExp) {
		return w.cache.JsapiTicket, nil
	}

	// Fetch new ticket from WeChat API
	url := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=%s&type=jsapi", accessToken)

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to request WeChat ticket API: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Ticket    string `json:"ticket"`
		ExpiresIn int    `json:"expires_in"`
		ErrCode   int    `json:"errcode"`
		ErrMsg    string `json:"errmsg"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode WeChat ticket response: %w", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("WeChat ticket API error: %d %s", result.ErrCode, result.ErrMsg)
	}

	// Cache ticket (expires 10 minutes early for safety)
	w.cache.JsapiTicket = result.Ticket
	w.cache.JsapiTicketExp = time.Now().Add(time.Duration(result.ExpiresIn-600) * time.Second)

	return result.Ticket, nil
}

// generateNonceStr generates a random nonce string
func generateNonceStr() string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// generateSignature generates WeChat JS-SDK signature
func generateSignature(ticket, nonceStr string, timestamp int64, url string) string {
	// Create parameter string
	params := []string{
		fmt.Sprintf("jsapi_ticket=%s", ticket),
		fmt.Sprintf("noncestr=%s", nonceStr),
		fmt.Sprintf("timestamp=%d", timestamp),
		fmt.Sprintf("url=%s", url),
	}

	// Sort parameters
	sort.Strings(params)

	// Join with &
	paramStr := strings.Join(params, "&")

	// Calculate SHA1
	h := sha1.New()
	h.Write([]byte(paramStr))
	return fmt.Sprintf("%x", h.Sum(nil))
}
