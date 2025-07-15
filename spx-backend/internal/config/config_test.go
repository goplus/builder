package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestServerConfigGetPort(t *testing.T) {
	t.Run("WithCustomPort", func(t *testing.T) {
		cfg := &ServerConfig{
			Port: ":9090",
		}
		assert.Equal(t, ":9090", cfg.GetPort())
	})

	t.Run("WithoutCustomPort", func(t *testing.T) {
		cfg := &ServerConfig{
			Port: "",
		}
		assert.Equal(t, ":8080", cfg.GetPort())
	})
}

func TestRedisConfigGetAddr(t *testing.T) {
	t.Run("WithCustomAddr", func(t *testing.T) {
		cfg := &RedisConfig{
			Addr: "redis.example.com:6379",
		}
		assert.Equal(t, "redis.example.com:6379", cfg.GetAddr())
	})

	t.Run("WithoutCustomAddr", func(t *testing.T) {
		cfg := &RedisConfig{
			Addr: "",
		}
		assert.Equal(t, "127.0.0.1:6379", cfg.GetAddr())
	})
}

func TestRedisConfigGetPoolSize(t *testing.T) {
	t.Run("WithCustomPoolSize", func(t *testing.T) {
		cfg := &RedisConfig{
			PoolSize: 20,
		}
		assert.Equal(t, 20, cfg.GetPoolSize())
	})

	t.Run("WithoutCustomPoolSize", func(t *testing.T) {
		cfg := &RedisConfig{
			PoolSize: 0,
		}
		assert.Equal(t, 10, cfg.GetPoolSize())
	})
}

func TestOpenAIConfigGetPremiumAPIKey(t *testing.T) {
	t.Run("WithPremiumKey", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIKey:        "standard-key",
			PremiumAPIKey: "premium-key",
		}
		assert.Equal(t, "premium-key", cfg.GetPremiumAPIKey())
	})

	t.Run("WithoutPremiumKey", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIKey:        "standard-key",
			PremiumAPIKey: "",
		}
		assert.Equal(t, "standard-key", cfg.GetPremiumAPIKey())
	})
}

func TestOpenAIConfigGetPremiumAPIEndpoint(t *testing.T) {
	t.Run("WithPremiumEndpoint", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIEndpoint:        "https://api.openai.com/v1",
			PremiumAPIEndpoint: "https://premium.openai.com/v1",
		}
		assert.Equal(t, "https://premium.openai.com/v1", cfg.GetPremiumAPIEndpoint())
	})

	t.Run("WithoutPremiumEndpoint", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIEndpoint:        "https://api.openai.com/v1",
			PremiumAPIEndpoint: "",
		}
		assert.Equal(t, "https://api.openai.com/v1", cfg.GetPremiumAPIEndpoint())
	})
}

func TestOpenAIConfigGetPremiumModelID(t *testing.T) {
	t.Run("WithPremiumModel", func(t *testing.T) {
		cfg := &OpenAIConfig{
			ModelID:        "gpt-3.5-turbo",
			PremiumModelID: "gpt-4",
		}
		assert.Equal(t, "gpt-4", cfg.GetPremiumModelID())
	})

	t.Run("WithoutPremiumModel", func(t *testing.T) {
		cfg := &OpenAIConfig{
			ModelID:        "gpt-3.5-turbo",
			PremiumModelID: "",
		}
		assert.Equal(t, "gpt-3.5-turbo", cfg.GetPremiumModelID())
	})
}
