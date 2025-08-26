package config

import (

	"time"
)

// Config holds all configuration for the application.
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	Kodo        KodoConfig
	Casdoor     CasdoorConfig
	OpenAI      OpenAIConfig
	AIGC        AIGCConfig
	Algorithm   AlgorithmConfig
	Providers   ProvidersConfig
	Translation TranslationConfig
}

// ServerConfig holds server configuration.
type ServerConfig struct {
	Port         string
	Host         string
	Timeout      time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// GetPort returns the server port, defaulting to ":8080" if not set.
func (c *ServerConfig) GetPort() string {
	if c.Port != "" {
		return c.Port
	}
	return ":8080"
}

// GetServerAddr returns the server listen address.
func (c *ServerConfig) GetServerAddr() string {
	host := c.Host
	if host == "" {
		host = "0.0.0.0"
	}
	port := c.Port
	if port == "" {
		port = ":8080"
	}
	if port[0] != ':' {
		port = ":" + port
	}
	return host + port
}

// DatabaseConfig holds database configuration.
type DatabaseConfig struct {
	DSN string
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	Addr     string
	Password string
	DB       int
	PoolSize int
}

// GetAddr returns the Redis address, defaulting to "127.0.0.1:6379" if not set.
func (c *RedisConfig) GetAddr() string {
	if c.Addr != "" {
		return c.Addr
	}
	return "127.0.0.1:6379"
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

	PremiumAPIKey      string
	PremiumAPIEndpoint string
	PremiumModelID     string
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

// AlgorithmConfig holds algorithm service configuration.
type AlgorithmConfig struct {
	Endpoint string
	Timeout  time.Duration
}

// ProvidersConfig holds provider configurations for SVG generation.
type ProvidersConfig struct {
	SVGIO   SVGIOConfig
	Recraft RecraftConfig
	SVGOpenAI OpenAISVGConfig
}

// SVGIOConfig holds SVG.IO provider configuration.
type SVGIOConfig struct {
	BaseURL    string
	Timeout    time.Duration
	MaxRetries int
	Enabled    bool
	Endpoints  SVGIOEndpoints
}

// SVGIOEndpoints holds SVG.IO API endpoint configuration.
type SVGIOEndpoints struct {
	Generate string
}

// RecraftConfig holds Recraft provider configuration.
type RecraftConfig struct {
	BaseURL         string
	Timeout         time.Duration
	MaxRetries      int
	Enabled         bool
	DefaultModel    string
	SupportedModels []string
	Endpoints       RecraftEndpoints
}

// RecraftEndpoints holds Recraft API endpoint configuration.
type RecraftEndpoints struct {
	Generate   string
	Vectorize  string
}

// OpenAISVGConfig holds OpenAI provider configuration for SVG generation (supports all OpenAI compatible models).
type OpenAISVGConfig struct {
	BaseURL      string
	Timeout      time.Duration
	MaxRetries   int
	Enabled      bool
	DefaultModel string
	MaxTokens    int
	Temperature  float64
}

// TranslationConfig holds translation service configuration.
type TranslationConfig struct {
	Enabled      bool
	ServiceURL   string
	DefaultModel string
	Timeout      time.Duration
	MaxRetries   int
}

// IsProviderEnabled checks if a provider is enabled.
func (c *Config) IsProviderEnabled(provider string) bool {
	switch provider {
	case "svgio":
		return c.Providers.SVGIO.Enabled
	case "recraft":
		return c.Providers.Recraft.Enabled
	case "openai":
		return c.Providers.SVGOpenAI.Enabled
	default:
		return false
	}
}
