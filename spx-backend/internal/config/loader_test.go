package config

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	// Database
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True")

	// Redis
	t.Setenv("REDIS_ADDR", "redis.example.com:6379")
	t.Setenv("REDIS_PASSWORD", "test-redis-password")
	t.Setenv("REDIS_DB", "1")
	t.Setenv("REDIS_POOL_SIZE", "15")

	// Kodo
	t.Setenv("KODO_AK", "test-kodo-ak")
	t.Setenv("KODO_SK", "test-kodo-sk")
	t.Setenv("KODO_BUCKET", "builder")
	t.Setenv("KODO_BUCKET_REGION", "earth")
	t.Setenv("KODO_BASE_URL", "https://kodo.example.com")

	// Casdoor
	t.Setenv("GOP_CASDOOR_ENDPOINT", "https://casdoor.example.com")
	t.Setenv("GOP_CASDOOR_CLIENTID", "test-client-id")
	t.Setenv("GOP_CASDOOR_CLIENTSECRET", "test-client-secret")
	t.Setenv("GOP_CASDOOR_CERTIFICATE", "test-certificate")
	t.Setenv("GOP_CASDOOR_ORGANIZATIONNAME", "test-org")
	t.Setenv("GOP_CASDOOR_APPLICATIONNAME", "test-app")

	// OpenAI
	t.Setenv("OPENAI_API_KEY", "test-openai-key")
	t.Setenv("OPENAI_API_ENDPOINT", "https://api.openai.com/v1")
	t.Setenv("OPENAI_MODEL_ID", "gpt-3.5-turbo")

	// AIGC
	t.Setenv("AIGC_ENDPOINT", "https://aigc.example.com")
}

