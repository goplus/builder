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
	t.Run("SingleAddr", func(t *testing.T) {
		cfg := &RedisConfig{
			Addr: "redis.example.com:6379",
		}
		assert.Equal(t, []string{"redis.example.com:6379"}, cfg.GetAddr())
	})

	t.Run("EmptyAddr", func(t *testing.T) {
		cfg := &RedisConfig{
			Addr: "",
		}
		assert.Equal(t, []string{"127.0.0.1:6379"}, cfg.GetAddr())
	})

	t.Run("MultipleAddrs", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "node1:6379,node2:6379,node3:6379"}
		expected := []string{"node1:6379", "node2:6379", "node3:6379"}
		assert.Equal(t, expected, cfg.GetAddr())
	})

	t.Run("MultipleAddrsWithSpaces", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "node1:6379, node2:6379 , node3:6379"}
		expected := []string{"node1:6379", "node2:6379", "node3:6379"}
		assert.Equal(t, expected, cfg.GetAddr())
	})

	t.Run("EmptyElements", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "node1:6379,, node2:6379,"}
		expected := []string{"node1:6379", "node2:6379"}
		assert.Equal(t, expected, cfg.GetAddr())
	})
}

func TestRedisConfigIsClusterMode(t *testing.T) {
	t.Run("SingleAddress", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "redis.example.com:6379"}
		assert.False(t, cfg.IsClusterMode())
	})

	t.Run("MultipleAddresses", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "node1:6379,node2:6379,node3:6379"}
		assert.True(t, cfg.IsClusterMode())
	})

	t.Run("TwoAddresses", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "primary:6379,replica:6379"}
		assert.True(t, cfg.IsClusterMode())
	})

	t.Run("EmptyAddress", func(t *testing.T) {
		cfg := &RedisConfig{Addr: ""}
		assert.False(t, cfg.IsClusterMode())
	})

	t.Run("SingleAddressWithSpaces", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "  redis.example.com:6379  "}
		assert.False(t, cfg.IsClusterMode())
	})

	t.Run("MultipleAddressesWithEmptyElements", func(t *testing.T) {
		cfg := &RedisConfig{Addr: "node1:6379,,node2:6379,"}
		assert.True(t, cfg.IsClusterMode())
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

func TestOpenAIConfigGetLiteAPIKey(t *testing.T) {
	t.Run("WithLiteKey", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIKey:     "standard-key",
			LiteAPIKey: "lite-key",
		}
		assert.Equal(t, "lite-key", cfg.GetLiteAPIKey())
	})

	t.Run("WithoutLiteKey", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIKey:     "standard-key",
			LiteAPIKey: "",
		}
		assert.Equal(t, "standard-key", cfg.GetLiteAPIKey())
	})
}

func TestOpenAIConfigGetLiteAPIEndpoint(t *testing.T) {
	t.Run("WithLiteEndpoint", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIEndpoint:     "https://api.openai.com/v1",
			LiteAPIEndpoint: "https://lite.openai.com/v1",
		}
		assert.Equal(t, "https://lite.openai.com/v1", cfg.GetLiteAPIEndpoint())
	})

	t.Run("WithoutLiteEndpoint", func(t *testing.T) {
		cfg := &OpenAIConfig{
			APIEndpoint:     "https://api.openai.com/v1",
			LiteAPIEndpoint: "",
		}
		assert.Equal(t, "https://api.openai.com/v1", cfg.GetLiteAPIEndpoint())
	})
}

func TestOpenAIConfigGetLiteModelID(t *testing.T) {
	t.Run("WithLiteModel", func(t *testing.T) {
		cfg := &OpenAIConfig{
			ModelID:     "gpt-3.5-turbo",
			LiteModelID: "gpt-4o-mini",
		}
		assert.Equal(t, "gpt-4o-mini", cfg.GetLiteModelID())
	})

	t.Run("WithoutLiteModel", func(t *testing.T) {
		cfg := &OpenAIConfig{
			ModelID:     "gpt-3.5-turbo",
			LiteModelID: "",
		}
		assert.Equal(t, "gpt-3.5-turbo", cfg.GetLiteModelID())
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
