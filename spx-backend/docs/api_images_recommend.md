# Images Recommend API

## 接口概述

该接口基于文本提示词推荐相似图片，采用双路径搜索策略结合 AI 生成，为用户提供高质量的图片推荐结果。

## 接口信息

- **URL**: `POST /images/recommend`
- **框架**: YAP (Yet Another Playground)
- **入口文件**: `cmd/spx-backend/post_images_recommend.yap`
- **控制器**: `internal/controller/image_recommend.go:178`

## 请求参数

### 请求体 (JSON)

```json
{
  "prompt": "string",     // 必填，文本提示词，最少1个字符
  "top_k": 4,            // 可选，返回结果数量，默认4，范围1-50
  "theme": "cartoon"     // 可选，主题类型，影响图片生成和搜索策略
}
```

### 参数详情

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `prompt` | string | 是 | - | 图片搜索的文本描述，用于语义匹配和AI生成 |
| `top_k` | integer | 否 | 4 | 期望返回的图片数量，范围：1-50 |
| `theme` | string | 否 | "" | 主题类型，影响搜索算法和AI生成提供商选择 |

### 支持的主题类型

| 主题值 | 说明 | AI提供商 |
|--------|------|----------|
| `""` (空) | 无主题，使用语义搜索 | OpenAI |
| `"cartoon"` | 卡通风格 | 主题推荐提供商 |
| `"realistic"` | 现实风格 | 主题推荐提供商 |
| `"minimal"` | 极简风格 | 主题推荐提供商 |
| `"fantasy"` | 奇幻风格 | 主题推荐提供商 |
| `"retro"` | 复古风格 | 主题推荐提供商 |
| `"scifi"` | 科幻风格 | 主题推荐提供商 |
| `"nature"` | 自然风格 | 主题推荐提供商 |

## 响应格式

### 成功响应 (200 OK)

```json
{
  "query": "string",           // 优化后的查询文本
  "results_count": 4,          // 实际返回的结果数量
  "results": [                 // 推荐结果数组
    {
      "id": 12345,            // 图片ID
      "image_path": "string", // 图片URL路径
      "similarity": 0.85,     // 相似度评分 (0-1)
      "rank": 1,              // 排名 (1开始)
      "source": "search"      // 来源："search" 或 "generated"
    }
  ]
}
```

### 错误响应

```json
{
  "code": "INVALID_ARGS",
  "message": "text is required"
}
```

## 算法策略

### 1. 无主题模式 (theme="")
- **策略**: 单一语义搜索
- **流程**: 
  1. 使用原始提示词进行语义搜索
  2. 如果结果不足，生成AI图片补充

### 2. 主题模式 (theme ≠ "")
- **策略**: 双路径搜索 + AI增强
- **流程**:
  1. **提示词分析**: 一次性AI分析提示词类型、情感、复杂度
  2. **双路径搜索**:
     - 语义搜索 (70%): 轻量主题增强，保持语义相关性
     - 主题搜索 (30%): 完全优化提示词，强化主题特征
  3. **结果融合**: 
     - 去重处理
     - 重新评分: 70%语义得分 + 30%主题相关性
     - 按最终得分排序
  4. **AI生成补充**: 如果搜索结果不足，使用优化提示词生成AI图片

### 3. 性能优化特性
- **缓存分析**: 提示词分析结果在单次请求中复用
- **并发处理**: 双路径搜索和AI生成并行执行
- **智能提供商**: 根据主题选择最适合的AI提供商

## 请求示例

### 基础搜索
```bash
curl -X POST http://localhost:8080/images/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只可爱的小猫",
    "top_k": 6
  }'
```

### 主题搜索
```bash
curl -X POST http://localhost:8080/images/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "太空飞船",
    "top_k": 8,
    "theme": "scifi"
  }'
```

## 依赖服务

### 算法服务 (spx-algorithm)
- **URL**: `http://100.100.35.128:5000/api/search/resource`
- **用途**: 语义搜索引擎
- **超时**: 30秒

### AI生成服务
- **用途**: SVG图片生成
- **提供商**: OpenAI, 主题特定提供商
- **并发**: 支持多个图片同时生成

## 错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| `INVALID_ARGS` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 内部服务错误 |

### 常见错误情况
- `text is required`: prompt参数为空
- `top_k must be between 1 and 50`: top_k超出范围
- `invalid theme type`: 主题类型不支持
- `algorithm service returned status: XXX`: 算法服务异常
- `search failed`: 搜索服务调用失败

## 性能指标

- **响应时间**: 通常 < 3秒 (包含AI生成)
- **并发支持**: 搜索和生成并行处理
- **缓存优化**: 单次请求内提示词分析复用
- **容错设计**: 部分服务失败不影响整体结果

## 注意事项

1. **搜索结果**: 来自spx-algorithm服务的语义匹配
2. **AI生成**: 当搜索结果不足时自动触发
3. **主题影响**: 不同主题使用不同的AI提供商和优化策略
4. **相似度评分**: 搜索结果为真实相似度，生成结果为递减虚拟分数
5. **排名更新**: 最终结果按相似度重新排名 (1开始)

## 相关文件

- 入口: `cmd/spx-backend/post_images_recommend.yap`
- 控制器: `internal/controller/image_recommend.go`
- 主题定义: `internal/controller/theme.go`
- 模型定义: `internal/controller/` (相关结构体)