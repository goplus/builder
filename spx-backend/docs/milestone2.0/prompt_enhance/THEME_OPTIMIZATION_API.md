# XBuilder 主题优化系统 API 文档

## 概述

XBuilder主题优化系统提供智能化的图像推荐和生成API，支持多主题风格的图像搜索与AI生成。

**版本**: v1.0  
**基础URL**: `https://api.xbuilder.com`  
**认证**: Bearer Token

## 1. 图像推荐 API

### 1.1 推荐图像

获取基于文本描述和主题的相关图像推荐。

**接口地址**: `POST /api/images/recommend`

#### 请求参数

```json
{
  "prompt": "string",     // 必填，图像描述文本
  "theme": "string",      // 可选，主题类型
  "top_k": 6             // 可选，返回结果数量，默认4，范围1-50
}
```

#### 支持的主题类型

| 主题代码 | 中文名称 | 描述 | 推荐Provider |
|---------|---------|------|-------------|
| `""` | 无主题 | 不应用特定主题风格 | OpenAI |
| `cartoon` | 卡通风格 | 色彩鲜艳的卡通风格，适合可爱有趣的内容 | Recraft |
| `realistic` | 写实风格 | 高度写实的风格，细节丰富逼真 | Recraft |
| `minimal` | 极简风格 | 极简主义风格，简洁干净的设计 | SVGIO |
| `fantasy` | 奇幻风格 | 充满魔法和超自然元素的奇幻风格 | Recraft |
| `retro` | 复古风格 | 怀旧复古风格，经典老式美学 | Recraft |
| `scifi` | 科幻风格 | 未来科技风格，充满科幻元素 | Recraft |
| `nature` | 自然风格 | 自然有机风格，使用自然元素和大地色调 | Recraft |
| `business` | 商务风格 | 专业商务风格，现代企业形象 | Recraft |

#### 请求示例

```bash
curl -X POST "https://api.xbuilder.com/api/images/recommend" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "一只可爱的小猫",
    "theme": "cartoon",
    "top_k": 6
  }'
```

#### 响应格式

```json
{
  "query": "string",                    // 实际使用的优化后查询
  "results_count": 6,                   // 返回结果数量
  "results": [
    {
      "id": 1001,                       // 资源ID
      "image_path": "string",           // 图像URL/路径
      "similarity": 0.92,               // 相似度分数 (0-1)
      "rank": 1,                        // 排名 (1-based)
      "source": "search"                // 来源: "search"(搜索) 或 "generated"(生成)
    },
    {
      "id": 1002,
      "image_path": "string", 
      "similarity": 0.89,
      "rank": 2,
      "source": "search"
    },
    {
      "id": 2001,
      "image_path": "string",
      "similarity": 0.80,
      "rank": 5,
      "source": "generated"
    }
  ]
}
```

#### 响应状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功返回推荐结果 |
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 429 | 请求频率限制 |
| 500 | 服务器内部错误 |

#### 错误响应格式

```json
{
  "error": {
    "code": "INVALID_THEME",
    "message": "不支持的主题类型",
    "details": {
      "supported_themes": ["cartoon", "realistic", "minimal", ...]
    }
  }
}
```

### 1.2 参数验证规则

#### prompt 参数
- **必填**：是
- **类型**：字符串
- **长度限制**：1-500 字符
- **说明**：描述需要搜索的图像内容

#### theme 参数
- **必填**：否
- **类型**：字符串枚举
- **默认值**：`""` (无主题)
- **有效值**：见上方主题类型表格

#### top_k 参数
- **必填**：否
- **类型**：整数
- **默认值**：4
- **范围**：1-50
- **说明**：返回的推荐结果数量

## 2. 主题管理 API

### 2.1 获取所有主题信息

**接口地址**: `GET /api/themes`

#### 响应示例

```json
{
  "themes": [
    {
      "id": "cartoon",
      "name": "卡通风格",
      "description": "色彩鲜艳的卡通风格，适合可爱有趣的内容",
      "prompt": "必须使用卡通风格，必须色彩鲜艳丰富...",
      "recommended_provider": "recraft",
      "preview_url": "https://example.com/preview/cartoon.svg"
    }
  ]
}
```

### 2.2 获取特定主题信息

**接口地址**: `GET /api/themes/{theme_id}`

#### 路径参数
- `theme_id`: 主题标识符

#### 响应示例

```json
{
  "id": "cartoon",
  "name": "卡通风格", 
  "description": "色彩鲜艳的卡通风格，适合可爱有趣的内容",
  "prompt": "必须使用卡通风格，必须色彩鲜艳丰富...",
  "recommended_provider": "recraft",
  "preview_url": "https://example.com/preview/cartoon.svg"
}
```

## 3. Prompt优化 API (内部)

### 3.1 Prompt分析

分析用户输入的prompt特征。

**接口地址**: `POST /internal/api/prompt/analyze`

#### 请求参数

```json
{
  "prompt": "一只可爱的小猫"
}
```

