package controller

import (
	"bytes"
	"context"
	"crypto/md5"
	"errors"
	"fmt"
	_ "image/png"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/aiinteraction"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/keywordservice"
	"github.com/goplus/builder/spx-backend/internal/svggen"
	"github.com/goplus/builder/spx-backend/internal/types"
	"github.com/goplus/builder/spx-backend/internal/workflow"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuStorage "github.com/qiniu/go-sdk/v7/storage"
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
	svggen        *svggen.ServiceManager
}

// New creates a new controller.
func New(ctx context.Context, db *gorm.DB, cfg *config.Config) (*Controller, error) {
	kodoClient := newKodoClient(cfg.Kodo)

	openaiClient := openai.NewClient(
		option.WithAPIKey(cfg.OpenAI.APIKey),
		option.WithBaseURL(cfg.OpenAI.APIEndpoint),
	)

	openaiPremiumClient := openai.NewClient(
		option.WithAPIKey(cfg.OpenAI.GetPremiumAPIKey()),
		option.WithBaseURL(cfg.OpenAI.GetPremiumAPIEndpoint()),
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

	aigcClient := aigc.NewAigcClient(cfg.AIGC.Endpoint)

	// Initialize SVG generation service manager
	svggenManager := svggen.NewServiceManager(cfg, log.GetLogger())
	// Set copilot instance for OpenAI services
	svggenManager.SetCopilot(cpt)

	return &Controller{
		db:            db,
		kodo:          kodoClient,
		copilot:       cpt,
		workflow:      stdflow,
		aiInteraction: aiInteraction,
		aigc:          aigcClient,
		svggen:        svggenManager,
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

// UploadFileResult represents the result of a file upload to Kodo.
type UploadFileResult struct {
	Key      string `json:"key"`      // File key in the bucket
	Hash     string `json:"hash"`     // File hash
	Size     int64  `json:"size"`     // File size in bytes
	KodoURL  string `json:"kodo_url"` // Internal kodo:// URL
}

// UploadFile uploads file content to Kodo storage.
func (k *kodoClient) UploadFile(ctx context.Context, data []byte, filename string) (*UploadFileResult, error) {
	// Generate file key with prefix
	hash := fmt.Sprintf("%x", md5.Sum(data))
	key := fmt.Sprintf("ai-generated/%s-%s", hash[:8], filename)
	
	// Create upload policy
	putPolicy := qiniuStorage.PutPolicy{
		Scope: k.bucket,
	}
	
	// Generate upload token
	upToken := putPolicy.UploadToken(k.cred)
	
	// Configure upload settings
	cfg := qiniuStorage.Config{}
	// Use specified region if available
	if k.bucketRegion != "" {
		// Map region names to Qiniu regions (this might need adjustment based on actual region names)
		switch k.bucketRegion {
		case "z0", "cn-east-1":
			cfg.Zone = &qiniuStorage.ZoneHuadong
		case "z1", "cn-north-1":
			cfg.Zone = &qiniuStorage.ZoneHuabei
		case "z2", "cn-south-1":
			cfg.Zone = &qiniuStorage.ZoneHuanan
		case "na0", "us-north-1":
			cfg.Zone = &qiniuStorage.ZoneBeimei
		case "as0", "ap-southeast-1":
			cfg.Zone = &qiniuStorage.ZoneXinjiapo
		}
	}
	cfg.UseHTTPS = true
	cfg.UseCdnDomains = false
	
	// Create form uploader
	formUploader := qiniuStorage.NewFormUploader(&cfg)
	
	// Upload file
	ret := qiniuStorage.PutRet{}
	err := formUploader.Put(ctx, &ret, upToken, key, bytes.NewReader(data), int64(len(data)), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to Kodo: %w", err)
	}
	
	// Generate kodo:// URL
	kodoURL := fmt.Sprintf("kodo://%s/%s", k.bucket, ret.Key)
	
	return &UploadFileResult{
		Key:     ret.Key,
		Hash:    ret.Hash,
		Size:    int64(len(data)),
		KodoURL: kodoURL,
	}, nil
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

// Instant Search Types

// ProjectKeywordGenerationParams represents parameters for generating project keywords
type ProjectKeywordGenerationParams struct {
	ProjectName string          `json:"project_name" binding:"required"`
	Description string          `json:"description"`
	Theme       types.ThemeType `json:"theme"`
	MaxKeywords int             `json:"max_keywords,omitempty"`
}

// Validate validates the project keyword generation parameters
func (p *ProjectKeywordGenerationParams) Validate() (bool, string) {
	if p.ProjectName == "" {
		return false, "project name is required"
	}
	
	if len(p.ProjectName) > 100 {
		return false, "project name too long (max 100 characters)"
	}
	
	if len(p.Description) > 500 {
		return false, "description too long (max 500 characters)"
	}
	
	if p.MaxKeywords < 0 || p.MaxKeywords > 50 {
		return false, "max keywords must be between 0 and 50"
	}
	
	if !types.IsValidTheme(p.Theme) {
		return false, "invalid theme type"
	}
	
	return true, ""
}

// InstantSearchParams represents parameters for instant search
type InstantSearchParams struct {
	ProjectID    int64           `json:"project_id" binding:"required"`
	Query        string          `json:"query" binding:"required"`
	Theme        types.ThemeType `json:"theme,omitempty"`
	TopK         int             `json:"top_k,omitempty"`
	EnableExpand bool            `json:"enable_expand,omitempty"`
}

// Validate validates the instant search parameters
func (p *InstantSearchParams) Validate() (bool, string) {
	if p.ProjectID <= 0 {
		return false, "invalid project ID"
	}
	
	if p.Query == "" {
		return false, "query is required"
	}
	
	if len(p.Query) > 200 {
		return false, "query too long (max 200 characters)"
	}
	
	// Set default values
	if p.TopK <= 0 {
		p.TopK = 10
	}
	
	if p.TopK > 50 {
		return false, "top_k must be between 1 and 50"
	}
	
	// Validate theme
	if !types.IsValidTheme(p.Theme) {
		return false, "invalid theme type"
	}
	
	return true, ""
}

// SearchSuggestion represents a single search suggestion
type SearchSuggestion struct {
	ImageURL    string   `json:"image_url"`
	MatchType   string   `json:"match_type"`    // "direct" or "expanded"
	Confidence  float64  `json:"confidence"`
	Keywords    []string `json:"keywords"`
	Description string   `json:"description"`
}

// InstantSearchResponse represents the response of instant search
type InstantSearchResponse struct {
	Query           string             `json:"query"`
	ProjectID       int64              `json:"project_id"`
	Suggestions     []SearchSuggestion `json:"suggestions"`
	TotalCount      int                `json:"total_count"`
	SearchStrategy  string             `json:"search_strategy"`
	ResponseTimeMs  int64              `json:"response_time_ms"`
	ExpandedQuery   string             `json:"expanded_query,omitempty"`
}

// Instant Search Methods

// GenerateProjectKeywords generates keywords for a project
func (c *Controller) GenerateProjectKeywords(ctx context.Context, projectID int64, params ProjectKeywordGenerationParams) (*keywordservice.GeneratedKeywordsResult, error) {
	keywordService := keywordservice.NewKeywordGeneratorService(c.db)
	
	// Convert params to service params
	serviceParams := keywordservice.KeywordGenerationParams{
		ProjectName: params.ProjectName,
		Description: params.Description,
		Theme:       params.Theme,
		MaxKeywords: params.MaxKeywords,
	}
	
	return keywordService.GenerateKeywords(ctx, projectID, &serviceParams)
}

// GetProjectKeywords retrieves keywords for a project
func (c *Controller) GetProjectKeywords(ctx context.Context, projectID int64) (*keywordservice.ProjectKeywordsDTO, error) {
	keywordService := keywordservice.NewKeywordGeneratorService(c.db)
	
	projectKeywords, err := keywordService.GetProjectKeywords(ctx, projectID)
	if err != nil {
		return nil, err
	}
	
	// Convert to DTO
	return &keywordservice.ProjectKeywordsDTO{
		ProjectID:        projectKeywords.ProjectID,
		Keywords:         projectKeywords.Keywords,
		Theme:            string(projectKeywords.Theme),
		Status:           string(projectKeywords.Status),
		GeneratedAt:      projectKeywords.GeneratedAt,
		GenerationPrompt: projectKeywords.GenerationPrompt,
	}, nil
}

// InstantSearchImages performs instant image search with project keyword expansion
func (c *Controller) InstantSearchImages(ctx context.Context, params InstantSearchParams) (*InstantSearchResponse, error) {
	// Get project keywords for expansion
	keywordService := keywordservice.NewKeywordGeneratorService(c.db)
	projectKeywords, err := keywordService.GetProjectKeywords(ctx, params.ProjectID)
	if err != nil {
		// If no keywords found, perform direct search only
		return c.performDirectSearch(ctx, params)
	}

	// Perform both direct and expanded searches concurrently
	resultChan := make(chan *InstantSearchResponse, 2)
	errorChan := make(chan error, 2)

	// Direct search
	go func() {
		result, err := c.performDirectSearch(ctx, params)
		if err != nil {
			errorChan <- err
			return
		}
		resultChan <- result
	}()

	// Expanded search if enabled
	if params.EnableExpand && len(projectKeywords.Keywords) > 0 {
		go func() {
			expandedResult, err := c.performExpandedSearch(ctx, params, []string(projectKeywords.Keywords))
			if err != nil {
				errorChan <- err
				return
			}
			resultChan <- expandedResult
		}()
	}

	// Collect results
	var finalResult *InstantSearchResponse
	resultsCount := 1
	if params.EnableExpand && len(projectKeywords.Keywords) > 0 {
		resultsCount = 2
	}

	for i := 0; i < resultsCount; i++ {
		select {
		case result := <-resultChan:
			if finalResult == nil {
				finalResult = result
			} else {
				// Merge results, avoiding duplicates
				finalResult = c.mergeSearchResults(finalResult, result, params.TopK)
			}
		case err := <-errorChan:
			return nil, err
		}
	}

	return finalResult, nil
}

// performDirectSearch performs search using the original query
func (c *Controller) performDirectSearch(ctx context.Context, params InstantSearchParams) (*InstantSearchResponse, error) {
	startTime := time.Now()
	// Create image recommend params
	imageParams := ImageRecommendParams{
		Theme: params.Theme,
		Text:  params.Query,
		TopK:  params.TopK,
	}
	
	// Use existing RecommendImages method
	recommendations, err := c.RecommendImages(ctx, &imageParams)
	if err != nil {
		return nil, err
	}

	suggestions := make([]SearchSuggestion, len(recommendations.Results))
	for i, rec := range recommendations.Results {
		suggestions[i] = SearchSuggestion{
			ImageURL:    rec.ImagePath,
			MatchType:   "direct",
			Confidence:  rec.Similarity,
			Keywords:    []string{params.Query},
			Description: fmt.Sprintf("Rank %d image", rec.Rank),
		}
	}

	return &InstantSearchResponse{
		Query:          params.Query,
		ProjectID:      params.ProjectID,
		Suggestions:    suggestions,
		TotalCount:     len(suggestions),
		SearchStrategy: "direct",
		ResponseTimeMs: time.Since(startTime).Milliseconds(),
	}, nil
}

// performExpandedSearch performs search using project keywords + query
func (c *Controller) performExpandedSearch(ctx context.Context, params InstantSearchParams, projectKeywords []string) (*InstantSearchResponse, error) {
	startTime := time.Now()
	// Select top relevant keywords (limit to 3-5 to avoid overwhelming)
	selectedKeywords := projectKeywords
	if len(selectedKeywords) > 5 {
		selectedKeywords = selectedKeywords[:5]
	}

	// Combine query with project keywords
	expandedQuery := params.Query + " " + strings.Join(selectedKeywords, " ")

	// Create image recommend params
	imageParams := ImageRecommendParams{
		Theme: params.Theme,
		Text:  expandedQuery,
		TopK:  params.TopK,
	}
	
	recommendations, err := c.RecommendImages(ctx, &imageParams)
	if err != nil {
		return nil, err
	}

	suggestions := make([]SearchSuggestion, len(recommendations.Results))
	for i, rec := range recommendations.Results {
		suggestions[i] = SearchSuggestion{
			ImageURL:    rec.ImagePath,
			MatchType:   "expanded",
			Confidence:  rec.Similarity * 0.8, // Slightly reduce confidence for expanded results
			Keywords:    append([]string{params.Query}, selectedKeywords...),
			Description: fmt.Sprintf("Rank %d image (expanded)", rec.Rank),
		}
	}

	return &InstantSearchResponse{
		Query:          params.Query,
		ProjectID:      params.ProjectID,
		Suggestions:    suggestions,
		TotalCount:     len(suggestions),
		SearchStrategy: "expanded",
		ResponseTimeMs: time.Since(startTime).Milliseconds(),
		ExpandedQuery:  expandedQuery,
	}, nil
}

// mergeSearchResults merges two search results, removing duplicates and limiting to topK
func (c *Controller) mergeSearchResults(result1, result2 *InstantSearchResponse, topK int) *InstantSearchResponse {
	seenURLs := make(map[string]bool)
	var mergedSuggestions []SearchSuggestion

	// Add results from first search
	for _, suggestion := range result1.Suggestions {
		if !seenURLs[suggestion.ImageURL] {
			mergedSuggestions = append(mergedSuggestions, suggestion)
			seenURLs[suggestion.ImageURL] = true
		}
	}

	// Add unique results from second search
	for _, suggestion := range result2.Suggestions {
		if !seenURLs[suggestion.ImageURL] && len(mergedSuggestions) < topK {
			mergedSuggestions = append(mergedSuggestions, suggestion)
			seenURLs[suggestion.ImageURL] = true
		}
	}

	return &InstantSearchResponse{
		Query:          result1.Query,
		ProjectID:      result1.ProjectID,
		Suggestions:    mergedSuggestions,
		TotalCount:     len(mergedSuggestions),
		SearchStrategy: "combined",
		ResponseTimeMs: (result1.ResponseTimeMs + result2.ResponseTimeMs) / 2,
	}
}
