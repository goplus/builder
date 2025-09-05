# 即时搜索功能 API 文档

## 概述

即时搜索功能为项目提供智能图片搜索能力，支持基于项目关键词的扩展搜索，提升搜索准确性和相关性。

## API 接口

### 1. 生成项目关键词

**接口描述：** 根据项目名称和描述生成相关关键词，用于后续的扩展搜索。

**请求信息：**
```
POST /project/{projectId}/keywords/generate
Content-Type: application/json
```

**路径参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| projectId | int64 | 是 | 项目ID |

**请求体：**
```json
{
  "project_name": "太空探险游戏",
  "description": "玩家驾驶飞船探索外星球",
  "theme": "scifi",
  "max_keywords": 20
}
```

**请求参数说明：**
| 字段 | 类型 | 必填 | 描述 | 限制 |
|------|------|------|------|------|
| project_name | string | 是 | 项目名称 | 1-100字符 |
| description | string | 否 | 项目描述 | 最多500字符 |
| theme | string | 否 | 主题风格 | 见主题类型表 |
| max_keywords | int | 否 | 最大关键词数量 | 1-50，默认20 |

**主题类型表：**
| 值 | 描述 |
|---|---|
| cartoon | 卡通风格 |
| realistic | 写实风格 |
| minimal | 极简风格 |
| fantasy | 奇幻风格 |
| retro | 复古风格 |
| scifi | 科幻风格 |
| nature | 自然风格 |
| business | 商务风格 |

**响应示例：**
```json
{
  "project_id": 123,
  "keywords": [
    "宇宙飞船", "外星人", "星球", "陨石", "太空站", 
    "宇航员", "星空", "火箭", "外星球", "太空探险",
    "科技", "未来", "机械", "霓虹", "星系"
  ],
  "theme": "scifi",
  "prompt": "根据项目名称'太空探险游戏'和描述'玩家驾驶飞船探索外星球'，生成相关关键词..."
}
```

**错误响应：**
```json
{
  "error": "project name is required"
}
```

### 2. 即时图片搜索

**接口描述：** 执行即时图片搜索，支持直接搜索和基于项目关键词的扩展搜索。

**请求信息：**
```
POST /search/instant
Content-Type: application/json
```

**请求体：**
```json
{
  "project_id": 123,
  "query": "宇宙飞船",
  "theme": "scifi",
  "top_k": 10,
  "enable_expand": true
}
```

**请求参数说明：**
| 字段 | 类型 | 必填 | 描述 | 限制 |
|------|------|------|------|------|
| project_id | int64 | 是 | 项目ID | 大于0 |
| query | string | 是 | 搜索关键词 | 1-200字符 |
| theme | string | 否 | 主题风格 | 见主题类型表 |
| top_k | int | 否 | 返回结果数量 | 1-50，默认10 |
| enable_expand | bool | 否 | 是否启用扩展搜索 | 默认false |

**响应示例：**
```json
{
  "query": "宇宙飞船",
  "project_id": 123,
  "suggestions": [
    {
      "image_url": "/path/to/spaceship1.jpg",
      "match_type": "direct",
      "confidence": 0.95,
      "keywords": ["宇宙飞船"],
      "description": "Rank 1 image"
    },
    {
      "image_url": "/path/to/spaceship2.jpg",
      "match_type": "expanded",
      "confidence": 0.76,
      "keywords": ["宇宙飞船", "科技", "未来", "星空"],
      "description": "Rank 2 image (expanded)"
    }
  ],
  "total_count": 2,
  "search_strategy": "combined",
  "response_time_ms": 245,
  "expanded_query": "宇宙飞船 科技 未来 星空 外星球"
}
```

**响应字段说明：**
| 字段 | 类型 | 描述 |
|------|------|------|
| query | string | 原始搜索词 |
| project_id | int64 | 项目ID |
| suggestions | array | 搜索建议列表 |
| total_count | int | 结果总数 |
| search_strategy | string | 搜索策略：direct/expanded/combined |
| response_time_ms | int64 | 响应时间（毫秒） |
| expanded_query | string | 扩展后的查询词（仅扩展搜索时返回） |

**搜索建议对象：**
| 字段 | 类型 | 描述 |
|------|------|------|
| image_url | string | 图片URL |
| match_type | string | 匹配类型：direct/expanded |
| confidence | float64 | 置信度分数 (0-1) |
| keywords | array | 匹配的关键词列表 |
| description | string | 图片描述 |

### 3. 获取项目关键词

**接口描述：** 获取指定项目已生成的关键词。

**请求信息：**
```
GET /project/{projectId}/keywords
```

**路径参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| projectId | int64 | 是 | 项目ID |

**响应示例：**
```json
{
  "project_id": 123,
  "keywords": [
    "宇宙飞船", "外星人", "星球", "陨石", "太空站",
    "宇航员", "星空", "火箭", "外星球", "太空探险"
  ],
  "theme": "scifi",
  "status": "completed",
  "generated_at": "2025-09-05T15:30:00Z",
  "generation_prompt": "根据项目名称和描述生成的关键词..."
}
```

**状态值说明：**
| 状态 | 描述 |
|------|------|
| pending | 等待生成 |
| generating | 生成中 |
| completed | 生成完成 |
| failed | 生成失败 |

## 错误代码

| HTTP状态码 | 错误信息 | 描述 |
|------------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 项目或关键词不存在 |
| 500 | Internal Server Error | 服务器内部错误 |

## 使用流程

### 典型使用场景：

1. **初始化项目关键词**
   ```bash
   # 为新项目生成关键词
   POST /project/123/keywords/generate
   {
     "project_name": "太空探险游戏",
     "description": "玩家驾驶飞船探索外星球",
     "theme": "scifi"
   }
   ```

2. **执行即时搜索**
   ```bash
   # 搜索相关图片
   POST /search/instant
   {
     "project_id": 123,
     "query": "飞船",
     "enable_expand": true
   }
   ```

3. **查看项目关键词**
   ```bash
   # 获取已生成的关键词
   GET /project/123/keywords
   ```

## 性能优化

### 搜索策略：
- **直接搜索：** 使用原始查询词进行搜索
- **扩展搜索：** 结合项目关键词进行搜索
- **并发执行：** 两种搜索策略并行执行，提升响应速度
- **智能合并：** 自动去重并按置信度排序

### 缓存机制：
- 项目关键词缓存，减少数据库查询
- 搜索结果临时缓存，提升重复查询性能

### 限流控制：
- 单个项目关键词生成频率限制
- 搜索请求频率限制

## 注意事项

1. **关键词生成：** 需要消耗LLM资源，建议合理控制调用频率
2. **扩展搜索：** 启用后会增加响应时间，但提升搜索相关性
3. **主题一致性：** 建议在同一项目中保持主题风格一致
4. **数据安全：** 所有关键词数据与项目关联，支持级联删除