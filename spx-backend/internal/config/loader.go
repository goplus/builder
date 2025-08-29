package config

import (
	"errors"
	"io/fs"
	"os"
	"strconv"
	"strings"
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
			DSN: mustGetEnv(logger, "GOP_SPX_DSN"),
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

		
		Providers: ProvidersConfig{
			SVGIO: SVGIOConfig{
				BaseURL:    getEnvAsString("SVGIO_BASE_URL", "https://api.svg.io"),
				Timeout:    getEnvAsDuration("SVGIO_TIMEOUT", "60s"),
				MaxRetries: getEnvAsInt("SVGIO_MAX_RETRIES", 3),
				Enabled:    getEnvAsBool("SVGIO_ENABLED", true),
				Endpoints: SVGIOEndpoints{
					Generate: getEnvAsString("SVGIO_GENERATE_ENDPOINT", "/v1/generate-image"),
				},
			},
			Recraft: RecraftConfig{
				BaseURL:         getEnvAsString("RECRAFT_BASE_URL", "https://external.api.recraft.ai"),
				Timeout:         getEnvAsDuration("RECRAFT_TIMEOUT", "60s"),
				MaxRetries:      getEnvAsInt("RECRAFT_MAX_RETRIES", 3),
				Enabled:         getEnvAsBool("RECRAFT_ENABLED", true),
				DefaultModel:    getEnvAsString("RECRAFT_DEFAULT_MODEL", "recraftv3"),
				SupportedModels: getEnvAsStringSlice("RECRAFT_SUPPORTED_MODELS", "recraftv3,recraftv2"),
				Endpoints: RecraftEndpoints{
					Generate:  getEnvAsString("RECRAFT_GENERATE_ENDPOINT", "/v1/images/generations"),
					Vectorize: getEnvAsString("RECRAFT_VECTORIZE_ENDPOINT", "/v1/images/vectorize"),
				},
			},
			SVGOpenAI: OpenAISVGConfig{
				BaseURL:      getEnvAsString("SVG_OPENAI_BASE_URL", "https://api.qnaigc.com/v1/"),
				Timeout:      getEnvAsDuration("SVG_OPENAI_TIMEOUT", "60s"),
				MaxRetries:   getEnvAsInt("SVG_OPENAI_MAX_RETRIES", 3),
				Enabled:      getEnvAsBool("SVG_OPENAI_ENABLED", true),
				DefaultModel: getEnvAsString("SVG_OPENAI_DEFAULT_MODEL", "claude-4.0-sonnet"),
				MaxTokens:    getEnvAsInt("SVG_OPENAI_MAX_TOKENS", 4000),
				Temperature:  getEnvAsFloat("SVG_OPENAI_TEMPERATURE", 0.7),
			},
		},
		Translation: TranslationConfig{
			Enabled:      getEnvAsBool("TRANSLATION_ENABLED", true),
			ServiceURL:   getEnvAsString("TRANSLATION_SERVICE_URL", "https://api.qnaigc.com/v1/chat/completions"),
			DefaultModel: getEnvAsString("TRANSLATION_DEFAULT_MODEL", "claude-4.0-sonnet"),
			Timeout:      getEnvAsDuration("TRANSLATION_TIMEOUT", "45s"),
			MaxRetries:   getEnvAsInt("TRANSLATION_MAX_RETRIES", 2),
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

// getEnvAsString gets the environment variable value or returns default value.
func getEnvAsString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an integer environment variable value or returns default value.
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsFloat gets a float environment variable value or returns default value.
func getEnvAsFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}

// getEnvAsBool gets a boolean environment variable value or returns default value.
func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

// getEnvAsDuration gets a duration environment variable value or returns default value.
func getEnvAsDuration(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	if duration, err := time.ParseDuration(defaultValue); err == nil {
		return duration
	}
	return 30 * time.Second // fallback default
}

// getEnvAsStringSlice gets a comma-separated string environment variable value or returns default value.
func getEnvAsStringSlice(key, defaultValue string) []string {
	value := getEnvAsString(key, defaultValue)
	if value == "" {
		return []string{}
	}
	return strings.Split(value, ",")
}
