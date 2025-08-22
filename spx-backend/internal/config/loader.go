package config

import (
	"errors"
	"io/fs"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/qiniu/x/log"
)

// Load loads the configuration from environment variables.
func Load(logger *log.Logger) (*Config, error) {
	// Load .env file if it exists.
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		logger.Printf("failed to load env: %v", err)
		return nil, err
	}

	config := &Config{
		Server: ServerConfig{
			Port: os.Getenv("PORT"),
		},
		Database: DatabaseConfig{
			DSN:              mustGetEnv(logger, "GOP_SPX_DSN"),
			AutoMigrate:      getBoolEnv("GOP_SPX_AUTO_MIGRATE"),
			MigrationTimeout: getDurationEnv("GOP_SPX_MIGRATION_TIMEOUT"),
		},
		Sentry: SentryConfig{
			DSN:        os.Getenv("SENTRY_DSN"),
			SampleRate: getFloatEnv("SENTRY_SAMPLE_RATE", 1.0),
		},
		Redis: RedisConfig{
			Addr:     os.Getenv("REDIS_ADDR"),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       getIntEnv("REDIS_DB"),
			PoolSize: getIntEnv("REDIS_POOL_SIZE"),
		},
		Kodo: KodoConfig{
			AccessKey:    mustGetEnv(logger, "KODO_AK"),
			SecretKey:    mustGetEnv(logger, "KODO_SK"),
			Bucket:       mustGetEnv(logger, "KODO_BUCKET"),
			BucketRegion: mustGetEnv(logger, "KODO_BUCKET_REGION"),
			BaseURL:      mustGetEnv(logger, "KODO_BASE_URL"),
		},
		Casdoor: CasdoorConfig{
			Endpoint:         mustGetEnv(logger, "GOP_CASDOOR_ENDPOINT"),
			ClientID:         mustGetEnv(logger, "GOP_CASDOOR_CLIENTID"),
			ClientSecret:     mustGetEnv(logger, "GOP_CASDOOR_CLIENTSECRET"),
			Certificate:      mustGetEnv(logger, "GOP_CASDOOR_CERTIFICATE"),
			OrganizationName: mustGetEnv(logger, "GOP_CASDOOR_ORGANIZATIONNAME"),
			ApplicationName:  mustGetEnv(logger, "GOP_CASDOOR_APPLICATIONNAME"),
		},
		OpenAI: OpenAIConfig{
			APIKey:             mustGetEnv(logger, "OPENAI_API_KEY"),
			APIEndpoint:        mustGetEnv(logger, "OPENAI_API_ENDPOINT"),
			ModelID:            mustGetEnv(logger, "OPENAI_MODEL_ID"),
			PremiumAPIKey:      os.Getenv("OPENAI_PREMIUM_API_KEY"),
			PremiumAPIEndpoint: os.Getenv("OPENAI_PREMIUM_API_ENDPOINT"),
			PremiumModelID:     os.Getenv("OPENAI_PREMIUM_MODEL_ID"),
		},
		AIGC: AIGCConfig{
			Endpoint: mustGetEnv(logger, "AIGC_ENDPOINT"),
		},
	}
	return config, nil
}

// mustGetEnv gets the environment variable value or exits the program.
func mustGetEnv(logger *log.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("missing required environment variable: %s", key)
	}
	return value
}

// getIntEnv gets an integer environment variable value or returns 0 if not set.
func getIntEnv(key string) int {
	value := os.Getenv(key)
	if value == "" {
		return 0
	}
	intValue, _ := strconv.Atoi(value)
	return intValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	floatValue, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return floatValue
}

// getBoolEnv gets a boolean environment variable value or returns false if not set.
func getBoolEnv(key string) bool {
	value := os.Getenv(key)
	if value == "" {
		return false
	}
	boolValue, _ := strconv.ParseBool(value)
	return boolValue
}

// getDurationEnv gets a duration environment variable value or returns 0 if not set.
func getDurationEnv(key string) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return 0
	}
	duration, _ := time.ParseDuration(value)
	return duration
}
