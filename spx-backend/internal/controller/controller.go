package controller

import (
	"context"
	"errors"
	_ "image/png"
	"io/fs"
	"os"
	"strconv"
	"time"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuLog "github.com/qiniu/x/log"
	"gorm.io/gorm"
)

var (
	ErrBadRequest   = errors.New("bad request")
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
	db            *gorm.DB
	kodo          *kodoConfig
	aigcClient    *aigc.AigcClient
	casdoorClient casdoorClient
	copilot       copilot.AICopilot
}

// New creates a new controller.
func New(ctx context.Context) (*Controller, error) {
	logger := log.GetLogger()

	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		logger.Printf("failed to load env: %v", err)
		return nil, err
	}

	dsn := mustEnv(logger, "GOP_SPX_DSN")
	db, err := model.OpenDB(ctx, dsn, 0, 0)
	if err != nil {
		logger.Printf("failed to open database: %v", err)
		return nil, err
	}
	// TODO: Configure connection pool and timeouts.

	kodoConfig := newKodoConfig(logger)
	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))
	casdoorClient := newCasdoorClient(logger)

	// Create the Copilot instance.
	copilot := copilot.NewCopilot(&copilot.Config{
		DeepSeekAPIKey:  mustEnv(logger, "DEEPSEEK_API_KEY"),
		AnthropicAPIKey: mustEnv(logger, "ANTHROPIC_API_KEY"),
	})

	return &Controller{
		db:            db,
		kodo:          kodoConfig,
		aigcClient:    aigcClient,
		casdoorClient: casdoorClient,
		copilot:       copilot,
	}, nil
}

// kodoConfig is the configuration for Kodo.
type kodoConfig struct {
	cred         *qiniuAuth.Credentials
	bucket       string
	bucketRegion string
	baseUrl      string
}

// newKodoConfig creates a new [kodoConfig].
func newKodoConfig(logger *qiniuLog.Logger) *kodoConfig {
	return &kodoConfig{
		cred: qiniuAuth.New(
			mustEnv(logger, "KODO_AK"),
			mustEnv(logger, "KODO_SK"),
		),
		bucket:       mustEnv(logger, "KODO_BUCKET"),
		bucketRegion: mustEnv(logger, "KODO_BUCKET_REGION"),
		baseUrl:      mustEnv(logger, "KODO_BASE_URL"),
	}
}

// casdoorClient is the client interface for Casdoor.
type casdoorClient interface {
	ParseJwtToken(token string) (*casdoorsdk.Claims, error)
	GetUser(name string) (*casdoorsdk.User, error)
}

// newCasdoorClient creates a new [casdoorsdk.Client].
func newCasdoorClient(logger *qiniuLog.Logger) casdoorClient {
	config := &casdoorsdk.AuthConfig{
		Endpoint:         mustEnv(logger, "GOP_CASDOOR_ENDPOINT"),
		ClientId:         mustEnv(logger, "GOP_CASDOOR_CLIENTID"),
		ClientSecret:     mustEnv(logger, "GOP_CASDOOR_CLIENTSECRET"),
		Certificate:      mustEnv(logger, "GOP_CASDOOR_CERTIFICATE"),
		OrganizationName: mustEnv(logger, "GOP_CASDOOR_ORGANIZATIONNAME"),
		ApplicationName:  mustEnv(logger, "GOP_CASDOOR_APPLICATIONNAME"),
	}
	return casdoorsdk.NewClientWithConf(config)
}

// mustEnv gets the environment variable value or exits the program.
func mustEnv(logger *qiniuLog.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("Missing required environment variable: %s", key)
	}
	return value
}

// ModelDTO is the data transfer object for models.
type ModelDTO struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// toModelDTO converts the model to its DTO.
func toModelDTO(m model.Model) ModelDTO {
	return ModelDTO{
		ID:        strconv.FormatInt(m.ID, 10),
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

// SortOrder is the sort order.
type SortOrder string

const (
	SortOrderAsc  SortOrder = "asc"
	SortOrderDesc SortOrder = "desc"
)

// IsValid reports whether the sort order is valid.
func (so SortOrder) IsValid() bool {
	switch so {
	case SortOrderAsc, SortOrderDesc:
		return true
	}
	return false
}

// Pagination is the pagination information.
type Pagination struct {
	Index int
	Size  int
}

// IsValid reports whether the pagination is valid.
func (p Pagination) IsValid() bool {
	return p.Index >= 1 && p.Size >= 1 && p.Size <= 100
}

// Offset returns the calculated offset for DB query.
func (p Pagination) Offset() int {
	return (p.Index - 1) * p.Size
}

// ByPage is a generic struct for paginated data.
type ByPage[T any] struct {
	Total int64 `json:"total"`
	Data  []T   `json:"data"`
}
