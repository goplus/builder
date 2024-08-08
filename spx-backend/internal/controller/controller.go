package controller

import (
	"context"
	"database/sql"
	"errors"
	"github.com/goplus/builder/spx-backend/internal/llm"
	_ "image/png"
	"io/fs"
	"os"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuLog "github.com/qiniu/x/log"
)

var (
	ErrNotExist     = errors.New("not exist")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
)

// contextKey is a value for use with [context.WithValue]. It's used as a
// pointer so it fits in an interface{} without allocation.
type contextKey struct {
	name string
}

// Controller is the controller for the service.
type Controller struct {
	db            *sql.DB
	kodo          *kodoConfig
	aigcClient    *aigc.AigcClient
	casdoorClient *casdoorsdk.Client
	llm           *llm.Client
}

// New creates a new controller.
func New(ctx context.Context) (*Controller, error) {
	logger := log.GetLogger()

	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		logger.Printf("failed to load env: %v", err)
		return nil, err
	}

	dsn := mustEnv(logger, "GOP_SPX_DSN")
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.Printf("failed to connect sql: %v", err)
		return nil, err
	}
	// TODO: Configure connection pool and timeouts.

	kodoConfig := &kodoConfig{
		cred: qiniuAuth.New(
			mustEnv(logger, "KODO_AK"),
			mustEnv(logger, "KODO_SK"),
		),
		bucket:       mustEnv(logger, "KODO_BUCKET"),
		bucketRegion: mustEnv(logger, "KODO_BUCKET_REGION"),
		baseUrl:      mustEnv(logger, "KODO_BASE_URL"),
	}

	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))

	casdoorAuthConfig := &casdoorsdk.AuthConfig{
		Endpoint:         os.Getenv("GOP_CASDOOR_ENDPOINT"),
		ClientId:         os.Getenv("GOP_CASDOOR_CLIENTID"),
		ClientSecret:     os.Getenv("GOP_CASDOOR_CLIENTSECRET"),
		Certificate:      os.Getenv("GOP_CASDOOR_CERTIFICATE"),
		OrganizationName: os.Getenv("GOP_CASDOOR_ORGANIZATIONNAME"),
		ApplicationName:  os.Getenv("GOP_CASDOOR_APPLICATONNAME"),
	}
	casdoorClient := casdoorsdk.NewClientWithConf(casdoorAuthConfig)

	llmConfig := &llm.Conf{
		BaseUrl:      os.Getenv("LLM_BASE_URL"),
		ApiKey:       os.Getenv("LLM_API_KEY"),
		Model:        os.Getenv("LLM_MODEL"),
		BackUpUrl:    os.Getenv("LLM_BACKUP_URL"),
		BackUpAPIKey: os.Getenv("LLM_BACKUP_APIKEY"),
		BackUpModel:  os.Getenv("LLM_BACKUP_MODEL"),
	}
	llm := llm.NewLLMClientWithConfig(llmConfig)

	return &Controller{
		db:            db,
		kodo:          kodoConfig,
		aigcClient:    aigcClient,
		casdoorClient: casdoorClient,
		llm:           llm,
	}, nil
}

// kodoConfig is the configuration for Kodo.
type kodoConfig struct {
	cred         *qiniuAuth.Credentials
	bucket       string
	bucketRegion string
	baseUrl      string
}

// mustEnv gets the environment variable value or exits the program.
func mustEnv(logger *qiniuLog.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("Missing required environment variable: %s", key)
	}
	return value
}
