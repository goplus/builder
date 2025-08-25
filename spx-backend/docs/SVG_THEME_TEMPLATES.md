# SVG主题提示词模板功能文档

## 概述

SVG主题提示词模板功能为SVG生成服务提供了智能的主题化增强能力。通过预定义的主题模板，系统能够自动将主题相关的提示词与用户输入进行智能拼接，显著提升生成的SVG图像质量和一致性。

## 功能特性

1. **智能提示词增强**: 根据不同教育场景和用途提供专门优化的提示词模板
2. **多语言支持**: 同时支持中英文提示词，自动根据语言偏好选择
3. **可配置强度**: 支持0-1范围的主题影响强度控制
4. **灵活定制**: 支持自定义前缀、后缀和风格修饰词
5. **热更新**: 支持运行时重载主题配置
6. **向下兼容**: 完全兼容现有API，不影响未启用主题的请求

## 架构设计

### 包结构
```
internal/svggen/theme/
├── types.go           # 主题相关类型定义
├── templates.go       # 内置模板定义
├── config.go          # 配置加载和环境变量处理
├── manager.go         # 主题管理器核心逻辑
└── manager_test.go    # 单元测试
```

### 核心组件

#### ThemeManager
- 负责加载和管理主题模板
- 提供主题查询和提示词拼接功能
- 支持模板缓存和运行时重载
- 线程安全的并发访问

#### ThemeTemplate
- 定义主题的结构化信息
- 包含多语言提示词、风格修饰词、质量增强词
- 支持提供商特定的配置覆盖

### 集成方式

主题功能通过中间件方式集成到现有的`svggen.ServiceManager`中，在生成请求处理流程中自动进行主题增强：

```
用户请求 -> 主题处理 -> 翻译处理 -> 提供商生成 -> 响应
```

## 数据结构

### 主题类型定义

```go
type ThemeType string

const (
    ThemeEducationMath     ThemeType = "education_math"
    ThemeEducationScience  ThemeType = "education_science"
    ThemeEducationArt      ThemeType = "education_art"
    ThemeGameCartoon       ThemeType = "game_cartoon"
    ThemeGamePixel         ThemeType = "game_pixel"
    ThemeUIIcon            ThemeType = "ui_icon"
    ThemeUIIllustration    ThemeType = "ui_illustration"
    ThemeGeneral           ThemeType = "general"
)
```

### 主题模板结构

```go
type ThemeTemplate struct {
    Type              ThemeType `json:"type"`
    Name              string    `json:"name"`
    NameCN            string    `json:"name_cn"`
    Description       string    `json:"description"`
    DescriptionCN     string    `json:"description_cn"`
    
    // 提示词模板
    PrefixPrompt      string    `json:"prefix_prompt"`
    PrefixPromptCN    string    `json:"prefix_prompt_cn"`
    SuffixPrompt      string    `json:"suffix_prompt"`
    SuffixPromptCN    string    `json:"suffix_prompt_cn"`
    
    // 默认参数
    DefaultStyle      string    `json:"default_style"`
    DefaultNegative   string    `json:"default_negative"`
    DefaultNegativeCN string    `json:"default_negative_cn"`
    
    // 高级配置
    StyleModifiers    []string  `json:"style_modifiers"`
    QualityEnhancers  []string  `json:"quality_enhancers"`
    
    // 提供商特定配置
    ProviderOverrides map[string]ProviderConfig `json:"provider_overrides"`
}
```

### API参数扩展

现有的`GenerateRequest`和控制器参数已扩展支持主题字段：

```go
type GenerateRequest struct {
    // 现有字段...
    Prompt         string   `json:"prompt"`
    NegativePrompt string   `json:"negative_prompt,omitempty"`
    Style          string   `json:"style,omitempty"`
    Provider       Provider `json:"provider,omitempty"`
    
    // 新增主题字段
    Theme          string  `json:"theme,omitempty"`
    EnableTheme    bool    `json:"enable_theme,omitempty"`
    ThemeStrength  float64 `json:"theme_strength,omitempty"`
    CustomPrefix   string  `json:"custom_prefix,omitempty"`
    CustomSuffix   string  `json:"custom_suffix,omitempty"`
    Language       string  `json:"language,omitempty"`
}
```

## 核心算法

### 提示词增强流程

