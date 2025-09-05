# 即时搜索功能设计文档

## 功能概述

基于用户项目名称和输入提示词的即时图片搜索功能，支持智能关键词扩展和多层级搜索策略。

## 核心需求

1. **项目名称关联搜索**: 根据用户的项目名称(如"太空探险游戏")，使用LLM生成相关关键词库
2. **即时搜索**: 用户输入部分提示词时实时返回搜索建议
3. **多策略搜索**: 直接匹配 + 扩展搜索相结合
4. **主题风格支持**: 继承现有主题系统(卡通、写实、极简等)

## 系统架构

### 现有系统分析

当前系统已具备以下功能模块:

1. **图片推荐系统** (`image_recommend.go`)
   - 支持语义搜索和AI生成图片
   - 调用spx-algorithm服务进行向量搜索
   - 支持主题风格增强

2. **主题系统** (`theme.go`) 
   - 9种预定义主题风格
   - 主题Prompt增强功能
   - 主题推荐provider选择

3. **项目管理系统** (`project.go`)
   - 项目基本信息管理
   - 支持名称、描述等字段

### 新增功能设计

#### 1. 项目关键词管理

```go
// ProjectKeywords 项目关键词表
type ProjectKeywords struct {
    ID          int64     `json:"id" gorm:"primaryKey"`
    ProjectID   int64     `json:"project_id" gorm:"index"`
    Keywords    []string  `json:"keywords" gorm:"type:json"`
    GeneratedAt time.Time `json:"generated_at"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

#### 2. 关键词生成服务

```go
// KeywordGenerationParams LLM关键词生成参数
type KeywordGenerationParams struct {
    ProjectName string `json:"project_name"`
    Description string `json:"description,omitempty"`
    Theme       ThemeType `json:"theme,omitempty"`
}

// GeneratedKeywords LLM生成的关键词响应
type GeneratedKeywords struct {
    ProjectID int64    `json:"project_id"`
    Keywords  []string `json:"keywords"`
    Theme     ThemeType `json:"theme"`
}
```

#### 3. 即时搜索API

```go
// InstantSearchParams 即时搜索参数
type InstantSearchParams struct {
    ProjectID    int64     `json:"project_id"`
    Query        string    `json:"query"`
    Theme        ThemeType `json:"theme,omitempty"`
    TopK         int       `json:"top_k,omitempty"`
    EnableExpand bool      `json:"enable_expand,omitempty"`
}

// InstantSearchResult 即时搜索结果
type InstantSearchResult struct {
    Query           string                   `json:"query"`
    ExpandedQueries []string                 `json:"expanded_queries"`
    DirectResults   []RecommendedImageResult `json:"direct_results"`
    ExpandedResults []RecommendedImageResult `json:"expanded_results"`
    TotalCount      int                      `json:"total_count"`
}
```

## 实现流程

### 1. 项目创建时关键词生成

```
用户输入项目信息 → LLM分析生成关键词 → 存储到ProjectKeywords表
                ↓
项目名称："太空探险游戏"
描述："玩家驾驶飞船探索外星球"
                ↓
生成关键词：[宇宙飞船, 外星人, 星球, 陨石, 太空站, 宇航员, 星空, 火箭, 激光, 机器人, 太空服, 银河系]
```

### 2. 即时搜索执行

```
用户输入 → 直接搜索 + 扩展搜索 → 结果合并排序 → 返回
    ↓           ↓           ↓           ↓
"宇宙"    直接:"宇宙"    项目关键词    去重+相似度
         相关图片      +"宇宙"搜索    排序
```

### 3. 搜索策略详细设计

#### 直接搜索
- 使用用户输入的prompt直接调用现有的RecommendImages API
- 利用spx-algorithm服务进行语义向量搜索

#### 扩展搜索  
- 从ProjectKeywords表获取项目关键词
- 将用户query与每个关键词组合生成新的搜索词
- 对每个组合调用搜索API获取结果
- 按相似度排序合并结果

### 4. 新增API端点

```
POST /api/projects/{id}/keywords/generate
- 为指定项目生成关键词

GET /api/projects/{id}/keywords
- 获取项目关键词

POST /api/projects/{id}/search/instant
- 项目关联即时搜索

PUT /api/projects/{id}/keywords
- 更新项目关键词(支持手动编辑)
```

## 数据库变更

### 新增表结构

```sql
CREATE TABLE project_keywords (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    keywords JSON NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);
```

## 性能优化考虑

1. **缓存策略**: 
   - 关键词生成结果缓存(Redis)
   - 搜索结果缓存(按query+project_id缓存)

2. **异步处理**:
   - 关键词生成异步执行
   - 扩展搜索并发执行

3. **搜索优化**:
   - 限制扩展搜索的关键词数量(最多10个)
   - 设置相似度阈值过滤低质量结果

## 集成点

### 与现有系统集成

1. **主题系统集成**
   - 关键词生成时考虑主题风格
   - 搜索时应用主题prompt增强

2. **图片推荐系统扩展**
   - 复用现有的RecommendImages逻辑
   - 扩展支持批量关键词搜索

3. **项目管理集成**
   - 项目创建/更新时自动触发关键词生成
   - 项目删除时清理关联关键词
