# 图片推荐API接口文档

## 概述

本文档描述了智能图片推荐功能API接口实现。该功能提供基于文本语义的图片推荐服务，通过混合推荐策略确保始终返回用户需要的完整结果：
1. **优先推荐**：基于 spx-algorithm 服务的语义搜索，从现有图片库中查找高质量匹配
2. **智能补全**：当搜索结果不足时，自动生成 AI SVG 图片补足到指定数量

## 架构设计

```
用户请求 → spx-backend → 语义搜索 → 数据库查找KodoURL → AI生成补足 → 返回统一KodoURL结果
          ↓
       1. 调用spx-algorithm服务(阈值过滤)
       2. 匹配数据库中的AIResource记录  
       3. 不足时调用AI生成SVG并上传Kodo
       4. 返回TopK个KodoURL结果
```

### 核心流程
1. 接收用户的文本prompt和TopK参数
2. 调用spx-algorithm服务进行语义相似度搜索（请求2倍数量以提高过滤效果）
3. 在数据库中查找匹配的AIResource记录，获取KodoURL
4. 如果找到的图片数量不足TopK：
   - 计算缺少的数量
   - 使用相同的prompt生成AI SVG图片
   - 自动上传到Kodo存储并保存到数据库
5. 统一返回TopK个KodoURL结果

## API接口

### POST /images/recommend

**功能**: 根据文本prompt推荐相似图片（混合推荐策略）

**请求参数**:
```json
{
  "text": "cute cat playing with ball",
  "top_k": 8
}
```

**参数说明**:
- `text` (string, 必需): 查询文本，最少1个字符
- `top_k` (int, 可选): 返回结果数量，默认3，范围1-50

**响应格式**:
```json
{
  "query": "cute cat playing with ball",
  "results_count": 8,
  "results": [
    {
      "id": 123,
      "image_path": "https://kodo.qiniu.com/bucket/cat-123.svg",
      "similarity": 0.89,
      "rank": 1,
      "source": "search"
    },
    {
      "id": 456,
      "image_path": "https://kodo.qiniu.com/bucket/cat-456.svg", 
      "similarity": 0.83,
      "rank": 2,
      "source": "search"
    },
    {
      "id": 789,
      "image_path": "https://kodo.qiniu.com/bucket/generated-789.svg",
      "similarity": 0.80,
      "rank": 3,
      "source": "generated"
    }
  ]
}
```

**响应字段说明**:
- `query`: 原始查询文本
- `results_count`: 实际返回的结果数量（始终等于请求的top_k）
- `results`: 推荐结果数组
  - `id`: 资源在数据库中的ID
  - `image_path`: Kodo存储的图片访问URL（统一格式）
  - `similarity`: 相似度分数 (0-1)，搜索结果为真实相似度，生成结果为递减分配
  - `rank`: 排名位置 (1-based)
  - `source`: 结果来源，`"search"`表示搜索找到，`"generated"`表示AI生成

**错误响应**:
```json
{
  "error": "text is required",
  "code": "INVALID_ARGS"
}
```

```json
{
  "error": "top_k must be between 1 and 50",
  "code": "INVALID_ARGS"  
}
```

## 数据流详解

### 1. 语义搜索阶段
- 调用spx-algorithm服务的`/api/search/resource`接口
- 请求数量为`top_k * 2`以获得更好的过滤结果
- 使用固定阈值0.27过滤低质量匹配

**Algorithm Service请求**:
```json
{
  "text": "cute cat playing with ball",
  "top_k": 16,
  "threshold": 0.27
}
```

**Algorithm Service响应**:
```json
{
  "query": "cute cat playing with ball",
  "results_count": 5,
  "results": [
    {
      "image_path": "https://kodo.qiniu.com/bucket/cat-123.svg",
      "similarity": 0.89,
      "rank": 1
    }
  ]
}
```

### 2. 数据库匹配阶段
```sql
SELECT id, url 
FROM aiResource 
WHERE url = ? AND deleted_at IS NULL
```

