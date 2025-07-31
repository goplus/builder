package controller

import (
	"context"
	"errors"
	_ "image/png"
	"strconv"
	"time"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/aiinteraction"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/tracer/httpclient"
	"github.com/goplus/builder/spx-backend/internal/workflow"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	"gorm.io/gorm"
)

var (
	ErrBadRequest = errors.New("bad request")
	ErrNotExist   = errors.New("not exist")
)

// Controller is the controller for the service.
type Controller struct {
	db            *gorm.DB
	kodo          *kodoClient
	copilot       *copilot.Copilot
	workflow      *workflow.Workflow
	aiInteraction *aiinteraction.AIInteraction
	aigc          *aigc.AigcClient
}

// New creates a new controller.
func New(ctx context.Context, db *gorm.DB, cfg *config.Config) (*Controller, error) {
	kodoClient := newKodoClient(cfg.Kodo)

	traceClient := httpclient.New(nil)

	casdoorsdk.SetHttpClient(traceClient)

	openaiClient := openai.NewClient(
		option.WithAPIKey(cfg.OpenAI.APIKey),
		option.WithBaseURL(cfg.OpenAI.APIEndpoint),
		option.WithHTTPClient(traceClient),
	)

	openaiPremiumClient := openai.NewClient(
		option.WithAPIKey(cfg.OpenAI.GetPremiumAPIKey()),
		option.WithBaseURL(cfg.OpenAI.GetPremiumAPIEndpoint()),
		option.WithHTTPClient(traceClient),
	)

	cpt, err := copilot.New(openaiClient, cfg.OpenAI.ModelID, openaiPremiumClient, cfg.OpenAI.GetPremiumModelID())
	if err != nil {
		return nil, err
	}

	stdflow := NewWorkflow("stdflow", cpt, db)

	aiInteraction, err := aiinteraction.New(openaiClient, cfg.OpenAI.ModelID)
	if err != nil {
		return nil, err
	}

	aigcClient := aigc.NewAigcClientWithHTTPClient(cfg.AIGC.Endpoint, traceClient)

	return &Controller{
		db:            db,
		kodo:          kodoClient,
		copilot:       cpt,
		workflow:      stdflow,
		aiInteraction: aiInteraction,
		aigc:          aigcClient,
	}, nil
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
	system := copilot.WorkflowSystemPromptTpl
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
	system := copilot.WorkflowSystemPromptTpl
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
	system := copilot.WorkflowSystemPromptTpl
	return workflow.NewLLMNode(copit, system, true)
}

// kodoClient is the client for Kodo.
type kodoClient struct {
	cred         *qiniuAuth.Credentials
	bucket       string
	bucketRegion string
	baseUrl      string
}

// newKodoClient creates a new [kodoClient].
func newKodoClient(cfg config.KodoConfig) *kodoClient {
	return &kodoClient{
		cred: qiniuAuth.New(
			cfg.AccessKey,
			cfg.SecretKey,
		),
		bucket:       cfg.Bucket,
		bucketRegion: cfg.BucketRegion,
		baseUrl:      cfg.BaseURL,
	}
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
