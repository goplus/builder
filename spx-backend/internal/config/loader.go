package config

import (
	"errors"
	"io/fs"
	"os"

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
			DSN: mustEnv(logger, "GOP_SPX_DSN"),
		},
		Kodo: KodoConfig{
			AccessKey:    mustEnv(logger, "KODO_AK"),
			SecretKey:    mustEnv(logger, "KODO_SK"),
			Bucket:       mustEnv(logger, "KODO_BUCKET"),
			BucketRegion: mustEnv(logger, "KODO_BUCKET_REGION"),
			BaseURL:      mustEnv(logger, "KODO_BASE_URL"),
		},
		Casdoor: CasdoorConfig{
			Endpoint:         mustEnv(logger, "GOP_CASDOOR_ENDPOINT"),
			ClientID:         mustEnv(logger, "GOP_CASDOOR_CLIENTID"),
			ClientSecret:     mustEnv(logger, "GOP_CASDOOR_CLIENTSECRET"),
			Certificate:      mustEnv(logger, "GOP_CASDOOR_CERTIFICATE"),
			OrganizationName: mustEnv(logger, "GOP_CASDOOR_ORGANIZATIONNAME"),
			ApplicationName:  mustEnv(logger, "GOP_CASDOOR_APPLICATIONNAME"),
		},
		OpenAI: OpenAIConfig{
			APIKey:             mustEnv(logger, "OPENAI_API_KEY"),
			APIEndpoint:        mustEnv(logger, "OPENAI_API_ENDPOINT"),
			ModelID:            mustEnv(logger, "OPENAI_MODEL_ID"),
			PremiumAPIKey:      os.Getenv("OPENAI_PREMIUM_API_KEY"),
			PremiumAPIEndpoint: os.Getenv("OPENAI_PREMIUM_API_ENDPOINT"),
			PremiumModelID:     os.Getenv("OPENAI_PREMIUM_MODEL_ID"),
		},
		AIGC: AIGCConfig{
			Endpoint: mustEnv(logger, "AIGC_ENDPOINT"),
		},
	}
	return config, nil
}

// mustEnv gets the environment variable value or exits the program.
func mustEnv(logger *log.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("missing required environment variable: %s", key)
	}
	return value
}
