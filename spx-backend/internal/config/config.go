package config

// Config holds all configuration for the application.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Kodo     KodoConfig
	Casdoor  CasdoorConfig
	OpenAI   OpenAIConfig
	AIGC     AIGCConfig
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

// DatabaseConfig holds database configuration.
type DatabaseConfig struct {
	DSN string
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
