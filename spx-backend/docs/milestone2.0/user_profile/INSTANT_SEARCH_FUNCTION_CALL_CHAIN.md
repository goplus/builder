# 即时搜索功能 - 函数调用链分析

## 架构概览

即时搜索功能采用分层架构设计，包含以下层次：
- **API层：** .yap文件定义的HTTP接口
- **控制器层：** Controller处理业务逻辑
- **服务层：** KeywordService处理关键词相关业务
- **模型层：** 数据模型和数据库操作
- **外部服务：** LLM服务、图片搜索算法服务

## 详细调用链

### 1. 生成项目关键词调用链

#### HTTP请求流程：
```
POST /project/{projectId}/keywords/generate
    ↓
post_project_#projectId_keywords_generate.yap
    ↓
Controller.GenerateProjectKeywords()
    ↓
KeywordGeneratorService.GenerateKeywords()
    ↓
[并行执行]
├── 数据库操作：保存关键词记录
└── LLM服务调用：生成关键词
```

#### 详细函数调用：

**1.1 API层处理**
```go
// 文件: cmd/spx-backend/post_project_#projectId_keywords_generate.yap
func HandleGenerateKeywords() {
    projectId := parsePathParam("projectId", parseInt64)
    params := &controller.ProjectKeywordGenerationParams{}
    parseJSON(ctx, params)
    params.Validate() // 参数验证
    
    result := ctrl.GenerateProjectKeywords(ctx.Context(), projectId, params)
    json(result)
}
```

**1.2 控制器层处理**
```go
// 文件: internal/controller/controller.go
func (c *Controller) GenerateProjectKeywords(
    ctx context.Context, 
    projectID int64, 
    params ProjectKeywordGenerationParams
) (*keywordservice.GeneratedKeywordsResult, error) {
    
    // 创建关键词服务实例
    keywordService := keywordservice.NewKeywordGeneratorService(c.db)
    
    // 转换参数格式
    serviceParams := keywordservice.KeywordGenerationParams{
        ProjectName: params.ProjectName,
        Description: params.Description,
        Theme:       params.Theme,
        MaxKeywords: params.MaxKeywords,
    }
    
    // 调用服务层生成关键词
    return keywordService.GenerateKeywords(ctx, projectID, &serviceParams)
}
```

**1.3 服务层处理**
```go
// 文件: internal/keywordservice/keyword_generator.go
func (s *KeywordGeneratorService) GenerateKeywords(
    ctx context.Context,
    projectID int64,
    params *KeywordGenerationParams
) (*GeneratedKeywordsResult, error) {
    
    // 1. 参数验证
    params.Validate()
    
    // 2. 创建数据库记录（状态：generating）
    pkRecord := &model.ProjectKeywords{
        ProjectID: projectID,
        Theme:     types.ThemeType(params.Theme),
        Status:    model.StatusGenerating,
    }
    s.db.Create(pkRecord)
    
    // 3. 生成LLM提示词
    prompt := s.buildPrompt(params)
    
    // 4. 调用LLM生成关键词（模拟，实际需要接入LLM服务）
    keywords := s.generateKeywordsFromLLM(prompt)
    
    // 5. 应用主题特定关键词
    if params.Theme != types.ThemeNone {
        keywords = s.applyThemeToKeywords(keywords, params.Theme)
    }
    
    // 6. 更新数据库记录（状态：completed）
    pkRecord.Keywords = model.StringSlice(keywords)
    pkRecord.Status = model.StatusCompleted
    pkRecord.GenerationPrompt = prompt
    pkRecord.GeneratedAt = time.Now()
    s.db.Save(pkRecord)
    
    // 7. 返回结果
    return &GeneratedKeywordsResult{
        ProjectID: projectID,
        Keywords:  keywords,
        Theme:     params.Theme,
        Prompt:    prompt,
    }
}
```

### 2. 即时搜索调用链

#### HTTP请求流程：
```
POST /search/instant
    ↓
post_search_instant.yap
    ↓
Controller.InstantSearchImages()
    ↓
[并行执行搜索策略]
├── Controller.performDirectSearch()
│   └── Controller.RecommendImages() [直接搜索]
└── Controller.performExpandedSearch()
    ├── KeywordGeneratorService.GetProjectKeywords() [获取关键词]
    └── Controller.RecommendImages() [扩展搜索]
    ↓
Controller.mergeSearchResults() [结果合并]
```

#### 详细函数调用：

**2.1 API层处理**
```go
// 文件: cmd/spx-backend/post_search_instant.yap
func HandleInstantSearch() {
    params := &controller.InstantSearchParams{}
    parseJSON(ctx, params)
    params.Validate() // 参数验证
    
    result := ctrl.InstantSearchImages(ctx.Context(), params)
    json(result)
}
```

**2.2 控制器层主流程**
```go
// 文件: internal/controller/controller.go
func (c *Controller) InstantSearchImages(
    ctx context.Context, 
    params InstantSearchParams
) (*InstantSearchResponse, error) {
    
    // 1. 获取项目关键词
    keywordService := keywordservice.NewKeywordGeneratorService(c.db)
    projectKeywords, err := keywordService.GetProjectKeywords(ctx, params.ProjectID)
    if err != nil {
        // 如果没有关键词，只执行直接搜索
        return c.performDirectSearch(ctx, params)
    }

    // 2. 创建并发搜索通道
    resultChan := make(chan *InstantSearchResponse, 2)
    errorChan := make(chan error, 2)

    // 3. 并发执行直接搜索
    go func() {
        result, err := c.performDirectSearch(ctx, params)
        if err != nil {
            errorChan <- err
            return
        }
        resultChan <- result
    }()

    // 4. 并发执行扩展搜索（如果启用）
    if params.EnableExpand && len(projectKeywords.Keywords) > 0 {
        go func() {
            expandedResult, err := c.performExpandedSearch(
                ctx, params, []string(projectKeywords.Keywords)
            )
            if err != nil {
                errorChan <- err
                return
            }
            resultChan <- expandedResult
        }()
    }

    // 5. 收集并合并结果
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
                // 合并结果，去重
                finalResult = c.mergeSearchResults(finalResult, result, params.TopK)
            }
        case err := <-errorChan:
            return nil, err
        }
    }

    return finalResult, nil
}
```