#### 响应示例

```json
{
  "type": "animal",
  "emotion": "cute", 
  "complexity": "medium",
  "keywords": ["一只", "可爱", "小猫"]
}
```

### 3.2 Prompt优化

获取优化后的prompt。

**接口地址**: `POST /internal/api/prompt/optimize`

#### 请求参数

```json
{
  "prompt": "一只可爱的小猫",
  "theme": "cartoon",
  "search_type": "theme"  // "semantic" | "theme"
}
```

#### 响应示例

```json
{
  "original": "一只可爱的小猫",
  "optimized": "一只可爱的小猫，必须使用卡通风格，必须色彩鲜艳丰富，必须可爱有趣，严格使用简单几何形状，强制使用明亮饱和的色彩，禁止写实细节，high quality vector art, detailed illustration, professional design, rich colors，cute and friendly style, appealing character design，SVG format, scalable graphics, cartoon-optimized, bright color palette",
  "analysis": {
    "type": "animal",
    "emotion": "cute",
    "complexity": "medium"
  }
}
```

## 4. 实现细节

### 4.1 搜索策略

系统根据是否指定主题自动选择搜索策略：

#### 无主题搜索 (theme = "")
```
用户请求 → 单路语义搜索 → 结果处理 → AI补充生成 → 返回结果
```

#### 主题化搜索 (theme != "")
```
用户请求 → 双路并发搜索 → 结果融合 → AI补充生成 → 返回结果
    ├─ 语义搜索 (70%) - 轻量主题增强
    └─ 主题搜索 (30%) - 完整主题优化
```

### 4.2 评分算法

最终相似度分数计算：
```
final_score = semantic_similarity * 0.7 + theme_relevance * 0.3
```

其中：
- `semantic_similarity`: 来自搜索算法的语义相似度 (0-1)
- `theme_relevance`: 主题相关性分数 (0-1)

### 4.3 结果来源

- **search**: 从现有图像库搜索得到的结果
- **generated**: AI实时生成的SVG图像

### 4.4 Provider选择

系统根据主题类型自动选择最适合的AI生成Provider：

| 主题 | Provider | 原因 |
|------|----------|------|
| cartoon | Recraft | 擅长卡通风格生成 |
| realistic | Recraft | 写实风格质量优秀 |
| minimal | SVGIO | 专注简约设计 |
| fantasy | Recraft | 奇幻元素丰富 |
| 其他 | Recraft | 综合性能最佳 |

## 5. 使用示例

### 5.1 基础图像推荐

```javascript
// 获取卡通风格的小猫图像
const response = await fetch('/api/images/recommend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    prompt: '一只可爱的小猫',
    theme: 'cartoon',
    top_k: 6
  })
});

const result = await response.json();
console.log('推荐结果:', result.results);
```

### 5.2 无主题搜索

```javascript
// 不指定主题的通用搜索
const response = await fetch('/api/images/recommend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    prompt: '办公室场景',
    top_k: 4
  })
});
```

### 5.3 批量主题预览

```javascript
// 获取所有主题信息
const themesResponse = await fetch('/api/themes');
const themes = await themesResponse.json();

// 为每个主题生成预览
for (const theme of themes.themes) {
  const preview = await fetch('/api/images/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
      prompt: '示例图像',
      theme: theme.id,
      top_k: 1
    })
  });
}
```

## 6. 错误处理

### 6.1 常见错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| `INVALID_PROMPT` | prompt参数无效 | 检查prompt长度和内容 |
| `INVALID_THEME` | 不支持的主题类型 | 使用支持的主题或留空 |
| `INVALID_TOP_K` | top_k参数超出范围 | 设置为1-50之间的值 |
| `SEARCH_SERVICE_ERROR` | 搜索服务异常 | 稍后重试 |
| `GENERATION_SERVICE_ERROR` | AI生成服务异常 | 稍后重试 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 | 降低请求频率 |

### 6.2 错误响应示例

```json
{
  "error": {
    "code": "INVALID_TOP_K",
    "message": "top_k must be between 1 and 50",
    "details": {
      "field": "top_k",
      "value": 100,
      "allowed_range": [1, 50]
    }
  }
}
```

## 7. 性能与限制

### 7.1 性能指标

- **平均响应时间**: < 2秒
- **搜索并发**: 支持语义+主题双路并发
- **AI生成并发**: 最多同时生成10个SVG
- **缓存命中率**: > 80%

### 7.2 使用限制

- **请求频率**: 100次/分钟
- **prompt长度**: 最大500字符
- **top_k范围**: 1-50
- **文件大小**: AI生成SVG < 1MB

### 7.3 最佳实践

1. **合理设置top_k**: 根据实际需求设置，避免不必要的计算
2. **主题选择**: 根据内容类型选择合适的主题
3. **缓存利用**: 相同请求会利用缓存加速响应
4. **错误处理**: 实现重试机制处理服务异常

这个API设计确保了XBuilder主题优化系统的易用性、可扩展性和高性能。