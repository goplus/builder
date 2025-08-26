# 图片推荐API接口文档

## 概述

本文档描述了基于spx-algorithm服务的图片推荐功能API接口实现。该功能提供基于文本语义的图片推荐服务，通过调用spx-algorithm的CLIP模型进行相似度计算。

## 架构设计

```
用户请求 → spx-backend → 数据库(获取图片) → spx-algorithm → CLIP模型计算 → 返回推荐结果
```

### 核心流程
1. 接收用户的文本prompt
2. 从数据库查询所有可用的AI资源图片
3. 调用spx-algorithm服务进行语义相似度搜索
4. 合并搜索结果和数据库元数据信息
5. 更新资源使用统计
6. 返回排序后的推荐结果

## API接口

### POST /images/recommend

**功能**: 根据文本prompt推荐相似图片

**请求参数**:
```json
{
  "text": "cute cat playing with ball",
  "top_k": 8
}
```

**参数说明**:
- `text` (string, 必需): 查询文本，最少1个字符
- `top_k` (int, 可选): 返回结果数量，默认8，范围1-50

**响应格式**:
```json
{
  "query": "cute cat playing with ball",
  "total_images": 25,
  "results_count": 8,
  "results": [
    {
      "id": 123,
      "url": "https://storage.example.com/images/cat-123.svg",
      "similarity": 0.89,
      "rank": 1,
      "labels": ["cat", "cute", "animal"],
      "view_count": 45,
      "selection_count": 12,
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": 456,
      "url": "https://storage.example.com/images/cat-456.svg", 
      "similarity": 0.83,
      "rank": 2,
      "labels": ["cat", "play", "ball"],
      "view_count": 23,
      "selection_count": 5,
      "created_at": "2024-01-01T09:00:00Z"
    }
  ]
}
```

**响应字段说明**:
- `query`: 原始查询文本
- `total_images`: 数据库中总图片数量
- `results_count`: 实际返回的结果数量
- `results`: 推荐结果数组
  - `id`: 资源ID
  - `url`: 图片访问URL
  - `similarity`: 相似度分数 (0-1)
  - `rank`: 排名位置
  - `labels`: 关联标签数组
  - `view_count`: 查看次数
  - `selection_count`: 选择次数
  - `created_at`: 创建时间

**错误响应**:
```json
{
  "error": "text is required",
  "code": "INVALID_ARGS"
}
```

## 数据库设计

### 核心表结构

#### aiResource (AI资源表)
```sql
CREATE TABLE aiResource (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL INDEX
);
```

#### label (标签表)
```sql
CREATE TABLE label (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    labelName VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL INDEX
);
```

#### resource_label (资源标签关联表)
```sql
CREATE TABLE resource_label (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    aiResourceId BIGINT NOT NULL INDEX,
    labelId BIGINT NOT NULL INDEX,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL INDEX,
    
    FOREIGN KEY (aiResourceId) REFERENCES aiResource(id),
    FOREIGN KEY (labelId) REFERENCES label(id)
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

**服务地址**: `http://localhost:5000` (默认)

**调用接口**: `POST /api/search/url`

**请求格式**:
```json
{
  "text": "cute cat",
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ],
  "top_k": 8
}
```

**响应格式**:
```json
{
  "query": "cute cat",
  "total_images": 10,
  "results_count": 8,
  "results": [
    {
      "image_path": "https://example.com/image1.jpg",
      "similarity": 0.89,
      "rank": 1
    }
  ]
}
```

## 配置说明

### 环境变量配置

在 `.env` 文件中配置算法服务地址：

```env
# Algorithm Service Configuration
ALGORITHM_SERVICE_ENDPOINT=http://localhost:5000
ALGORITHM_SERVICE_TIMEOUT=30s
```

### Go配置结构

```go
type AlgorithmConfig struct {
    Endpoint string
    Timeout  time.Duration
}
```

## 部署说明

### 前置条件

1. **数据库准备**: 确保MySQL数据库已创建相关表结构
2. **spx-algorithm服务**: 确保算法服务已启动并可访问
3. **图片资源**: 数据库中需要有AI资源数据

### 启动步骤

1. 配置环境变量
2. 启动spx-algorithm服务：
   ```bash
   cd spx-algorithm/project
   python run.py
   ```
3. 启动spx-backend服务：
   ```bash
   cd spx-backend
   xgo run ./cmd/spx-backend
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
  
  return await response.json();
}

// 使用示例
recommendImages('cute cat', 10).then(result => {
  console.log('推荐结果:', result.results);
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

func recommendImages(text string, topK int) error {
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
        return err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("推荐结果: %+v\n", result)
    return nil
}
```

## 性能优化建议

### 数据库优化

1. **索引优化**: 为常用查询字段添加索引
   ```sql
   CREATE INDEX idx_airesource_url ON aiResource(url);
   CREATE INDEX idx_usage_stats_resource ON resource_usage_stats(ai_resource_id);
   ```

2. **查询优化**: 使用JOIN减少N+1查询问题

### 缓存策略

1. **热点图片缓存**: 缓存高频查看的图片元数据
2. **查询结果缓存**: 对相同query的结果进行短期缓存

### 并发优化

1. **异步统计更新**: 视图统计更新使用异步处理
2. **连接池优化**: 合理配置数据库连接池大小

## 错误处理

### 常见错误码

- `INVALID_ARGS`: 参数验证失败
- `INTERNAL_ERROR`: 内部服务器错误
- `SERVICE_UNAVAILABLE`: 算法服务不可用

### 降级策略

1. **算法服务不可用**: 返回基于标签的简单推荐
2. **数据库查询失败**: 返回空结果集而不是错误
3. **部分资源获取失败**: 跳过失败资源，返回可用结果

## 监控指标

### 业务指标
- API请求成功率
- 平均响应时间
- 推荐结果点击率
- 算法服务调用成功率

### 技术指标
- 数据库查询时间
- 算法服务响应时间
- 内存使用情况
- 错误日志统计

## 后续扩展

### 功能扩展
1. 支持多语言查询
2. 添加图片分类过滤
3. 支持用户个性化推荐
4. 添加A/B测试框架

### 技术扩展
1. 支持多个算法服务实例
2. 添加结果缓存层
3. 支持批量推荐接口
4. 集成推荐效果分析

## 联系信息

如有问题，请联系开发团队或查看相关技术文档。