```go
func (tm *ThemeManager) BuildEnhancedPrompt(req *ProcessRequest, template *ThemeTemplate) string {
    var parts []string
    
    // 1. 自定义前缀或主题前缀
    if req.CustomPrefix != "" {
        parts = append(parts, req.CustomPrefix)
    } else if template.PrefixPrompt != "" {
        prefix := tm.selectPromptByLanguage(template.PrefixPrompt, template.PrefixPromptCN, req.Language)
        if prefix != "" {
            parts = append(parts, prefix)
        }
    }
    
    // 2. 用户原始提示词
    if req.Prompt != "" {
        parts = append(parts, req.Prompt)
    }
    
    // 3. 主题风格修饰（根据强度选择）
    if req.ThemeStrength > 0.5 && len(template.StyleModifiers) > 0 {
        modifiers := tm.selectModifiers(template.StyleModifiers, req.ThemeStrength)
        parts = append(parts, modifiers...)
    }
    
    // 4. 自定义后缀或主题后缀
    if req.CustomSuffix != "" {
        parts = append(parts, req.CustomSuffix)
    } else if template.SuffixPrompt != "" {
        suffix := tm.selectPromptByLanguage(template.SuffixPrompt, template.SuffixPromptCN, req.Language)
        if suffix != "" {
            parts = append(parts, suffix)
        }
    }
    
    // 5. 质量增强词（总是添加）
    if len(template.QualityEnhancers) > 0 {
        parts = append(parts, template.QualityEnhancers...)
    }
    
    return strings.Join(tm.filterEmptyStrings(parts), ", ")
}
```

### 主题强度影响

- **0.0 - 0.5**: 不应用风格修饰词，仅使用前缀、后缀和质量增强词
- **0.5 - 1.0**: 根据强度比例选择风格修饰词数量

```go
func (tm *ThemeManager) selectModifiers(modifiers []string, strength float64) []string {
    count := int(float64(len(modifiers)) * strength)
    if count == 0 {
        count = 1
    }
    if count > len(modifiers) {
        count = len(modifiers)
    }
    return modifiers[:count]
}
```

## 内置主题详情

### 1. 教育数学主题 (education_math)
- **用途**: 数学教育插图
- **前缀**: "Educational mathematics illustration" / "教育数学插图"
- **后缀**: "clean vector design, educational style, suitable for children" / "简洁矢量设计，教育风格，适合儿童"
- **风格修饰**: geometric, colorful, friendly, simple
- **质量增强**: high quality, clean lines, professional

### 2. 游戏卡通主题 (game_cartoon)
- **用途**: 游戏角色和卡通插图
- **前缀**: "Cute cartoon game character" / "可爱卡通游戏角色"
- **后缀**: "vibrant colors, friendly appearance, game-ready design" / "鲜艳色彩，友好外观，游戏就绪设计"
- **风格修饰**: playful, colorful, expressive, rounded
- **质量增强**: detailed, polished, game art style

### 3. UI图标主题 (ui_icon)
- **用途**: 用户界面图标
- **前缀**: "Minimal UI icon" / "简约UI图标"
- **后缀**: "flat design, consistent style, scalable vector" / "扁平设计，一致风格，可缩放矢量"
- **风格修饰**: minimal, modern, clean, geometric
- **质量增强**: pixel perfect, scalable, optimized

## API端点

### 主题查询端点

#### 获取所有主题
```
GET /image/themes
```

响应格式：
```json
{
  "themes": [
    {
      "type": "education_math",
      "name": "Education Math",
      "name_cn": "教育数学",
      "description": "Mathematical illustrations optimized for educational content",
      "description_cn": "专为教育内容优化的数学插图",
      "default_style": "educational_illustration",
      "style_modifiers": ["geometric", "colorful", "friendly", "simple"],
      "quality_enhancers": ["high quality", "clean lines", "professional"]
    }
  ],
  "count": 8
}
```

#### 获取特定主题
```
GET /image/themes/{theme_type}
```

### SVG生成端点（已扩展）

```
POST /image/svg
```

支持的主题参数：
```json
{
  "prompt": "一只小猫",
  "theme": "game_cartoon",
  "enable_theme": true,
  "theme_strength": 0.8,
  "custom_prefix": "可爱的",
  "custom_suffix": "适合儿童",
  "language": "zh",
  "provider": "svgio"
}
```

## 配置管理

### 环境变量

