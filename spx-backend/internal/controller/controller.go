package controller

import (
	"context"
	"database/sql"
	"errors"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	ormLogger "gorm.io/gorm/logger" // GORM 的 logger 包
	"gorm.io/gorm/schema"
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
	ormDb         *gorm.DB
	kodo          *kodoConfig
	aigcClient    *aigc.AigcClient
	casdoorClient *casdoorsdk.Client
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
	// TODO(who): Configure connection pool and timeouts.
	var ormDb *gorm.DB
	if os.Getenv("ENV") != "test" {
		ormDb, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: ormLogger.Default.LogMode(ormLogger.Info),
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
		})
		if err != nil {
			logger.Printf("failed to connect gorm: %v", err)
			return nil, err
		}
	}

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

	return &Controller{
		db:            db,
		ormDb:         ormDb,
		kodo:          kodoConfig,
		aigcClient:    aigcClient,
		casdoorClient: casdoorClient,
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