- 根据algorithm service返回的`image_path`在数据库中查找对应的AIResource记录
- 获取资源ID和KodoURL
- 按找到的顺序构建搜索结果

### 3. AI生成补足阶段（按需触发）
当搜索结果数量 < top_k时：
- 计算需要生成的数量：`needed = top_k - found_count`
- 使用相同的用户查询文本调用SVG生成接口
- 每个生成的SVG自动：
  - 上传到Kodo存储
  - 保存AIResource记录到数据库
  - 分配递减的相似度分数（0.8, 0.75, 0.7...）

## 数据库设计

### 核心表结构

#### aiResource (AI资源表)
```sql
CREATE TABLE aiResource (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(255) NOT NULL,  -- KodoURL
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL INDEX
);
```

#### resource_usage_stats (资源使用统计表)
```sql
CREATE TABLE resource_usage_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_resource_id BIGINT NOT NULL UNIQUE,
    view_count BIGINT DEFAULT 0,
    selection_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (ai_resource_id) REFERENCES aiResource(id)
);
```

## 依赖服务

### spx-algorithm 服务

**服务地址**: `http://100.100.35.128:5000` (当前配置)

**调用接口**: `POST /api/search/resource`

**请求格式**:
```json
{
  "text": "cute cat",
  "top_k": 16,
  "threshold": 0.27
}
```

**响应格式**:
```json
{
  "query": "cute cat",
  "results_count": 8,
  "results": [
    {
      "image_path": "https://kodo.qiniu.com/bucket/image1.svg",
      "similarity": 0.89,
      "rank": 1
    }
  ]
}
```

### SVG生成服务

推荐服务内部调用SVG生成功能：
- 使用默认的`svgio`提供商
- 自动处理Kodo上传和数据库存储
- 返回完整的KodoURL用于推荐结果

### Kodo存储服务

所有图片资源统一存储在Kodo云存储：
- 搜索匹配的现有图片：已有KodoURL
- AI生成的新图片：自动上传获得KodoURL  
- 前端统一使用KodoURL访问图片

## 配置说明

### 算法服务配置
```go
func (ctrl *Controller) getAlgorithmServiceURL() string {
    // TODO: 从配置文件读取
    return "http://100.100.35.128:5000"
}
```

### 阈值配置
```go
reqData := AlgorithmSearchRequest{
    Text: text,
    TopK: topK,
    Threshold: 0.27,  // 相似度阈值
}
```

## 使用示例

### cURL 示例
```bash
curl -X POST http://localhost:8080/images/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "text": "cute cat playing",
    "top_k": 5
  }'
```

### JavaScript 示例
```javascript
async function recommendImages(text, topK = 8) {
  const response = await fetch('/images/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      top_k: topK
    })
  });
  
  const result = await response.json();
  
  // 处理混合结果
  const searchResults = result.results.filter(r => r.source === 'search');
  const generatedResults = result.results.filter(r => r.source === 'generated');
  
  console.log(`找到 ${searchResults.length} 个匹配图片`);
  console.log(`生成 ${generatedResults.length} 个AI图片`);
  
  return result;
}

// 使用示例
recommendImages('cute cat', 10).then(result => {
  result.results.forEach(item => {
    console.log(`Rank ${item.rank}: ${item.image_path} (${item.source})`);
  });
});
```

### Go 客户端示例
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type RecommendRequest struct {
    Text string `json:"text"`
    TopK int    `json:"top_k,omitempty"`
}

type RecommendResponse struct {
    Query        string                     `json:"query"`
    ResultsCount int                        `json:"results_count"`
    Results      []RecommendedImageResult   `json:"results"`
}

type RecommendedImageResult struct {
    ID         int64   `json:"id"`
    ImagePath  string  `json:"image_path"`
    Similarity float64 `json:"similarity"`
    Rank       int     `json:"rank"`
    Source     string  `json:"source"`
}

