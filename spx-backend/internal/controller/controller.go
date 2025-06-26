package controller

import (
	"context"
	"errors"
	_ "image/png"
	"io/fs"
	"os"
	"strconv"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/aiinteraction"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authn/casdoor"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/workflow"
	"github.com/joho/godotenv"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuLog "github.com/qiniu/x/log"
	"gorm.io/gorm"
)

var (
	ErrBadRequest = errors.New("bad request")
	ErrNotExist   = errors.New("not exist")
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
	authenticator authn.Authenticator
	aigcClient    *aigc.AigcClient
	copilot       *copilot.Copilot
	workflow      *workflow.Workflow
	aiInteraction *aiinteraction.AIInteraction
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
	authenticator := casdoor.New(casdoor.Config{
		Endpoint:         mustEnv(logger, "GOP_CASDOOR_ENDPOINT"),
		ClientID:         mustEnv(logger, "GOP_CASDOOR_CLIENTID"),
		ClientSecret:     mustEnv(logger, "GOP_CASDOOR_CLIENTSECRET"),
		Certificate:      mustEnv(logger, "GOP_CASDOOR_CERTIFICATE"),
		OrganizationName: mustEnv(logger, "GOP_CASDOOR_ORGANIZATIONNAME"),
		ApplicationName:  mustEnv(logger, "GOP_CASDOOR_APPLICATIONNAME"),
	}, db)
	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))

	openaiAPIKey := mustEnv(logger, "OPENAI_API_KEY")
	openaiAPIEndpoint := mustEnv(logger, "OPENAI_API_ENDPOINT")
	openaiModelID := mustEnv(logger, "OPENAI_MODEL_ID")
	openaiClient := openai.NewClient(
		option.WithAPIKey(openaiAPIKey),
		option.WithBaseURL(openaiAPIEndpoint),
	)

	openaiPremiumAPIKey := envOrDefault("OPENAI_PREMIUM_API_KEY", openaiAPIKey)
	openaiPremiumAPIEndpoint := envOrDefault("OPENAI_PREMIUM_API_ENDPOINT", openaiAPIEndpoint)
	openaiPremiumModelID := envOrDefault("OPENAI_PREMIUM_MODEL_ID", openaiModelID)
	openaiPremiumClient := openai.NewClient(
		option.WithAPIKey(openaiPremiumAPIKey),
		option.WithBaseURL(openaiPremiumAPIEndpoint),
	)

	cpt, err := copilot.New(openaiPremiumClient, openaiPremiumModelID)
	if err != nil {
		logger.Printf("failed to create copilot: %v", err)
		return nil, err
	}

	stdflow := NewWorkflow("stdflow", cpt, db)

	aiInteraction, err := aiinteraction.New(openaiClient, openaiModelID)
	if err != nil {
		logger.Printf("failed to create ai interaction service: %v", err)
		return nil, err
	}

	return &Controller{
		db:            db,
		kodo:          kodoConfig,
		authenticator: authenticator,
		aigcClient:    aigcClient,
		copilot:       cpt,
		workflow:      stdflow,
		aiInteraction: aiInteraction,
	}, nil
}

// Authenticator returns the authenticator.
func (ctrl *Controller) Authenticator() authn.Authenticator {
	return ctrl.authenticator
}

func NewWorkflow(name string, copilot *copilot.Copilot, db *gorm.DB) *workflow.Workflow {
	editNode := NewCodeEditNode(copilot)
	chatNode := NewMessageNode(copilot)
	flow := workflow.NewWorkflow(name)

	projectCreate := workflow.NewIfStmt().
		If(func(env workflow.Env) bool {
			return env.Get("project_id") == nil
		}, NewCreateProject(copilot)).
		Else(editNode)

	classifierNode := workflow.NewClassifierNode(copilot, ``).
		AddCase("project_create", projectCreate).
		AddCase("code_edit", editNode).
		Default(chatNode)

	classifier := workflow.NewIfStmt().
		If(func(env workflow.Env) bool {
			return env.Get("Classification") == nil
		}, classifierNode).
		If(func(env workflow.Env) bool {
			return env.Get("Classification") == "project_create"
		}, projectCreate).
		If(func(env workflow.Env) bool {
			return env.Get("Classification") == "code_edit"
		}, editNode).
		Else(chatNode)

	flow.Start(workflow.NewIfStmt().
		If(func(env workflow.Env) bool {
			return env.Get("ReferenceID") == nil
		}, NewKeyNode(copilot).SetNext(workflow.NewSearch(db).SetNext(classifier))).
		Else(workflow.NewSearch(db).SetNext(classifier)))

	return flow
}

func NewCreateProject(copit *copilot.Copilot) *workflow.LLMNode {
	system := copilot.SystemPromptWithToolsTpl
	node := workflow.NewLLMNode(copit, system, true)
	node.WithPrepare(func(env workflow.Env) workflow.Env {
		msgs := env.Get("messages")
		if msgs != nil {
			if messages, ok := msgs.([]copilot.Message); ok {
				messages = append(messages, copilot.Message{
					Role: copilot.RoleUser,
					// TODO(wyvern): Use i18n to select auxiliary user message based on the provided language
					Content: copilot.Content{Text: "请使用已提供的工具来创建项目"},
				})
				env.Set("messages", messages)
			}
		}
		return env
	})
	return node
}

func NewCodeEditNode(copit *copilot.Copilot) *workflow.LLMNode {
	system := copilot.SystemPromptWithToolsTpl
	node := workflow.NewLLMNode(copit, system, true)
	node.WithPrepare(func(env workflow.Env) workflow.Env {
		msgs := env.Get("messages")
		if msgs != nil {
			if messages, ok := msgs.([]copilot.Message); ok {
				messages = append(messages, copilot.Message{
					Role: copilot.RoleUser,
					// TODO(wyvern): Use i18n to select auxiliary user message based on the provided language
					Content: copilot.Content{Text: `根据当前项目文件列表和背景信息，请确认是否需要创建精灵或背景。如无需，请调用工具插入代码，但请先解决现有文件中的诊断错误`},
				})
				env.Set("messages", messages)
			}
		}
		return env
	})
	return node
}

func NewKeyNode(copilot *copilot.Copilot) *workflow.LLMNode {
	system := `We are using Go+'s XBuilder platform. We provide you with a tool that you can use to query whether there are reference projects on the XBuilder platform. 
Reference project names, it is best to give multiple (>3), including whether it is camel case, whether it is underlined, whether the first letter is capitalized, etc.
Please use the search tool to search.

## search
Description: Request to search project in XBuilder.
Parameters:
- keys: (required) Project name. The character set includes letters, numbers and underscores. If there are multiple names, use | to separate them, for example: key1|key2|key3.
Usage:
<search>
<keys>key1|key2|key3</keys>
</search>

## Notes
1. Use the provided search keywords to query whether there are reference projects on the XBuilder platform.
2. If there are multiple keywords, you can use the "|" symbol to connect them together.
3. The commitment results do not contain any XML tags.`
	return workflow.NewLLMNode(copilot, system, false)
}

func NewMessageNode(copit *copilot.Copilot) *workflow.LLMNode {
	system := copilot.SystemPromptWithToolsTpl
	return workflow.NewLLMNode(copit, system, true)
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

// mustEnv gets the environment variable value or exits the program.
func mustEnv(logger *qiniuLog.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("Missing required environment variable: %s", key)
	}
	return value
}

// envOrDefault gets the environment variable value or returns the default value.
func envOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
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