```bash
# 主题功能开关
SVG_THEMES_ENABLED=true

# 主题配置文件路径（可选）
SVG_THEMES_CONFIG_PATH=./config/theme_templates.yaml

# 默认主题
SVG_DEFAULT_THEME=general

# 主题缓存时间（秒）
SVG_THEMES_CACHE_TTL=3600
```

### 配置文件支持

支持YAML格式的自定义主题配置文件：

```yaml
themes:
  custom_education:
    name: "Custom Education"
    name_cn: "自定义教育"
    enabled: true
    prefix_prompt: "Educational custom illustration"
    prefix_prompt_cn: "教育自定义插图"
    suffix_prompt: "child-friendly, educational, clear"
    suffix_prompt_cn: "儿童友好，教育性，清晰"
    default_style: "educational_custom"
    style_modifiers: ["educational", "child-friendly", "colorful"]
    quality_enhancers: ["high quality", "professional"]
```

## 使用示例

### 基础主题使用

```bash
curl -X POST http://localhost:8080/image/svg \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只小猫学数学",
    "theme": "education_math",
    "enable_theme": true,
    "provider": "svgio"
  }'
```

### 高级配置

```bash
curl -X POST http://localhost:8080/image/svg \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "molecular structure",
    "theme": "education_science",
    "enable_theme": true,
    "theme_strength": 0.7,
    "custom_suffix": "suitable for university textbook",
    "language": "en",
    "provider": "recraft"
  }'
```

## 提示词变换示例

### 输入
```
原始提示词: "a cute cat"
主题: game_cartoon
强度: 0.8
语言: en
```

### 处理流程
1. **前缀**: "Cute cartoon game character"
2. **用户输入**: "a cute cat"  
3. **风格修饰**: "playful, colorful, expressive, rounded" (4个中的4个，因为强度0.8)
4. **后缀**: "vibrant colors, friendly appearance, game-ready design"
5. **质量增强**: "detailed, polished, game art style"

### 最终结果
```
"Cute cartoon game character, a cute cat, playful, colorful, expressive, rounded, vibrant colors, friendly appearance, game-ready design, detailed, polished, game art style"
```

## 性能特性

### 缓存策略
- **内存缓存**: 所有主题模板在启动时加载到内存
- **线程安全**: 使用读写锁保证并发安全
- **热更新**: 支持运行时重载而无需重启服务

### 性能优化
- **快速路径**: 未启用主题时零开销
- **字符串优化**: 避免不必要的字符串分配和复制
- **去重处理**: 自动过滤空字符串和重复内容

### 错误处理
- **优雅降级**: 主题处理失败时自动回退到原始提示词
- **详细日志**: 记录主题处理过程和错误信息
- **不中断生成**: 主题错误不影响SVG生成的继续执行

## 监控和日志

### 关键日志
```go
logger.Printf("Theme processing - theme: %s, original_prompt: %q, enhanced_prompt: %q", 
    req.Theme, originalPrompt, enhancedPrompt)
```

### 统计信息
- 主题使用频率统计
- 不同主题的成功率跟踪
- 提示词长度分布分析
- 生成时间对比数据

## 扩展性

### 自定义主题注册
```go
customTheme := &ThemeTemplate{
    Type: ThemeType("custom_theme"),
    Name: "Custom Theme",
    PrefixPrompt: "Custom prefix",
}
manager.RegisterCustomTheme(customTheme)
```

### 未来扩展方向
- **A/B测试**: 主题变体对比测试
- **用户偏好**: 个性化主题推荐
- **智能学习**: 基于用户反馈的主题优化
- **更多主题**: 持续扩展内置主题库

## 测试策略

### 单元测试覆盖
- 主题模板加载和管理
- 提示词拼接逻辑验证
- 多语言选择机制
- 参数验证和错误处理
- 并发安全性测试

### 集成测试
- 端到端API功能测试
- 多提供商兼容性验证
- 性能基准测试
- 内存使用和泄漏检测

## 部署指南

### 渐进式启用
1. **第一阶段**: 部署代码，主题功能默认关闭
2. **第二阶段**: 开启主题功能，监控系统表现
3. **第三阶段**: 扩展主题库，收集用户反馈
4. **第四阶段**: 优化算法，增强用户体验

### 兼容性保证
- 现有API完全向下兼容
- 新增字段均为可选参数
- 提供完整的降级机制
- 支持平滑的功能开关

这套主题系统为SVG生成服务提供了强大而灵活的主题化能力，在提升生成质量的同时保持了良好的用户体验和系统稳定性。