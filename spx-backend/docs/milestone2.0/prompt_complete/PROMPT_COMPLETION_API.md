# 提示词补全API接口文档

## 概述

提示词补全功能为开发者提供智能的代码、资源名称和关键词自动补全服务。该功能通过预构建的字典树(Trie)和机器学习模型，提供快速、准确的补全建议。

## 架构设计

```
用户输入 → 补全服务 → 预测引擎 → 返回建议列表
          ↓
       1. 接收用户输入前缀
       2. 查询缓存或数据库
       3. 应用智能排序算法
       4. 返回TopK个补全建议
```

### 核心功能
1. **资源名称补全**: 基于项目中的游戏资源(sprite、sound、backdrop等)提供补全
2. **代码关键词补全**: 提供Go+语言和SPX框架的关键词补全
3. **上下文感知**: 根据当前代码位置提供相关的补全建议
4. **缓存优化**: 使用Trie数据结构提供毫秒级响应

## API接口

### GET /assets/complete
**功能**: 游戏资源名称自动补全

**请求参数**:
```
GET /assets/complete?prefix=cat&limit=10
```

**参数说明**:
- `prefix` (string, 必需): 用户输入的前缀，最少1个字符
- `limit` (int, 可选): 返回建议数量，默认5，范围1-50

**响应格式**:
```json
{
  "prefix": "cat",
  "suggestions": [
    "cat_sprite_01",
    "cat_sound_meow",
    "cat_background",
    "caterpillar_sprite",
    "catch_game_sprite"
  ],
  "count": 5,
  "cache_hit": true
}
```

### POST /prompt/complete
**功能**: 智能代码补全和提示词建议

**请求参数**:
```json
{
  "context": {
    "project_id": 12345,
    "file_type": "gop",
    "cursor_position": {
      "line": 10,
      "column": 15
    },
    "current_line": "sprite.Move"
  },
  "prefix": "Mo",
  "completion_type": "method",
  "limit": 8
}
```

**参数说明**:
- `context` (object, 必需): 代码上下文信息
  - `project_id` (int64, 必需): 项目ID
  - `file_type` (string, 必需): 文件类型，支持`"gop"`, `"spx"`, `"json"`
  - `cursor_position` (object, 可选): 光标位置
  - `current_line` (string, 可选): 当前行内容
- `prefix` (string, 必需): 补全前缀
- `completion_type` (string, 可选): 补全类型，可选值:
  - `"method"`: 方法补全
  - `"variable"`: 变量补全 
  - `"keyword"`: 关键词补全
  - `"auto"`: 自动检测(默认)
- `limit` (int, 可选): 返回建议数量，默认8，范围1-20

**响应格式**:
```json
{
  "prefix": "Mo",
  "context": {
    "detected_type": "method",
    "file_type": "gop",
    "project_context": ["sprite", "game", "movement"]
  },
  "suggestions": [
    {
      "text": "Move",
      "description": "Move sprite to specified position",
      "type": "method",
      "signature": "Move(x, y float64)",
      "priority": 0.95,
      "source": "spx_framework"
    },
    {
      "text": "MoveTo", 
      "description": "Move sprite to target with animation",
      "type": "method",
      "signature": "MoveTo(target Position, duration float64)",
      "priority": 0.88,
      "source": "spx_framework"
    },
    {
      "text": "MoveBy",
      "description": "Move sprite by relative offset",
      "type": "method", 
      "signature": "MoveBy(dx, dy float64)",
      "priority": 0.82,
      "source": "spx_framework"
    }
  ],
  "count": 3,
  "completion_time_ms": 15
}
```

### GET /prompt/keywords
**功能**: 获取可用关键词列表

**请求参数**:
```
GET /prompt/keywords?category=spx&file_type=gop
```

**参数说明**:
- `category` (string, 可选): 关键词分类，可选值:
  - `"gop"`: Go+语言关键词
  - `"spx"`: SPX框架关键词
  - `"builtin"`: 内置函数
  - `"all"`: 所有关键词(默认)
- `file_type` (string, 可选): 文件类型过滤