**2.3 直接搜索流程**
```go
func (c *Controller) performDirectSearch(
    ctx context.Context, 
    params InstantSearchParams
) (*InstantSearchResponse, error) {
    
    startTime := time.Now()
    
    // 1. 构建图片推荐参数
    imageParams := ImageRecommendParams{
        Theme: params.Theme,
        Text:  params.Query,
        TopK:  params.TopK,
    }
    
    // 2. 调用现有的图片推荐服务
    recommendations, err := c.RecommendImages(ctx, &imageParams)
    if err != nil {
        return nil, err
    }

    // 3. 转换结果格式
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

    // 4. 构建响应
    return &InstantSearchResponse{
        Query:          params.Query,
        ProjectID:      params.ProjectID,
        Suggestions:    suggestions,
        TotalCount:     len(suggestions),
        SearchStrategy: "direct",
        ResponseTimeMs: time.Since(startTime).Milliseconds(),
    }, nil
}
```

**2.4 扩展搜索流程**
```go
func (c *Controller) performExpandedSearch(
    ctx context.Context, 
    params InstantSearchParams, 
    projectKeywords []string
) (*InstantSearchResponse, error) {
    
    startTime := time.Now()
    
    // 1. 选择前5个关键词（避免查询过长）
    selectedKeywords := projectKeywords
    if len(selectedKeywords) > 5 {
        selectedKeywords = selectedKeywords[:5]
    }

    // 2. 组合查询词
    expandedQuery := params.Query + " " + strings.Join(selectedKeywords, " ")

    // 3. 构建图片推荐参数
    imageParams := ImageRecommendParams{
        Theme: params.Theme,
        Text:  expandedQuery,
        TopK:  params.TopK,
    }
    
    // 4. 调用图片推荐服务
    recommendations, err := c.RecommendImages(ctx, &imageParams)
    if err != nil {
        return nil, err
    }

    // 5. 转换结果格式（降低置信度）
    suggestions := make([]SearchSuggestion, len(recommendations.Results))
    for i, rec := range recommendations.Results {
        suggestions[i] = SearchSuggestion{
            ImageURL:    rec.ImagePath,
            MatchType:   "expanded",
            Confidence:  rec.Similarity * 0.8, // 扩展搜索结果置信度降低
            Keywords:    append([]string{params.Query}, selectedKeywords...),
            Description: fmt.Sprintf("Rank %d image (expanded)", rec.Rank),
        }
    }

    // 6. 构建响应
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
```

### 3. 获取项目关键词调用链

#### HTTP请求流程：
```
GET /project/{projectId}/keywords
    ↓
get_project_#projectId_keywords.yap
    ↓
Controller.GetProjectKeywords()
    ↓
KeywordGeneratorService.GetProjectKeywords()
    ↓
数据库查询：project_keywords表
```

#### 详细函数调用：

**3.1 服务层数据查询**
```go
// 文件: internal/keywordservice/keyword_generator.go
func (s *KeywordGeneratorService) GetProjectKeywords(
    ctx context.Context, 
    projectID int64
) (*model.ProjectKeywords, error) {
    
    var projectKeywords model.ProjectKeywords
    
    // 查询数据库
    err := s.db.Where("project_id = ? AND status = ?", 
        projectID, model.StatusCompleted).
        First(&projectKeywords).Error
    
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("project keywords not found for project %d", projectID)
        }
        return nil, fmt.Errorf("failed to get project keywords: %w", err)
    }
    
    return &projectKeywords, nil
}
```

## 数据流图

```
[用户请求] 
    ↓
[HTTP API层] → [参数验证] → [认证授权]
    ↓
[Controller层] → [业务逻辑处理] → [并发控制]
    ↓
[Service层] → [关键词生成] → [数据处理]
    ↓
[Model层] → [数据库操作] → [数据持久化]
    ↓
[外部服务] → [LLM调用] → [算法服务]
    ↓
[响应构建] → [结果转换] → [JSON序列化]
    ↓
[HTTP响应]
```

## 关键设计决策

### 1. 并发搜索设计
- **目的：** 提升搜索响应速度
- **实现：** 使用Go协程并发执行直接搜索和扩展搜索
- **优势：** 响应时间约为单一搜索的一半

### 2. 结果合并策略
- **去重机制：** 基于图片URL去重
- **置信度调整：** 扩展搜索结果置信度乘以0.8
- **排序规则：** 按置信度降序排列

### 3. 错误处理策略
- **优雅降级：** 关键词不存在时回退到直接搜索
- **错误传播：** 使用channel传递错误信息
- **日志记录：** 记录详细的错误上下文

### 4. 性能优化点
- **数据库索引：** project_id, status, theme等字段建立索引
- **连接池：** HTTP客户端复用连接
- **内存管理：** 及时释放大对象引用

这个调用链设计确保了高性能、高可用性和良好的用户体验。