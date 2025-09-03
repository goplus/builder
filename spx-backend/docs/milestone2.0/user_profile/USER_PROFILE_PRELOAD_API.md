# 用户画像与预加载系统 API 文档

## 概述

基于现有SPX Builder项目的生图推荐系统，扩展用户画像和预加载功能，与现有的`POST /images/recommend`和`POST /image/svg`接口深度集成。

**Base URL**: 当前项目已有的路由基础

## 核心API设计

### 1. 用户画像管理

#### 1.1 获取用户画像
```http
GET /user/profile
```

**Headers**:
```http
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user_id": "user_123",
    "profile_id": "prof_456",
    "group_id": "creative_educator",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:20:00Z",
    "preferences": {
      "themes": {
        "cartoon": 0.85,
        "simple": 0.72,
        "realistic": 0.45,
        "pixel": 0.68,
        "sticker": 0.91,
        "cute": 0.88,
        "sketch": 0.23,
        "monochrome": 0.15,
        "logo": 0.34
      },
      "content_types": {
        "character": 0.78,
        "object": 0.65,
        "scene": 0.43,
        "icon": 0.52
      },
      "colors": {
        "bright": 0.82,
        "pastel": 0.76,
        "dark": 0.28,
        "neutral": 0.54
      }
    },
    "behavior_stats": {
      "total_searches": 156,
      "avg_weekly_usage": 12,
      "favorite_themes": ["cartoon", "sticker", "cute"],
      "peak_usage_hours": [14, 15, 16],
      "last_active": "2024-01-20T16:45:00Z"
    }
  }
}
```

#### 1.2 记录用户行为 (扩展现有推荐接口)
```http
POST /images/recommend
```

**现有接口扩展**: 在现有的推荐接口基础上，后台自动记录用户行为数据

**请求体** (保持现有格式不变):
```json
{
  "text": "一只可爱的卡通猫",
  "topK": 10,
  "provider": "openai"
}
```

**新增后台逻辑**:
- 自动提取用户偏好特征
- 记录搜索关键词和主题
- 更新用户画像权重
- 为预加载系统提供数据

### 2. 预加载图片API

#### 2.1 获取预加载图片
```http
GET /user/preload-images
```

**请求参数**:
```http
GET /user/preload-images?count=30&context=init&refresh=false
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| count | int | 30 | 预加载图片数量 |
| context | string | init | 上下文: init(初始化), refresh(刷新), browse(浏览) |
| refresh | bool | false | 强制刷新画像数据 |

**Headers**:
```http
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "profile_group": "creative_educator",
    "cache_key": "preload_prof_456_20240120",
    "total_count": 30,
    "images": [
      {
        "id": "ai_res_001",
        "resource_id": "res_12345",
        "title": "Cute Cartoon Cat",
        "description": "A friendly cartoon cat character",
        "image_url": "https://cdn.spx.com/ai-resources/cat_cartoon_001.svg",
        "thumbnail_url": "https://cdn.spx.com/thumbs/cat_cartoon_001_200x200.jpg",
        "format": "svg",
        "theme": "cartoon",
        "labels": ["animal", "cartoon", "cute", "character"],
        "match_score": 0.94,
        "width": 512,
        "height": 512,
        "file_size": 15360,
        "provider": "openai",
        "created_at": "2024-01-18T09:15:00Z",
        "usage_stats": {
          "download_count": 245,
          "like_count": 89
        }
      }
      // ... 更多图片
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "has_more": false
    },
    "cache_info": {
      "ttl": 3600,
      "next_refresh_at": "2024-01-20T18:00:00Z",
      "hit_rate": 0.75
    },
    "recommendation_context": {
      "algorithm_version": "v2.1",
      "factors_used": ["theme_preference", "content_type", "historical_interaction"],
      "personalization_score": 0.87
    }
  }
}
```

#### 2.2 批量下载预加载图片
```http
POST /user/preload-images/batch-download
```

**请求体**:
```json
{
  "image_ids": ["ai_res_001", "ai_res_002", "ai_res_003"],
  "format": "original",
  "compress": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "download_url": "https://cdn.spx.com/batch/user_123_batch_20240120.zip",
    "expires_at": "2024-01-21T17:00:00Z",
    "total_size": "2.5MB",
    "file_count": 3
  }
}
```

### 3. 与现有API的集成

#### 3.1 增强的图片推荐 (现有接口)
```http
POST /images/recommend
```

**现有功能保持不变**，新增个性化增强:

**响应示例** (新增字段):
```json
{
  "query": "一只可爱的卡通猫",
  "results_count": 8,
  "results": [
    {
      "id": "ai_res_001",
      "image_path": "/ai-resources/cat_001.svg",
      "rank": 1,
      "source": "search",
      "match_score": 0.89,
      // 新增个性化字段
      "personalization": {
        "user_preference_match": 0.94,
        "theme_affinity": 0.91,
        "predicted_satisfaction": 0.87,
        "recommendation_reason": "基于您对卡通和可爱风格的偏好"
      }
    }
  ],
  // 新增用户画像上下文
  "profile_context": {
    "user_group": "creative_educator",
    "primary_themes": ["cartoon", "sticker", "cute"],
    "recommendation_confidence": 0.85
  }
}
```

#### 3.2 增强的SVG生成 (现有接口)
```http
POST /image/svg
```

**现有功能保持不变**，新增个性化prompt增强:

**请求体** (保持现有格式):
```json
{
  "text": "一只猫",
  "theme": "cartoon",
  "provider": "openai"
}
```

**后台增强逻辑**:
1. 根据用户画像自动优化prompt
2. 选择最适合的主题和Provider
3. 记录生成结果用于画像更新

### 4. 用户行为分析API

#### 4.1 获取用户行为统计
```http
GET /user/behavior-stats
```

**请求参数**:
```http
GET /user/behavior-stats?period=30d&include_details=true
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "summary": {
      "total_searches": 156,
      "total_downloads": 89,
      "total_generations": 23,
      "unique_themes_used": 6,
      "avg_session_duration": "18m 32s"
    },
    "theme_usage": {
      "cartoon": {"count": 45, "percentage": 28.8},
      "sticker": {"count": 38, "percentage": 24.4},
      "cute": {"count": 32, "percentage": 20.5}
    },
    "hourly_pattern": [
      {"hour": 14, "activity_score": 0.85},
      {"hour": 15, "activity_score": 0.92},
      {"hour": 16, "activity_score": 0.78}
    ],
    "satisfaction_metrics": {
      "avg_rating": 4.2,
      "completion_rate": 0.78,
      "repeat_usage_rate": 0.65
    }
  }
}
```

#### 4.2 记录用户反馈
```http
POST /user/feedback
```

**请求体**:
```json
{
  "resource_id": "ai_res_001",
  "feedback_type": "rating",
  "value": 5,
  "comment": "很喜欢这个风格",
  "context": {
    "source": "preload",
    "session_id": "sess_789"
  }
}
```

### 5. 管理员API

#### 5.1 获取系统统计
```http
GET /admin/preload-stats
```

**权限要求**: 管理员权限

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "active_profiles": 956,
    "preload_efficiency": {
      "cache_hit_rate": 0.73,
      "avg_response_time": "145ms",
      "storage_usage": "2.8GB"
    },
    "user_groups": {
      "creative_educator": 425,
      "game_developer": 287,
      "ui_designer": 244
    },
    "top_themes": {
      "cartoon": 2156,
      "simple": 1889,
      "sticker": 1654
    }
  }
}
```