**响应格式**:
```json
{
  "category": "spx",
  "keywords": [
    {
      "name": "Sprite",
      "type": "class",
      "description": "Game sprite object",
      "usage_example": "var sprite Sprite"
    },
    {
      "name": "onStart", 
      "type": "event",
      "description": "Game start event handler",
      "usage_example": "func onStart() { ... }"
    },
    {
      "name": "say",
      "type": "method",
      "description": "Display speech bubble",
      "usage_example": "sprite.say(\"Hello!\")"
    }
  ],
  "count": 3,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## 缓存管理

### POST /assets/complete/refresh
**功能**: 刷新补全缓存(管理员接口)

**请求参数**: 无

**响应格式**:
```json
{
  "status": "success",
  "message": "Asset completion cache refreshed",
  "stats": {
    "total_assets": 15420,
    "cache_size": "2.4MB",
    "refresh_time_ms": 1240
  }
}
```

### GET /assets/complete/stats
**功能**: 获取补全服务统计信息

**响应格式**:
```json
{
  "service_status": "healthy",
  "cache_enabled": true,
  "statistics": {
    "total_requests": 89432,
    "cache_hit_rate": 0.94,
    "avg_response_time_ms": 8.5,
    "total_assets_cached": 15420,
    "cache_size_mb": 2.4,
    "last_cache_refresh": "2024-01-15T09:15:00Z"
  },
  "performance": {
    "trie_depth": 12,
    "max_suggestions_per_request": 50,
    "request_timeout_ms": 3000
  }
}
```

## 错误处理

### 错误响应格式
```json
{
  "error": {
    "code": "INVALID_PREFIX",
    "message": "Prefix must be at least 1 character long",
    "details": {
      "field": "prefix",
      "value": "",
      "requirement": "min_length: 1"
    }
  },
  "request_id": "req_123456789"
}
```

### 常见错误码
- `INVALID_PREFIX`: 前缀格式无效
- `LIMIT_EXCEEDED`: 请求限制超出范围
- `PROJECT_NOT_FOUND`: 项目不存在
- `CACHE_UNAVAILABLE`: 缓存服务不可用
- `COMPLETION_TIMEOUT`: 补全请求超时
- `INVALID_CONTEXT`: 上下文信息无效

## 性能特性

1. **响应时间**: 平均响应时间 < 15ms
2. **并发处理**: 支持1000+ QPS
3. **缓存命中率**: > 90%
4. **内存使用**: 缓存大小约2-5MB
5. **容错能力**: 缓存失效时自动降级到数据库查询

## 配置说明

### 环境变量
- `ENABLE_ASSET_COMPLETION_TRIE`: 启用Trie缓存 (true/false)
- `COMPLETION_CACHE_TTL`: 缓存过期时间，默认3600秒
- `MAX_COMPLETION_SUGGESTIONS`: 最大建议数量，默认50
- `COMPLETION_REQUEST_TIMEOUT`: 请求超时时间，默认3000ms

### 使用建议
1. 生产环境建议启用Trie缓存以获得最佳性能
2. 定期刷新缓存以保持数据一致性
3. 监控缓存命中率，低于80%时考虑优化
4. 根据项目规模调整建议数量限制

## 集成示例

### JavaScript客户端示例
```javascript
// 资源名称补全
async function getAssetCompletions(prefix) {
  const response = await fetch(`/api/assets/complete?prefix=${prefix}&limit=10`);
  const data = await response.json();
  return data.suggestions;
}

// 代码补全
async function getCodeCompletions(context, prefix) {
  const response = await fetch('/api/prompt/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, prefix, limit: 8 })
  });
  const data = await response.json();
  return data.suggestions;
}
```

### Go客户端示例
```go
type CompletionRequest struct {
    Context        Context `json:"context"`
    Prefix         string  `json:"prefix"`
    CompletionType string  `json:"completion_type,omitempty"`
    Limit          int     `json:"limit,omitempty"`
}

func GetCompletions(req CompletionRequest) ([]Suggestion, error) {
    // 实现补全请求逻辑
}
```