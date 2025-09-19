package kodo

import (
	"bytes"
	"context"
	"crypto/md5"
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/config"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuStorage "github.com/qiniu/go-sdk/v7/storage"
)

// Client is the client for Kodo.
type Client struct {
	cred         *qiniuAuth.Credentials
	bucket       string
	bucketRegion string
	baseUrl      string
}

// NewClient creates a new Kodo client.
func NewClient(cfg config.KodoConfig) *Client {
	return &Client{
		cred: qiniuAuth.New(
			cfg.AccessKey,
			cfg.SecretKey,
		),
		bucket:       cfg.Bucket,
		bucketRegion: cfg.BucketRegion,
		baseUrl:      cfg.BaseURL,
	}
}

// UploadFileResult represents the result of a file upload to Kodo.
type UploadFileResult struct {
	Key      string `json:"key"`      // File key in the bucket
	Hash     string `json:"hash"`     // File hash
	Size     int64  `json:"size"`     // File size in bytes
	KodoURL  string `json:"kodo_url"` // Internal kodo:// URL
}

// UploadFile uploads file content to Kodo storage.
func (k *Client) UploadFile(ctx context.Context, data []byte, filename string) (*UploadFileResult, error) {
	// Generate file key with prefix
	hash := fmt.Sprintf("%x", md5.Sum(data))
	key := fmt.Sprintf("ai-generated/%s-%s", hash[:8], filename)

	// Create upload policy
	putPolicy := qiniuStorage.PutPolicy{
		Scope: k.bucket,
	}

	// Generate upload token
	upToken := putPolicy.UploadToken(k.cred)

	// Configure upload settings
	cfg := qiniuStorage.Config{}
	// Use specified region if available
	// Map region names to Qiniu regions (this might need adjustment based on actual region names)
	// regionMap maps region names to Qiniu storage zones
	var regionMap = map[string]*qiniuStorage.Region{
		"z0":              &qiniuStorage.ZoneHuadong,
		"cn-east-1":       &qiniuStorage.ZoneHuadong,
		"z1":              &qiniuStorage.ZoneHuabei,
		"cn-north-1":      &qiniuStorage.ZoneHuabei,
		"z2":              &qiniuStorage.ZoneHuanan,
		"cn-south-1":      &qiniuStorage.ZoneHuanan,
		"na0":             &qiniuStorage.ZoneBeimei,
		"us-north-1":      &qiniuStorage.ZoneBeimei,
		"as0":             &qiniuStorage.ZoneXinjiapo,
		"ap-southeast-1":  &qiniuStorage.ZoneXinjiapo,
	}
	// Use specified region if available
	if k.bucketRegion != "" {
		if zone, exists := regionMap[k.bucketRegion]; exists {
			cfg.Zone = zone
		}
	}
	cfg.UseHTTPS = true
	cfg.UseCdnDomains = false

	// Create form uploader
	formUploader := qiniuStorage.NewFormUploader(&cfg)

	// Upload file
	ret := qiniuStorage.PutRet{}
	err := formUploader.Put(ctx, &ret, upToken, key, bytes.NewReader(data), int64(len(data)), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to Kodo: %w", err)
	}

	// Generate kodo:// URL
	kodoURL := fmt.Sprintf("kodo://%s/%s", k.bucket, ret.Key)

	return &UploadFileResult{
		Key:     ret.Key,
		Hash:    ret.Hash,
		Size:    int64(len(data)),
		KodoURL: kodoURL,
	}, nil
}

// GetBucket returns the bucket name
func (k *Client) GetBucket() string {
	return k.bucket
}

// GetBaseURL returns the base URL
func (k *Client) GetBaseURL() string {
	return k.baseUrl
}

// GetCredentials returns the credentials
func (k *Client) GetCredentials() *qiniuAuth.Credentials {
	return k.cred
}

// GetBucketRegion returns the bucket region
func (k *Client) GetBucketRegion() string {
	return k.bucketRegion
}