## 错误码定义

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 请求参数无效 |
| 40101 | 401 | 用户未登录 |
| 40301 | 403 | 权限不足 |
| 40401 | 404 | 用户画像不存在 |
| 42901 | 429 | 请求频率过高 |
| 50001 | 500 | 内部服务器错误 |
| 50301 | 503 | 预加载服务暂时不可用 |

## 实现路线图

### Phase 1: 基础集成 (1-2周)
- 扩展现有`POST /images/recommend`接口记录用户行为
- 实现基础的用户画像存储
- 开发`GET /user/preload-images`API

### Phase 2: 个性化增强 (2-3周)  
- 完善用户画像算法
- 增强推荐接口的个性化能力
- 实现预加载缓存机制

### Phase 3: 系统优化 (1-2周)
- 性能优化和监控
- 管理员接口和统计功能
- A/B测试系统

## 与现有架构的集成点

### 1. Controller层集成
```go
// 扩展现有controller/image_recommend.go
func (ctrl *Controller) RecommendImages(ctx context.Context, params *ImageRecommendParams) (*ImageRecommendResult, error) {
    // 保持现有逻辑
    result, err := ctrl.performRecommendation(ctx, params)
    
    // 新增: 记录用户行为
    if userID := getUserID(ctx); userID != "" {
        ctrl.profileService.RecordSearchBehavior(ctx, userID, params.Text, result)
    }
    
    // 新增: 个性化增强
    if profile := ctrl.profileService.GetUserProfile(ctx, userID); profile != nil {
        result = ctrl.enhanceWithPersonalization(result, profile)
    }
    
    return result, err
}
```

### 2. Model层扩展
```go
// 新增model/user_profile.go
type UserProfile struct {
    ID          string    `json:"id" gorm:"primaryKey"`
    UserID      string    `json:"user_id" gorm:"index"`
    GroupID     string    `json:"group_id"`
    Preferences Preferences `json:"preferences" gorm:"type:json"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### 3. 复用现有基础设施
- **认证系统**: 复用现有的Casdoor认证
- **数据库**: 扩展现有的PostgreSQL表结构  
- **缓存系统**: 利用现有的Redis配置
- **文件存储**: 复用现有的云存储配置
- **监控体系**: 集成现有的日志和监控系统

