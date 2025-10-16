package avatar

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/png"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/aofei/cameron"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	"github.com/qiniu/go-sdk/v7/storage"

	"github.com/goplus/builder/spx-backend/internal/config"
)

const (
	defaultAvatarMaxBytes = 5 << 20 // 5 MiB
	defaultHTTPTimeout    = 10 * time.Second
	uploadTokenTTL        = 1800 // 30 minutes in seconds
	defaultIdenticonCell  = 70
)

// Manager handles avatar uploads and generation.
type Manager interface {
	UploadFromURL(ctx context.Context, sourceURL string) (string, error)
	UploadDefault(ctx context.Context, seed []byte) (string, error)
}

// Option customizes the behavior of a Kodo-backed avatar manager during construction.
type Option func(*kodoManager)

// kodoManager implements [Manager] using Qiniu Kodo as the backing store.
type kodoManager struct {
	httpClient    *http.Client
	bucket        string
	credentials   *qiniuAuth.Credentials
	uploader      *storage.FormUploader
	putPolicy     storage.PutPolicy
	maxBytes      int64
	identiconCell int
}

// WithHTTPClient overrides the HTTP client used to fetch avatars from remote URLs.
func WithHTTPClient(client *http.Client) Option {
	return func(m *kodoManager) {
		if client != nil {
			m.httpClient = client
		}
	}
}

// WithMaxBytes overrides the maximum avatar size that can be downloaded or generated.
func WithMaxBytes(limit int64) Option {
	return func(m *kodoManager) {
		if limit > 0 {
			m.maxBytes = limit
		}
	}
}

// WithIdenticonCell overrides the identicon cell size used for generated identicons.
func WithIdenticonCell(cell int) Option {
	return func(m *kodoManager) {
		if cell > 0 {
			m.identiconCell = cell
		}
	}
}

// NewKodoManager creates a new [Manager] backed by Qiniu Kodo storage.
func NewKodoManager(cfg config.KodoConfig, opts ...Option) (Manager, error) {
	if cfg.AccessKey == "" {
		return nil, errors.New("missing kodo access key")
	}
	if cfg.SecretKey == "" {
		return nil, errors.New("missing kodo secret key")
	}
	if cfg.Bucket == "" {
		return nil, errors.New("missing kodo bucket")
	}

	mgr := &kodoManager{
		bucket:      cfg.Bucket,
		httpClient:  &http.Client{Timeout: defaultHTTPTimeout},
		credentials: qiniuAuth.New(cfg.AccessKey, cfg.SecretKey),
		uploader: storage.NewFormUploader(&storage.Config{
			UseHTTPS:      true,
			UseCdnDomains: true,
		}),
		putPolicy: storage.PutPolicy{
			Scope:        cfg.Bucket,
			ForceSaveKey: true,
			SaveKey:      "files/$(etag)-$(fsize)",
			Expires:      uploadTokenTTL,
		},
		maxBytes:      defaultAvatarMaxBytes,
		identiconCell: defaultIdenticonCell,
	}
	for _, opt := range opts {
		opt(mgr)
	}
	return mgr, nil
}

// UploadFromURL downloads avatar data from the given URL and reuploads it to Kodo.
func (m *kodoManager) UploadFromURL(ctx context.Context, sourceURL string) (string, error) {
	sourceURL = strings.TrimSpace(sourceURL)
	if sourceURL == "" {
		return "", nil
	}

	parsed, err := url.Parse(sourceURL)
	if err != nil {
		return "", fmt.Errorf("parse avatar source url: %w", err)
	}
	if strings.EqualFold(parsed.Scheme, "kodo") {
		return sourceURL, nil
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("unsupported avatar url scheme %q", parsed.Scheme)
	}

	data, contentType, err := m.download(ctx, sourceURL)
	if err != nil {
		return "", err
	}
	return m.upload(ctx, data, contentType)
}

// UploadDefault generates an identicon avatar for the provided seed and uploads
// it to Kodo.
func (m *kodoManager) UploadDefault(ctx context.Context, seed []byte) (string, error) {
	seed = bytes.TrimSpace(seed)
	if len(seed) == 0 {
		return "", errors.New("missing avatar seed")
	}
	img := cameron.Identicon(seed, m.identiconCell)

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", fmt.Errorf("encode default avatar: %w", err)
	}
	return m.upload(ctx, buf.Bytes(), "image/png")
}

// download downloads the remote avatar data and returns its bytes and MIME type.
func (m *kodoManager) download(ctx context.Context, url string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("create avatar request: %w", err)
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("download avatar: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("unexpected avatar response status %d", resp.StatusCode)
	}
	if resp.ContentLength > 0 && resp.ContentLength > m.maxBytes {
		return nil, "", fmt.Errorf("avatar payload exceeds %d bytes", m.maxBytes)
	}

	limited := io.LimitReader(resp.Body, m.maxBytes+1)
	payload, err := io.ReadAll(limited)
	if err != nil {
		return nil, "", fmt.Errorf("read avatar response: %w", err)
	}
	if int64(len(payload)) > m.maxBytes {
		return nil, "", fmt.Errorf("avatar payload exceeds %d bytes", m.maxBytes)
	}

	mimeType := normalizeContentType(resp.Header.Get("Content-Type"), payload)
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, "", fmt.Errorf("unsupported avatar content type %q", mimeType)
	}

	return payload, mimeType, nil
}

// upload uploads avatar data to Kodo and returns the resulting kodo:// URL.
func (m *kodoManager) upload(ctx context.Context, data []byte, contentType string) (string, error) {
	if len(data) == 0 {
		return "", errors.New("empty avatar payload")
	}

	token := m.putPolicy.UploadToken(m.credentials)
	reader := bytes.NewReader(data)
	extra := &storage.PutExtra{MimeType: contentType}
	var ret storage.PutRet

	if err := m.uploader.Put(ctx, &ret, token, "", reader, int64(len(data)), extra); err != nil {
		return "", fmt.Errorf("upload avatar to kodo: %w", err)
	}

	if ret.Key == "" {
		return "", errors.New("empty key returned by kodo")
	}

	return fmt.Sprintf("kodo://%s/%s", m.bucket, ret.Key), nil
}

// normalizeContentType resolves a reliable MIME type from response headers and payload bytes.
func normalizeContentType(header string, payload []byte) string {
	header = strings.TrimSpace(header)
	if header != "" {
		if idx := strings.IndexByte(header, ';'); idx >= 0 {
			header = strings.TrimSpace(header[:idx])
		}
		if header != "" && header != "application/octet-stream" {
			return strings.ToLower(header)
		}
	}

	if len(payload) > 512 {
		payload = payload[:512]
	}
	detected := http.DetectContentType(payload)
	return strings.ToLower(detected)
}
