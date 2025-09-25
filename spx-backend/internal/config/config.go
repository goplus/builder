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
	ImageFilter ImageFilterConfig
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
	Generate     string
	Vectorize    string
	ImageToImage string
}



// ImageFilterConfig holds image recommendation filtering configuration.
type ImageFilterConfig struct {
	// Enabled controls whether image filtering is enabled globally
	Enabled bool `default:"true"`

	// DefaultWindowDays is the default filter window in days
	DefaultWindowDays int `default:"30"`

	// DefaultMaxFilterRatio is the default maximum filter ratio (0-1)
	DefaultMaxFilterRatio float64 `default:"0.8"`

	// SearchExpansionRatio controls how much to expand search results before filtering
	SearchExpansionRatio float64 `default:"2.0"`

	// EnableDegradation controls whether degradation strategies are enabled
	EnableDegradation bool `default:"true"`

	// EnableMetrics controls whether to store filtering metrics
	EnableMetrics bool `default:"true"`
}

// GetDefaultWindowDays returns the default window days, with fallback.
func (c *ImageFilterConfig) GetDefaultWindowDays() int {
	if c.DefaultWindowDays > 0 {
		return c.DefaultWindowDays
	}
	return 30
}

// GetDefaultMaxFilterRatio returns the default max filter ratio, with fallback.
func (c *ImageFilterConfig) GetDefaultMaxFilterRatio() float64 {
	if c.DefaultMaxFilterRatio > 0 && c.DefaultMaxFilterRatio <= 1 {
		return c.DefaultMaxFilterRatio
	}
	return 0.8
}

// GetSearchExpansionRatio returns the search expansion ratio, with fallback.
func (c *ImageFilterConfig) GetSearchExpansionRatio() float64 {
	if c.SearchExpansionRatio > 1 {
		return c.SearchExpansionRatio
	}
	return 2.0
}

// IsProviderEnabled checks if a provider is enabled.
func (c *Config) IsProviderEnabled(provider string) bool {
	switch provider {
	case "svgio":
		return c.Providers.SVGIO.Enabled
	case "recraft":
		return c.Providers.Recraft.Enabled
	case "openai":
		// OpenAI provider is enabled if copilot is configured
		return c.OpenAI.APIKey != ""
	default:
		return false
	}
}