func TestLoad(t *testing.T) {
	t.Run("BasicConfig", func(t *testing.T) {
		setTestEnv(t)

		logger := log.GetLogger()
		config, err := Load(logger)
		require.NoError(t, err)
		require.NotNil(t, config)

		// Server
		assert.Empty(t, config.Server.Port)
		assert.Equal(t, ":8080", config.Server.GetPort())

		// Database
		assert.Equal(t, "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True", config.Database.DSN)

		// Redis
		assert.Equal(t, "redis.example.com:6379", config.Redis.Addr)
		assert.Equal(t, []string{"redis.example.com:6379"}, config.Redis.GetAddr())
		assert.False(t, config.Redis.IsClusterMode())
		assert.Equal(t, "test-redis-password", config.Redis.Password)
		assert.Equal(t, 1, config.Redis.DB)
		assert.Equal(t, 15, config.Redis.PoolSize)
		assert.Equal(t, config.Redis.PoolSize, config.Redis.GetPoolSize())

		// Kodo
		assert.Equal(t, "test-kodo-ak", config.Kodo.AccessKey)
		assert.Equal(t, "test-kodo-sk", config.Kodo.SecretKey)
		assert.Equal(t, "builder", config.Kodo.Bucket)
		assert.Equal(t, "earth", config.Kodo.BucketRegion)
		assert.Equal(t, "https://kodo.example.com", config.Kodo.BaseURL)

		// Casdoor
		assert.Equal(t, "https://casdoor.example.com", config.Casdoor.Endpoint)
		assert.Equal(t, "test-client-id", config.Casdoor.ClientID)
		assert.Equal(t, "test-client-secret", config.Casdoor.ClientSecret)
		assert.Equal(t, "test-certificate", config.Casdoor.Certificate)
		assert.Equal(t, "test-org", config.Casdoor.OrganizationName)
		assert.Equal(t, "test-app", config.Casdoor.ApplicationName)

		// OpenAI
		assert.Equal(t, "test-openai-key", config.OpenAI.APIKey)
		assert.Equal(t, "https://api.openai.com/v1", config.OpenAI.APIEndpoint)
		assert.Equal(t, "gpt-3.5-turbo", config.OpenAI.ModelID)
		assert.Empty(t, config.OpenAI.PremiumAPIKey)
		assert.Empty(t, config.OpenAI.PremiumAPIEndpoint)
		assert.Empty(t, config.OpenAI.PremiumModelID)

		// AIGC
		assert.Equal(t, "https://aigc.example.com", config.AIGC.Endpoint)
	})

	t.Run("RedisCluster", func(t *testing.T) {
		setTestEnv(t)
		t.Setenv("REDIS_ADDR", "node1:6379,node2:6379,node3:6379")

		logger := log.GetLogger()
		config, err := Load(logger)
		require.NoError(t, err)
		require.NotNil(t, config)

		// Redis cluster configuration
		assert.Equal(t, "node1:6379,node2:6379,node3:6379", config.Redis.Addr)
		assert.True(t, config.Redis.IsClusterMode())
		expected := []string{"node1:6379", "node2:6379", "node3:6379"}
		assert.Equal(t, expected, config.Redis.GetAddr())
	})

	t.Run("PremiumConfig", func(t *testing.T) {
		setTestEnv(t)
		t.Setenv("PORT", ":9090")
		t.Setenv("OPENAI_PREMIUM_API_KEY", "premium-key")
		t.Setenv("OPENAI_PREMIUM_API_ENDPOINT", "https://premium.openai.com/v1")
		t.Setenv("OPENAI_PREMIUM_MODEL_ID", "gpt-4")

		logger := log.GetLogger()
		config, err := Load(logger)
		require.NoError(t, err)
		require.NotNil(t, config)

		// Server
		assert.Equal(t, ":9090", config.Server.Port)
		assert.Equal(t, config.Server.Port, config.Server.GetPort())

		// OpenAI
		assert.Equal(t, "premium-key", config.OpenAI.PremiumAPIKey)
		assert.Equal(t, config.OpenAI.PremiumAPIKey, config.OpenAI.GetPremiumAPIKey())
		assert.Equal(t, "https://premium.openai.com/v1", config.OpenAI.PremiumAPIEndpoint)
		assert.Equal(t, config.OpenAI.PremiumAPIEndpoint, config.OpenAI.GetPremiumAPIEndpoint())
		assert.Equal(t, "gpt-4", config.OpenAI.PremiumModelID)
		assert.Equal(t, config.OpenAI.PremiumModelID, config.OpenAI.GetPremiumModelID())
	})
}

func TestGetIntEnv(t *testing.T) {
	t.Run("ValidIntegerValue", func(t *testing.T) {
		t.Setenv("TEST_INT", "42")
		assert.Equal(t, 42, getIntEnv("TEST_INT"))
	})

	t.Run("ZeroValue", func(t *testing.T) {
		t.Setenv("TEST_INT_ZERO", "0")
		assert.Equal(t, 0, getIntEnv("TEST_INT_ZERO"))
	})

	t.Run("NegativeValue", func(t *testing.T) {
		t.Setenv("TEST_INT_NEG", "-10")
		assert.Equal(t, -10, getIntEnv("TEST_INT_NEG"))
	})

	t.Run("EmptyValue", func(t *testing.T) {
		t.Setenv("TEST_INT_EMPTY", "")
		assert.Equal(t, 0, getIntEnv("TEST_INT_EMPTY"))
	})

	t.Run("NonExistentVariable", func(t *testing.T) {
		assert.Equal(t, 0, getIntEnv("NON_EXISTENT_VAR"))
	})

	t.Run("InvalidIntegerValue", func(t *testing.T) {
		t.Setenv("TEST_INT_INVALID", "not-a-number")
		assert.Equal(t, 0, getIntEnv("TEST_INT_INVALID"))
	})

	t.Run("FloatValue", func(t *testing.T) {
		t.Setenv("TEST_INT_FLOAT", "42.5")
		assert.Equal(t, 0, getIntEnv("TEST_INT_FLOAT"))
	})
}
