# AI 图像生成功能接口文档

本文档详细描述了 XBuilder 系统中所有与 AI 图像生成相关的接口功能。

## 目录

1. [概述](#概述)
2. [图像生成接口](#图像生成接口)
3. [图像推荐接口](#图像推荐接口)
4. [主题管理接口](#主题管理接口)
5. [图像处理接口](#图像处理接口)
6. [智能补全接口](#智能补全接口)
7. [提示词增强功能](#提示词增强功能)
8. [数据结构说明](#数据结构说明)
9. [错误码说明](#错误码说明)

## 概述

XBuilder 的 AI 图像生成系统支持多种生成提供商（SVG.IO、Recraft、OpenAI），提供了智能推荐、主题化生成、背景移除等功能。系统采用 YAP 框架构建，支持多种图像格式和风格主题。

### 支持的生成提供商
- **SVG.IO**: 擅长极简风格
- **Recraft**: 擅长卡通、写实、复古、科幻、商务风格
- **OpenAI**: 通用提供商，支持奇幻、自然风格

## 图像生成接口

### 1. 生成 SVG 图像（直接返回）

**接口路径**: `POST /image/svg`

**描述**: 生成 SVG 格式图像并直接返回 SVG 内容。

**请求参数**:
```json
{
  "prompt": "一只可爱的小猫",               // 必需，生成提示词
  "negative_prompt": "背景杂乱",            // 可选，负面提示词
  "style": "cartoon",                     // 可选，样式
  "theme": "cartoon",                     // 可选，主题类型
  "provider": "recraft",                  // 可选，生成提供商
  "format": "svg",                        // 可选，输出格式
  "skip_translate": false,                // 可选，跳过翻译
  "model": "recraftv3",                   // 可选，模型名称
  "size": "1024x1024",                    // 可选，图像尺寸
  "substyle": "vector",                   // 可选，子样式
  "n": 1                                  // 可选，生成数量
}
```

**响应**:
- **状态码**: 200
- **Content-Type**: `image/svg+xml`
- **响应头**:
  - `Content-Disposition`: `attachment; filename="{id}.svg"`
  - `X-Image-Id`: 图像ID
  - `X-Image-Width`: 图像宽度
  - `X-Image-Height`: 图像高度
  - `X-Provider`: 生成提供商
  - `X-Kodo-URL`: Kodo存储URL（如果可用）
  - `X-Original-Prompt`: 原始提示词（如果翻译）
  - `X-Translated-Prompt`: 翻译后提示词（如果翻译）
  - `X-Was-Translated`: 是否进行了翻译

**响应体**: SVG文件的二进制内容

### 2. 生成图像（返回元数据）

**接口路径**: `POST /image`

**描述**: 生成图像并返回详细的元数据信息。

**请求参数**: 与 `/image/svg` 相同

**响应示例**:
```json
{
  "id": "img_123456",
  "svg_url": "https://example.com/image.svg",
  "png_url": "https://example.com/image.png",
  "kodo_svg_url": "kodo://bucket/files/hash.svg",
  "ai_resource_id": 12345,
  "width": 1024,
  "height": 1024,
  "provider": "recraft",
  "original_prompt": "一只可爱的小猫",
  "translated_prompt": "a cute little cat",
  "was_translated": true,
  "created_at": "2025-01-15T10:30:00Z"
}
```

## 图像推荐接口

### 3. 图像推荐

**接口路径**: `POST /images/recommend`

**描述**: 基于文本提示词推荐相似图像，支持双路径搜索和AI生成。

**请求参数**:
```json
{
  "prompt": "一只可爱的小猫",               // 必需，搜索提示词
  "top_k": 4,                            // 可选，返回结果数量，默认4，范围1-50
  "theme": "cartoon",                    // 可选，主题类型
  "search_only": false                   // 可选，仅搜索不生成，默认false
}
```

**响应示例**:
```json
{
  "query_id": "uuid-query-id",
  "query": "优化后的搜索词",
  "results_count": 4,
  "results": [
    {
      "id": 12345,
      "image_path": "kodo://bucket/files/hash.svg",
      "similarity": 0.95,
      "rank": 1,
      "source": "search"                 // "search" 或 "generated"
    },
    {
      "id": 12346,
      "image_path": "kodo://bucket/files/hash2.svg",
      "similarity": 0.85,
      "rank": 2,
      "source": "generated"
    }
  ]
}
```

### 4. 即时推荐（带项目上下文）

**接口路径**: `POST /images/instant-recommend`

**描述**: 基于项目上下文的智能图像推荐，使用项目关键词增强搜索效果。

**功能特点**:
- 自动加载项目上下文关键词
- 智能增强用户提示词
- 仅搜索模式，不生成新图像
- 项目关联的语义搜索

**请求参数**:
```json
{
  "project_id": 123,                     // 必需，项目ID
  "user_prompt": "背景图片",              // 必需，用户输入的提示词
  "top_k": 4,                           // 可选，返回结果数量，默认4，范围1-50
  "theme": "fantasy"                    // 可选，主题类型
}
```

**响应示例**:
```json
{
  "query_id": "uuid-query-id",
  "query": "背景图片 (enhanced with project context)",
  "results_count": 4,
  "results": [
    {
      "id": 12345,
      "image_path": "kodo://bucket/files/hash.svg",
      "similarity": 0.95,
      "rank": 1,
      "source": "search"
    }
  ]
}
```

**工作流程**:
1. 根据项目ID查找项目上下文
2. 如果存在上下文，使用项目关键词增强用户提示词
3. 执行语义搜索（仅搜索，不生成）
4. 返回增强后的搜索结果

### 5. 项目上下文生成

**接口路径**: `POST /projects/context/generate`

**描述**: 为项目生成或更新智能上下文关键词，用于后续的图像推荐增强。

**请求参数**:
```json
{
  "project_id": 123,                     // 必需，项目ID，必须为正整数
  "project_name": "太空冒险游戏",          // 必需，项目名称，1-255字符
  "project_description": "一个关于太空探索和外星文明的冒险游戏" // 可选，项目描述
}
```

**响应示例**:
```json
{
  "project_id": 123,
  "name": "太空冒险游戏",
  "description": "一个关于太空探索和外星文明的冒险游戏",
  "related_words": [
    "宇宙飞船",
    "外星人",
    "星球",
    "太空站",
    "科幻",
    "冒险",
    "探索",
    "银河系",
    "机器人",
    "激光武器",
    "星际旅行",
    "未来科技",
    "太空服",
    "陨石",
    "黑洞"
  ],
  "created_at": "2025-01-15T10:30:00Z"
}
```

**功能特性**:
- **AI智能分析**: 使用大语言模型分析项目内容
- **关键词生成**: 自动生成15-20个相关关键词
- **多语言支持**: 支持中英文关键词混合
- **智能去重**: 自动去除重复和无效关键词
- **优先级排序**: 按重要性对关键词排序

**关键词生成策略**:
1. **主题相关**: 涵盖项目主题相关的物体、场景
2. **风格元素**: 包含艺术风格、情绪表达
3. **游戏元素**: 游戏特有的道具、角色、场景
4. **技术规范**: 每个关键词简短精确（1-50字符）
5. **数量控制**: 最多20个关键词，避免过载

### 6. 提交反馈

**接口路径**: `POST /images/feedback`

**描述**: 提交用户对推荐结果的反馈。

**请求参数**:
```json
{
  "query_id": "uuid-query-id",           // 必需，查询ID
  "chosen_pic": 12345                    // 必需，选择的图片ID
}
```

**响应示例**:
```json
{
  "status": "success",
  "message": "Feedback submitted successfully"
}
```

## 主题管理接口

### 7. 获取所有主题

**接口路径**: `GET /themes`

**描述**: 获取所有可用的图像生成主题。

**响应示例**:
```json
[
  {
    "id": "cartoon",
    "name": "卡通风格",
    "description": "色彩鲜艳的卡通风格，适合可爱有趣的内容",
    "prompt": "采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩",
    "recommended_provider": "recraft",
    "preview_url": "kodo://bucket/files/preview.svg"
  },
  {
    "id": "realistic",
    "name": "写实风格",
    "description": "高度写实的风格，细节丰富逼真",
    "prompt": "采用写实风格，注重细节刻画，追求逼真效果，展现专业高质量的渲染效果",
    "recommended_provider": "recraft",
    "preview_url": "kodo://bucket/files/preview2.svg"
  }
]
```

### 支持的主题类型

| 主题ID | 中文名称 | 推荐提供商 | 描述 |
|--------|----------|------------|------|
| `""` | 无主题 | openai | 不应用任何特定主题风格 |
| `cartoon` | 卡通风格 | recraft | 色彩鲜艳的卡通风格，适合可爱有趣的内容 |
| `realistic` | 写实风格 | recraft | 高度写实的风格，细节丰富逼真 |
| `minimal` | 极简风格 | svgio | 极简主义风格，简洁干净的设计 |
| `fantasy` | 奇幻风格 | openai | 充满魔法和超自然元素的奇幻风格 |
| `retro` | 复古风格 | recraft | 怀旧复古风格，经典老式美学 |
| `scifi` | 科幻风格 | recraft | 未来科技风格，充满科幻元素 |
| `nature` | 自然风格 | openai | 自然有机风格，使用自然元素和大地色调 |
| `business` | 商务风格 | recraft | 专业商务风格，现代企业形象 |

## 图像处理接口

### 8. 背景移除

**接口路径**: `POST /aigc/matting`

**描述**: 移除指定图像的背景。

**认证要求**: 需要用户认证

**请求参数**:
```json
{
  "imageUrl": "https://example.com/image.jpg"    // 必需，图像URL
}
```

**URL验证规则**:
- 必须是有效的HTTP/HTTPS URL
- 不能指向私有IP地址
- 不能使用本地回环地址

**响应示例**:
```json
{
  "imageUrl": "https://processed.example.com/image_no_bg.png"
}
```

## 智能补全接口

### 9. 游戏素材名称自动补全

**接口路径**: `POST /game-assets/complete`

**描述**: 提供游戏素材名称的智能自动补全功能，支持前缀匹配。

**请求参数**:
```json
{
  "prefix": "cat",                               // 必需，搜索前缀
  "limit": 5                                     // 可选，返回结果数量，默认5
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "cat",
      "cat_sitting",
      "cat_walking",
      "cat_sleeping",
      "cathedral"
    ],
    "prefix": "cat",
    "total": 5
  }
}
```

**功能特性**:
- **高性能**: 支持基于Trie树的内存缓存（可通过环境变量 `ENABLE_ASSET_COMPLETION_TRIE=true` 启用）
- **数据库回退**: 当Trie缓存不可用时，自动使用数据库查询
- **大小写不敏感**: 自动处理大小写匹配
- **缓存管理**: 支持手动刷新缓存和统计信息查询

**实现细节**:
- 优先使用Trie树进行快速前缀匹配
- 回退到数据库 `LIKE` 查询确保可用性
- 结果按字母顺序排序
- 支持缓存统计和性能监控

## 提示词增强功能

系统提供了多层次的智能提示词增强功能，用于优化用户输入的提示词以获得更好的生成效果。

### 10. AI 提示词分析

**功能描述**: 使用AI自动分析用户提示词的类型、情感和复杂度。

**分析维度**:

#### 内容类型 (type)
| 类型 | 描述 | 示例 |
|------|------|------|
| `animal` | 动物相关 | 小猫、小狗、老虎 |
| `character` | 人物角色相关 | 公主、骑士、学生 |
| `scene` | 场景风景相关 | 森林、城市、海滩 |
| `building` | 建筑相关 | 房子、城堡、桥梁 |
| `food` | 食物相关 | 蛋糕、水果、饮料 |
| `vehicle` | 交通工具相关 | 汽车、飞机、自行车 |
| `nature` | 自然植物相关 | 花朵、树木、山脉 |
| `abstract` | 抽象艺术相关 | 几何图形、艺术装饰 |
| `object` | 其他物品相关 | 书籍、玩具、工具 |
| `default` | 无法明确分类 | 混合内容或特殊概念 |

#### 情感风格 (emotion)
| 风格 | 描述 | 应用场景 |
|------|------|----------|
| `cute` | 可爱风格 | 适合儿童游戏、宠物主题 |
| `serious` | 严肃正式风格 | 商务应用、教育内容 |
| `scary` | 恐怖风格 | 恐怖游戏、万圣节主题 |
| `happy` | 欢乐风格 | 派对、庆祝场景 |
| `mysterious` | 神秘风格 | 探险游戏、悬疑主题 |
| `cool` | 炫酷风格 | 科技、未来主题 |
| `elegant` | 优雅风格 | 高端设计、艺术作品 |
| `neutral` | 中性风格 | 通用场景、默认选项 |

#### 复杂度 (complexity)
| 级别 | 描述 | 处理方式 |
|------|------|----------|
| `simple` | 简单，基础要求 | 基础质量增强 |
| `medium` | 中等，有一定细节要求 | 中等质量增强，添加细节要求 |
| `complex` | 复杂，详细或多元素要求 | 高级质量增强，专业插画级别 |

### 11. 多层提示词优化

**功能描述**: 基于AI分析结果进行多层次的提示词优化。

**优化层次**:

#### 第一层：主题增强 (Theme Enhancement)
根据选定的主题添加相应的风格描述：
```
原始提示词: "一只小猫"
主题: cartoon
增强后: "一只小猫，采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩"
```

#### 第二层：质量增强 (Quality Enhancement)
根据复杂度添加质量要求：
- **简单**: "高质量矢量图，线条清晰，色彩丰富"
- **中等**: "高质量矢量图，细节丰富，专业设计"
- **复杂**: "高质量矢量图，精致细节，专业插画，复杂设计"

#### 第三层：样式增强 (Style Enhancement)
根据内容类型添加样式描述：
- **动物**: "造型可爱友好，角色设计吸引人"
- **场景**: "氛围感强，环境细节丰富"
- **建筑**: "建筑结构清晰，几何形态明确"

#### 第四层：技术要求 (Technical Requirements)
根据主题添加SVG生成的技术要求：
```
"SVG矢量格式，几何形状简单，元素分离清晰，适合游戏资源"
```

### 12. 项目上下文增强

**功能描述**: 基于项目上下文自动增强用户提示词。

**增强策略**:
1. **关键词提取**: 从项目中提取相关词汇
2. **智能筛选**: 选择最相关的5个关键词
3. **上下文融合**: 将关键词自然地融入提示词

**示例**:
```
用户提示词: "背景图片"
项目关键词: ["森林", "冒险", "魔法", "精灵", "城堡"]
增强结果: "背景图片, 相关元素: 森林, 冒险, 魔法, 精灵, 城堡"
```

### 13. 双路径搜索优化

**功能描述**: 针对有主题的搜索请求使用双路径策略。

**搜索路径**:

#### 语义搜索路径 (70%)
- 使用轻量级主题增强的提示词
- 保持原始语义含义
- 确保搜索相关性

#### 主题搜索路径 (30%)
- 使用完全优化的提示词
- 强调风格一致性
- 确保主题匹配

**结果融合**:
1. **去重处理**: 移除重复的图像结果
2. **重新评分**: 组合语义相似度(70%) + 主题相关度(30%)
3. **排序输出**: 按最终分数排序返回

## 数据结构说明

### GenerateSVGParams
```go
type GenerateSVGParams struct {
    Prompt         string          `json:"prompt"`           // 生成提示词
    NegativePrompt string          `json:"negative_prompt"`  // 负面提示词
    Style          string          `json:"style"`            // 样式
    Theme          ThemeType       `json:"theme"`            // 主题类型
    Provider       svggen.Provider `json:"provider"`         // 生成提供商
    Format         string          `json:"format"`           // 输出格式
    SkipTranslate  bool            `json:"skip_translate"`   // 跳过翻译
    Model          string          `json:"model"`            // 模型名称
    Size           string          `json:"size"`             // 图像尺寸
    Substyle       string          `json:"substyle"`         // 子样式
    NumImages      int             `json:"n"`                // 生成数量
}
```

### ImageRecommendParams
```go
type ImageRecommendParams struct {
    Text       string    `json:"prompt"`       // 搜索提示词
    TopK       int       `json:"top_k"`        // 返回结果数量
    Theme      ThemeType `json:"theme"`        // 主题类型
    SearchOnly bool      `json:"search_only"`  // 仅搜索模式
}
```

### InstantRecommendParams
```go
type InstantRecommendParams struct {
    ProjectID  int64     `json:"project_id"`   // 项目ID
    UserPrompt string    `json:"user_prompt"`  // 用户提示词
    TopK       int       `json:"top_k"`        // 返回结果数量
    Theme      ThemeType `json:"theme"`        // 主题类型
}
```

### ProjectContextParams
```go
type ProjectContextParams struct {
    ProjectID          int64  `json:"project_id"`           // 项目ID
    ProjectName        string `json:"project_name"`         // 项目名称
    ProjectDescription string `json:"project_description"`  // 项目描述
}
```

### RecommendedImageResult
```go
type RecommendedImageResult struct {
    ID         int64   `json:"id"`           // 图像ID
    ImagePath  string  `json:"image_path"`   // 图像路径
    Similarity float64 `json:"similarity"`   // 相似度分数
    Rank       int     `json:"rank"`         // 排名
    Source     string  `json:"source"`       // 来源："search"或"generated"
}
```

## 算法服务集成

### 向量服务
- **添加向量**: `POST /v1/resource/add`
- **语义搜索**: `POST /v1/resource/search`
- **健康检查**: `GET /health`

### 搜索策略
1. **双路径搜索** (有主题时):
   - 语义搜索路径 (70%): 保持语义相关性
   - 主题搜索路径 (30%): 确保风格一致性

2. **单一语义搜索** (无主题时):
   - 使用原始提示词进行语义搜索

### 提示词优化
系统会自动进行多层提示词优化：
1. **AI分析**: 分析提示词类型、情感、复杂度
2. **主题增强**: 应用选定主题的风格提示
3. **质量增强**: 根据复杂度添加质量要求
4. **样式增强**: 根据内容类型添加样式提示
5. **技术要求**: 添加SVG格式相关的技术要求

## 错误码说明

### 通用错误码
- `400`: 请求参数错误
- `401`: 未认证（仅限需要认证的接口）
- `500`: 服务器内部错误

### 业务错误码
- `errorInvalidArgs`: 参数验证失败
  - 提示词长度不足（少于3个字符）
  - top_k 超出范围（1-50）
  - 无效的主题类型
  - 无效的生成提供商

### 常见错误消息
- `"text is required"`: 缺少必需的文本参数
- `"top_k must be between 1 and 50"`: top_k 参数超出范围
- `"invalid theme type"`: 无效的主题类型
- `"provider must be one of: svgio, recraft, openai"`: 无效的生成提供商
- `"prompt must be at least 3 characters"`: 提示词长度不足
- `"chosen_pic {id} is not in the recommended pictures list"`: 选择的图片不在推荐列表中
- `"feedback already submitted for query_id: {id}"`: 反馈已提交
- `"prefix parameter is required"`: 缺少前缀参数（自动补全接口）
- `"invalid imageUrl"`: 无效的图像URL（背景移除接口）
- `"invalid imageUrl: private IP"`: 图像URL指向私有IP地址
- `"project_id is required and must be positive"`: 项目ID必需且为正整数
- `"project_name is required"`: 项目名称必需
- `"user_prompt is required"`: 用户提示词必需

## 性能优化

### 缓存机制
- **提示词分析缓存**: 避免重复AI分析调用
- **推荐结果缓存**: 支持反馈功能的结果追踪
- **向量服务**: 图像语义搜索的向量存储
- **自动补全缓存**:
  - Trie树内存缓存（可选）
  - 支持缓存刷新和统计
  - 数据库查询回退机制

### 并发处理
- **并发生成**: 多图像并发生成
- **双路径并发搜索**: 语义和主题搜索并行执行
- **异步存储**: Kodo存储和数据库操作异步进行

### 存储集成
- **Kodo云存储**: 自动上传生成的SVG文件
- **数据库**: 存储AI资源元数据
- **向量数据库**: 支持语义搜索功能

---

本文档涵盖了XBuilder系统中所有AI图像生成相关的接口功能。如需了解更多技术细节，请参考相关源代码文件。