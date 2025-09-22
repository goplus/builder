package config

import (
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	// Database
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True&loc=UTC&multiStatements=true")
	t.Setenv("GOP_SPX_AUTO_MIGRATE", "true")
	t.Setenv("GOP_SPX_MIGRATION_TIMEOUT", "10m")

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

	// WeChat
	t.Setenv("WECHAT_APPID", "wx5f7ad87518d77bf3")
	t.Setenv("WECHAT_SECRET", "test-wechat-secret")

	// Douyin
	t.Setenv("DOUYIN_CLIENT_KEY", "awo2b5ecr842xvcr")
	t.Setenv("DOUYIN_CLIENT_SECRET", "test-douyin-secret")
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
		assert.Equal(t, "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True&loc=UTC&multiStatements=true", config.Database.DSN)
		assert.True(t, config.Database.AutoMigrate)
		assert.Equal(t, 10*time.Minute, config.Database.MigrationTimeout)
		assert.Equal(t, config.Database.MigrationTimeout, config.Database.GetMigrationTimeout())

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
		assert.Empty(t, config.OpenAI.LiteAPIKey)
		assert.Empty(t, config.OpenAI.LiteAPIEndpoint)
		assert.Empty(t, config.OpenAI.LiteModelID)
		assert.Empty(t, config.OpenAI.PremiumAPIKey)
		assert.Empty(t, config.OpenAI.PremiumAPIEndpoint)
		assert.Empty(t, config.OpenAI.PremiumModelID)

		// AIGC
		assert.Equal(t, "https://aigc.example.com", config.AIGC.Endpoint)

		// WeChat
		assert.Equal(t, "wx5f7ad87518d77bf3", config.WeChat.AppID)
		assert.Equal(t, "test-wechat-secret", config.WeChat.Secret)

		// Douyin
		assert.Equal(t, "awo2b5ecr842xvcr", config.Douyin.ClientKey)
		assert.Equal(t, "test-douyin-secret", config.Douyin.ClientSecret)
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

	t.Run("LiteConfig", func(t *testing.T) {
		setTestEnv(t)
		t.Setenv("OPENAI_LITE_API_KEY", "lite-key")
		t.Setenv("OPENAI_LITE_API_ENDPOINT", "https://lite.openai.com/v1")
		t.Setenv("OPENAI_LITE_MODEL_ID", "gpt-4o-mini")

		logger := log.GetLogger()
		config, err := Load(logger)
		require.NoError(t, err)
		require.NotNil(t, config)

		// OpenAI
		assert.Equal(t, "lite-key", config.OpenAI.LiteAPIKey)
		assert.Equal(t, config.OpenAI.LiteAPIKey, config.OpenAI.GetLiteAPIKey())
		assert.Equal(t, "https://lite.openai.com/v1", config.OpenAI.LiteAPIEndpoint)
		assert.Equal(t, config.OpenAI.LiteAPIEndpoint, config.OpenAI.GetLiteAPIEndpoint())
		assert.Equal(t, "gpt-4o-mini", config.OpenAI.LiteModelID)
		assert.Equal(t, config.OpenAI.LiteModelID, config.OpenAI.GetLiteModelID())
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

func TestGetBoolEnv(t *testing.T) {
	t.Run("TrueValues", func(t *testing.T) {
		trueValues := []string{"true", "TRUE", "True", "1", "t", "T"}
		for _, val := range trueValues {
			t.Setenv("TEST_BOOL", val)
			assert.True(t, getBoolEnv("TEST_BOOL"), "value: %s", val)
		}
	})

	t.Run("FalseValues", func(t *testing.T) {
		falseValues := []string{"false", "FALSE", "False", "0", "f", "F"}
		for _, val := range falseValues {
			t.Setenv("TEST_BOOL", val)
			assert.False(t, getBoolEnv("TEST_BOOL"), "value: %s", val)
		}
	})

	t.Run("EmptyValue", func(t *testing.T) {
		t.Setenv("TEST_BOOL_EMPTY", "")
		assert.False(t, getBoolEnv("TEST_BOOL_EMPTY"))
	})

	t.Run("NonExistentVariable", func(t *testing.T) {
		assert.False(t, getBoolEnv("NON_EXISTENT_BOOL"))
	})
}

func TestGetDurationEnv(t *testing.T) {
	t.Run("ValidDuration", func(t *testing.T) {
		t.Setenv("TEST_DURATION", "5m30s")
		assert.Equal(t, 5*time.Minute+30*time.Second, getDurationEnv("TEST_DURATION"))
	})

	t.Run("Minutes", func(t *testing.T) {
		t.Setenv("TEST_DURATION_MIN", "10m")
		assert.Equal(t, 10*time.Minute, getDurationEnv("TEST_DURATION_MIN"))
	})

	t.Run("Seconds", func(t *testing.T) {
		t.Setenv("TEST_DURATION_SEC", "45s")
		assert.Equal(t, 45*time.Second, getDurationEnv("TEST_DURATION_SEC"))
	})

	t.Run("EmptyValue", func(t *testing.T) {
		t.Setenv("TEST_DURATION_EMPTY", "")
		assert.Equal(t, time.Duration(0), getDurationEnv("TEST_DURATION_EMPTY"))
	})

	t.Run("NonExistentVariable", func(t *testing.T) {
		assert.Equal(t, time.Duration(0), getDurationEnv("NON_EXISTENT_DURATION"))
	})

	t.Run("InvalidDuration", func(t *testing.T) {
		t.Setenv("TEST_DURATION_INVALID", "not-a-duration")
		assert.Equal(t, time.Duration(0), getDurationEnv("TEST_DURATION_INVALID"))
	})
}