func recommendImages(text string, topK int) (*RecommendResponse, error) {
    req := RecommendRequest{
        Text: text,
        TopK: topK,
    }
    
    reqBody, _ := json.Marshal(req)
    resp, err := http.Post(
        "http://localhost:8080/images/recommend",
        "application/json",
        bytes.NewBuffer(reqBody),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result RecommendResponse
    err = json.NewDecoder(resp.Body).Decode(&result)
    if err != nil {
        return nil, err
    }
    
    // 分析结果组成
    var searchCount, generatedCount int
    for _, item := range result.Results {
        if item.Source == "search" {
            searchCount++
        } else if item.Source == "generated" {
            generatedCount++
        }
    }
    
    fmt.Printf("推荐完成: %d个搜索结果 + %d个生成结果 = %d个总结果\n", 
               searchCount, generatedCount, result.ResultsCount)
    
    return &result, nil
}
```

## 性能优化

### 数据库优化
1. **URL索引**: `CREATE INDEX idx_airesource_url ON aiResource(url);`
2. **软删除索引**: 已有`deleted_at`索引用于过滤软删除记录

### 算法服务优化
1. **批量请求**: 请求2倍数量减少多次调用
2. **阈值过滤**: 使用0.27阈值过滤低质量结果
3. **超时控制**: 30秒超时避免长时间等待

### 生成服务优化
1. **并发生成**: 使用协程并发生成多个AI图片，显著提升响应速度
2. **失败跳过**: 单个生成失败不影响整体结果，通过channel收集成功结果
3. **相似度递减**: 为生成图片分配合理的相似度分数
4. **上下文控制**: 支持请求取消和超时控制

## 错误处理与降级

### 服务降级策略
1. **算法服务不可用**: 仅返回AI生成的结果填满TopK
2. **数据库查询失败**: 跳过数据库匹配，直接生成AI结果
3. **部分生成失败**: 返回已成功的结果，数量可能少于TopK
4. **Kodo上传失败**: 记录错误但不中断流程

### 常见错误码
- `INVALID_ARGS`: 参数验证失败
- `INTERNAL_ERROR`: 内部服务器错误  
- `SERVICE_UNAVAILABLE`: 依赖服务不可用
- `GENERATION_FAILED`: AI生成失败

## 监控与日志

### 关键日志点
```go
logger.Printf("RecommendImages request - text: %q, top_k: %d", text, topK)
logger.Printf("Found %d matching images in database", foundCount)
logger.Printf("Need to generate %d AI SVG images", needed)
logger.Printf("Recommendation completed - total %d results (%d from search, %d generated)", 
              totalCount, searchCount, generatedCount)
```

### 监控指标
- 搜索命中率：找到的图片数量 / 请求的TopK数量
- 生成补足率：生成的图片数量 / 总结果数量  
- 响应时间分布：搜索阶段 vs 生成阶段耗时
- 错误率：各个依赖服务的失败率

## 后续扩展

### 功能扩展
1. **智能缓存**: 缓存热门查询的搜索结果
2. **个性化**: 基于用户历史偏好调整推荐权重
3. **多样性**: 在保证相似度的基础上增加结果多样性
4. **批量接口**: 支持一次推荐多个查询文本

### 技术扩展  
1. **算法服务集群**: 支持多个算法服务实例负载均衡
2. **异步生成**: 将AI生成过程异步化，提高响应速度
3. **结果评分**: 引入用户反馈优化推荐算法
4. **A/B测试**: 支持不同推荐策略的效果对比

## 版本历史

### v2.0 (当前版本) - 混合推荐策略
- 新增AI生成补足机制
- 统一返回KodoURL格式  
- 智能相似度分配
- 来源标识区分

### v1.0 - 纯搜索推荐
- 基于spx-algorithm的语义搜索
- 数据库资源匹配
- 基础推荐功能

---

## 联系信息

如有问题，请联系开发团队或查看相关技术文档。