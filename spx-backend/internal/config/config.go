package config

import (
	"slices"
	"strings"
	"time"
)

// Config holds all configuration for the application.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Sentry   SentryConfig
	Redis    RedisConfig
	Kodo     KodoConfig
	Casdoor  CasdoorConfig
	OpenAI   OpenAIConfig
	AIGC     AIGCConfig
	WeChat   WeChatConfig
}

// ServerConfig holds server configuration.
type ServerConfig struct {
	Port string
}

// GetPort returns the server port, defaulting to ":8080" if not set.
func (c *ServerConfig) GetPort() string {
	if c.Port != "" {
		return c.Port
	}
	return ":8080"
}

// SentryConfig holds Sentry configuration.
type SentryConfig struct {
	DSN        string
	SampleRate float64
}

// DatabaseConfig holds database configuration.
type DatabaseConfig struct {
	DSN              string
	AutoMigrate      bool
	MigrationTimeout time.Duration
}

// GetMigrationTimeout returns the migration timeout, defaulting to 5 minutes.
func (c *DatabaseConfig) GetMigrationTimeout() time.Duration {
	if c.MigrationTimeout > 0 {
		return c.MigrationTimeout
	}
	return 5 * time.Minute
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	Addr     string
	Password string
	DB       int
	PoolSize int
}

// GetAddr returns the Redis address(es) as a slice. It supports both single
// address and comma-separated multiple addresses. It defaults to
// ["127.0.0.1:6379"] if not set.
func (c *RedisConfig) GetAddr() []string {
	if c.Addr == "" {
		return []string{"127.0.0.1:6379"}
	}

	addresses := strings.Split(c.Addr, ",")
	for i, addr := range addresses {
		addresses[i] = strings.TrimSpace(addr)
	}
	return slices.DeleteFunc(addresses, func(addr string) bool {
		return addr == ""
	})
}

// IsClusterMode returns true if multiple Redis addresses are configured.
func (c *RedisConfig) IsClusterMode() bool {
	return len(c.GetAddr()) > 1
}

// GetPoolSize returns the Redis pool size, defaulting to 10 if not set.
func (c *RedisConfig) GetPoolSize() int {
	if c.PoolSize > 0 {
		return c.PoolSize
	}
	return 10
}

// KodoConfig holds Kodo storage configuration.
type KodoConfig struct {
	AccessKey    string
	SecretKey    string
	Bucket       string
	BucketRegion string
	BaseURL      string
}

// CasdoorConfig holds Casdoor authentication configuration.
type CasdoorConfig struct {
	Endpoint         string
	ClientID         string
	ClientSecret     string
	Certificate      string
	OrganizationName string
	ApplicationName  string
}

// OpenAIConfig holds OpenAI API configuration.
type OpenAIConfig struct {
	APIKey      string
	APIEndpoint string
	ModelID     string

	LiteAPIKey      string
	LiteAPIEndpoint string
	LiteModelID     string

	PremiumAPIKey      string
	PremiumAPIEndpoint string
	PremiumModelID     string
}

// GetLiteAPIKey returns the lite API key, falling back to standard API key.
func (c *OpenAIConfig) GetLiteAPIKey() string {
	if c.LiteAPIKey != "" {
		return c.LiteAPIKey
	}
	return c.APIKey
}

// GetLiteAPIEndpoint returns the lite API endpoint, falling back to standard endpoint.
func (c *OpenAIConfig) GetLiteAPIEndpoint() string {
	if c.LiteAPIEndpoint != "" {
		return c.LiteAPIEndpoint
	}
	return c.APIEndpoint
}

// GetLiteModelID returns the lite model ID, falling back to standard model ID.
func (c *OpenAIConfig) GetLiteModelID() string {
	if c.LiteModelID != "" {
		return c.LiteModelID
	}
	return c.ModelID
}

// GetPremiumAPIKey returns the premium API key, falling back to standard API key.
func (c *OpenAIConfig) GetPremiumAPIKey() string {
	if c.PremiumAPIKey != "" {
		return c.PremiumAPIKey
	}
	return c.APIKey
}

// GetPremiumAPIEndpoint returns the premium API endpoint, falling back to standard endpoint.
func (c *OpenAIConfig) GetPremiumAPIEndpoint() string {
	if c.PremiumAPIEndpoint != "" {
		return c.PremiumAPIEndpoint
	}
	return c.APIEndpoint
}

// GetPremiumModelID returns the premium model ID, falling back to standard model ID.
func (c *OpenAIConfig) GetPremiumModelID() string {
	if c.PremiumModelID != "" {
		return c.PremiumModelID
	}
	return c.ModelID
}

// AIGCConfig holds AIGC service configuration.
type AIGCConfig struct {
	Endpoint string
}

// WeChatConfig holds WeChat API configuration.
type WeChatConfig struct {
	AppID  string
	Secret string
}

// GetAppID returns the WeChat AppID.
func (c *WeChatConfig) GetAppID() string {
	return c.AppID
}

// GetSecret returns the WeChat Secret.
func (c *WeChatConfig) GetSecret() string {
	return c.Secret
}